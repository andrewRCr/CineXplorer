import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useQueryClient } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  within,
  waitFor,
} from "@tests/helpers/test-renderer";
import {
  authHandlers,
  clearBrowserAuth,
  token,
  profile,
} from "@tests/helpers/auth";
import {
  createMockMovieDetail,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import { gate } from "@tests/helpers/web-locks";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { isRecord } from "@/utilities/typeGuards";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { Toaster, toaster } from "@/components/core/chakra/toaster";
import { beginUserChange } from "@/lib/session";
import { FilmPanel } from "../FilmPanel";

let record = createMockUserMovieData({
  tmdb_id: 550,
  user_rating: 7,
  user_watched: true,
});
let requests: unknown[] = [];
function device(wide = true) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: wide && query.includes("min-width"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
function Session() {
  const auth = useAuthContext();
  return (
    <>
      <output aria-label="Session">{auth?.status}</output>
      <output aria-label="Visitor">{auth?.user?.username}</output>
    </>
  );
}
function ChangeUser() {
  const client = useQueryClient();
  return (
    <button onPointerDown={() => beginUserChange(client)}>Change user</button>
  );
}
function Harness({ children }: { children: ReactNode }) {
  return (
    <AuthContextProvider>
      <Session />
      {children}
      <button>After rating</button>
      <ChangeUser />
      <Toaster />
    </AuthContextProvider>
  );
}
async function show(rating: number | null = 7) {
  record = { ...record, user_rating: rating, user_watched: rating !== null };
  const view = render(
    <Harness>
      <FilmPanel
        movie={createMockMovieDetail({ tmdb_id: 550, user_movie_data: record })}
      />
    </Harness>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Visitor")).toHaveTextContent(
      profile.username,
    ),
  );
  return view;
}
const group = () => screen.getByRole("radiogroup", { name: "Your rating" });
function timedUser() {
  // Testing Library detects fake clocks through the Jest timer API.
  vi.stubGlobal("jest", vi);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
}
async function arrows(user: ReturnType<typeof userEvent.setup>, keys: string) {
  const selected = within(group()).getByRole("radio", { checked: true });
  act(() => selected.focus());
  expect(selected).toHaveFocus();
  if (vi.isFakeTimers()) await advance(0);
  await user.keyboard(keys);
}
async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTimeAsync(ms));
}
async function saved(value: number | null) {
  await waitFor(() =>
    expect(requests).toEqual([
      {
        user_rating: value,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ]),
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  device();
  record = createMockUserMovieData({
    tmdb_id: 550,
    user_rating: 7,
    user_watched: true,
  });
  requests = [];
  act(() => toaster.remove());
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/:id`, async ({ request }) => {
      const body: unknown = await request.json();
      requests.push(body);
      if (
        !isRecord(body) ||
        !(body.user_rating === null || typeof body.user_rating === "number")
      )
        return HttpResponse.json({ detail: "Invalid rating" }, { status: 422 });
      record = {
        ...record,
        user_rating: body.user_rating,
        user_watched: record.user_watched || body.user_rating !== null,
      };
      return HttpResponse.json(record);
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  act(() => toaster.remove());
});

it("saves a pointer selection once at once, with two points per star", async () => {
  await show(null);
  expect(
    screen.queryByRole("button", { name: "Clear rating" }),
  ).not.toBeInTheDocument();
  await userEvent
    .setup()
    .click(within(group()).getByRole("radio", { name: "4 stars" }));
  await waitFor(() =>
    expect(requests).toEqual([
      {
        user_rating: 8,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ]),
  );
  expect(
    within(group()).getByRole("radio", { checked: true }),
  ).toHaveAccessibleName("4 stars");
  expect(screen.getByRole("button", { name: "Clear rating" })).toBeVisible();
});

it("saves arrow changes once after 500ms still", async () => {
  await show();
  const user = timedUser();
  await arrows(user, "{ArrowRight}{ArrowRight}");
  expect(
    within(group()).getByRole("radio", { checked: true }),
  ).toHaveAccessibleName("4.5 stars");
  await advance(499);
  expect(requests).toEqual([]);
  await advance(1);
  await saved(9);
});

it("flushes once on leaving the stars, without flushing between radio items", async () => {
  await show();
  const user = timedUser();
  await arrows(user, "{ArrowRight}{ArrowRight}");
  await advance(30);
  expect(requests).toEqual([]);
  await user.click(screen.getByRole("button", { name: "After rating" }));
  await advance(600);
  await saved(9);
});

it.each(["zero", "Clear"])(
  "%s clears the rating and offers its feedback",
  async (how) => {
    await show();
    const user = timedUser();
    if (how === "zero") {
      await arrows(user, "{ArrowLeft>7/}");
      await advance(500);
    } else
      await user.click(screen.getByRole("button", { name: "Clear rating" }));
    await saved(null);
    await waitFor(() =>
      expect(screen.getByText("Rating cleared")).toBeVisible(),
    );
    expect(
      screen.queryByRole("button", { name: "Clear rating" }),
    ).not.toBeInTheDocument();
  },
);

it.each(["4 stars", "5 stars"])(
  "pointer activation of %s consumes the keyboard preview once",
  async (name) => {
    await show();
    const user = timedUser();
    await arrows(user, "{ArrowRight}");
    expect(requests).toEqual([]);
    await user.click(within(group()).getByRole("radio", { name }));
    await advance(600);
    await saved(name === "4 stars" ? 8 : 10);
  },
);

it("Clear replaces a pending keyboard value with only a null save", async () => {
  await show();
  const user = timedUser();
  await arrows(user, "{ArrowRight}");
  await user.click(screen.getByRole("button", { name: "Clear rating" }));
  await advance(600);
  await saved(null);
});

it.each([null, 7])(
  "phones show %s and rate in one bottom sheet",
  async (rating) => {
    device(false);
    await show(rating);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    if (rating === null) expect(screen.getByText("Not rated")).toBeVisible();
    else
      expect(
        screen.getByRole("img", { name: "Rated 3.5 out of 5 stars" }),
      ).toBeVisible();
    const user = userEvent.setup();
    const rate = screen.getByRole("button", { name: "Rate" });
    await user.click(rate);
    const sheet = await screen.findByRole("dialog", { name: "Your rating" });
    expect(within(sheet).getAllByRole("radiogroup")).toHaveLength(1);
    const star = within(sheet).getByRole("radio", { name: "5 stars" });
    expect(parseFloat(getComputedStyle(star).width)).toBeGreaterThanOrEqual(48);
    await user.click(star);
    await saved(10);
    await user.click(within(sheet).getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(rate).toHaveFocus());
    expect(requests).toEqual([
      {
        user_rating: 10,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    ]);
  },
);

it.each(["anonymous", "resolving"])(
  "rating stays empty and inert while %s",
  async (status) => {
    clearBrowserAuth();
    const held = gate();
    if (status === "resolving")
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
      );
    const view = render(
      <Harness>
        <FilmPanel
          movie={createMockMovieDetail({
            tmdb_id: 550,
            user_movie_data: record,
          })}
        />
      </Harness>,
    );
    try {
      await waitFor(() =>
        expect(screen.getByLabelText("Session")).toHaveTextContent(status),
      );
      expect(
        within(group()).queryByRole("radio", { checked: true }),
      ).not.toBeInTheDocument();
      const star = within(group()).getByRole("radio", { name: "4 stars" });
      expect(star).toHaveAttribute("aria-disabled", "true");
      const user = userEvent.setup();
      await user.click(star);
      act(() => star.focus());
      await user.keyboard("{ArrowRight}");
      expect(
        within(group()).queryByRole("radio", { checked: true }),
      ).not.toBeInTheDocument();
      expect(requests).toEqual([]);
      if (status === "anonymous")
        expect(
          within(screen.getByRole("region", { name: "Your film" })).getByRole(
            "status",
          ),
        ).toHaveTextContent(
          "Sign in to mark films watched, rate and log them, and keep a watchlist.",
        );
      else
        expect(
          within(screen.getByRole("region", { name: "Your film" })).queryByRole(
            "status",
          ),
        ).not.toBeInTheDocument();
    } finally {
      held.release();
      view.unmount();
    }
  },
);

it.each(["unmount", "film", "user"])(
  "discards an unsaved keyboard preview on %s change",
  async (change) => {
    const view = await show();
    const user = timedUser();
    await arrows(user, "{ArrowRight}");
    if (change === "unmount") view.unmount();
    else if (change === "film")
      view.rerender(
        <Harness>
          <FilmPanel
            movie={createMockMovieDetail({
              tmdb_id: 551,
              user_movie_data: null,
            })}
          />
        </Harness>,
      );
    else await user.click(screen.getByRole("button", { name: "Change user" }));
    await advance(600);
    expect(requests).toEqual([]);
  },
);

it("a refused rating restores the confirmed stars and shows the save error", async () => {
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/550`, async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json({ detail: "Unavailable" }, { status: 400 });
    }),
  );
  await show();
  await userEvent
    .setup()
    .click(within(group()).getByRole("radio", { name: "5 stars" }));
  await waitFor(() =>
    expect(screen.getByText("Failed to save changes")).toBeVisible(),
  );
  expect(
    within(group()).getByRole("radio", { checked: true }),
  ).toHaveAccessibleName("3.5 stars");
  expect(requests).toEqual([
    {
      user_rating: 10,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  ]);
});

it("Done closes an unchanged phone rating without a save; Clear saves null", async () => {
  device(false);
  await show();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Rate" }));
  await user.click(await screen.findByRole("button", { name: "Done" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(requests).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Rate" }));
  await user.click(await screen.findByRole("button", { name: "Clear rating" }));
  await saved(null);
  await waitFor(() => expect(screen.getByText("Rating cleared")).toBeVisible());
  await user.click(screen.getByRole("button", { name: "Done" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Not rated")).toBeVisible();
});
