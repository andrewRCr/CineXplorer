import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { render, screen, within, waitFor } from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import {
  createMockMovieListItem,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { server } from "@tests/mocks/server";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { EntryDialogHost } from "@/components/movie/entry/EntryDialogHost";
import MovieCard from "../MovieCard";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { GridSkeletonLoader } from "@/components/movie/collection/shared/GridSkeletonLoader";
import { gate } from "@tests/helpers/web-locks";

function AuthStatus() {
  return <output aria-label="Session">{useAuthContext()?.status}</output>;
}
function Harness({ children }: { children: ReactNode }) {
  return (
    <AuthContextProvider>
      <EntryDialogHost>
        <AuthStatus />
        {children}
      </EntryDialogHost>
    </AuthContextProvider>
  );
}
function hoverDevice(hover = true) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query === "(hover: hover)" && hover,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  hoverDevice();
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () =>
      HttpResponse.json({
        record: createMockUserMovieData({ tmdb_id: 550 }),
        entries: [],
      }),
    ),
  );
});

it("places named pointer controls between the poster and title, outside the link", async () => {
  render(
    <Harness>
      <MovieCard
        movie={createMockMovieListItem({ tmdb_id: 550, user_movie_data: null })}
      />
    </Harness>,
  );
  const group = await screen.findByRole("group", {
    name: "Your actions for Test Movie",
  });
  const controls = within(group).getAllByRole("button");
  expect(controls.map((button) => button.getAttribute("aria-label"))).toEqual([
    "Watched",
    "Like",
    "Watchlist",
    "Review or log",
  ]);
  for (const button of controls.slice(0, 3))
    expect(button).toHaveAttribute("aria-pressed", "false");
  const links = screen.getAllByRole("link", { name: "Test Movie" });
  expect(links[0]).toBeDefined();
  expect(links[1]).toBeDefined();
  if (!links[0] || !links[1]) throw new Error("Both film links must exist");
  expect(
    links[0].compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    group.compareDocumentPosition(links[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(within(links[0]).queryByRole("group")).not.toBeInTheDocument();
});

it.each([
  ["Watched", "user_watched"],
  ["Like", "user_liked"],
  ["Watchlist", "user_on_watchlist"],
] as const)("%s saves the opposite shown value", async (name, field) => {
  const requests: unknown[] = [];
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/550`, async ({ request }) => {
      const changes = await request.json();
      requests.push(changes);
      return HttpResponse.json(
        createMockUserMovieData({ tmdb_id: 550, [field]: true }),
      );
    }),
  );
  render(
    <Harness>
      <MovieCard
        movie={createMockMovieListItem({ tmdb_id: 550, user_movie_data: null })}
      />
    </Harness>,
  );
  await userEvent.setup().click(await screen.findByRole("button", { name }));
  await waitFor(() => expect(requests).toEqual([{ [field]: true }]));
  expect(screen.getByRole("button", { name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("opens a fixed film with the date on from a card", async () => {
  render(
    <Harness>
      <MovieCard movie={createMockMovieListItem({ tmdb_id: 550 })} />
    </Harness>,
  );
  await userEvent
    .setup()
    .click(await screen.findByRole("button", { name: "Review or log" }));
  const dialog = await screen.findByRole("dialog", { name: "Review or log" });
  expect(within(dialog).getByText("Test Movie")).toBeVisible();
  expect(
    within(dialog).queryByRole("button", { name: "Change" }),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).getByRole("switch", { name: "Watched on" }),
  ).toBeChecked();
});

it.each([{ user_rating: 7 }, { has_entries: true }])(
  "keeps Watched focusable and explains the lock for %j",
  async (lock) => {
    let writes = 0;
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/550`, () => {
        writes++;
        return HttpResponse.json(createMockUserMovieData());
      }),
    );
    render(
      <Harness>
        <MovieCard
          movie={createMockMovieListItem({
            tmdb_id: 550,
            user_movie_data: createMockUserMovieData({
              tmdb_id: 550,
              user_watched: true,
              ...lock,
            }),
          })}
        />
      </Harness>,
    );
    const watched = await screen.findByRole("button", {
      name: "Watched",
    });
    expect(watched).toHaveAttribute("aria-disabled", "true");
    expect(watched).toBeEnabled();
    expect(watched).toHaveAccessibleDescription(
      "Watched stays on while this film has your rating or any entries.",
    );
    await userEvent.setup().click(watched);
    expect(writes).toBe(0);
  },
);

it.each([
  ["Watched", "user_watched"],
  ["Like", "user_liked"],
  ["Watchlist", "user_on_watchlist"],
] as const)(
  "shows only the touch menu, whose %s saves and closes it",
  async (name, field) => {
    hoverDevice(false);
    const requests: unknown[] = [];
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/550`, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(
          createMockUserMovieData({
            tmdb_id: 550,
            [field]: true,
            user_watched: field !== "user_on_watchlist",
          }),
        );
      }),
    );
    render(
      <Harness>
        <MovieCard
          movie={createMockMovieListItem({
            tmdb_id: 550,
            user_movie_data: null,
          })}
        />
      </Harness>,
    );
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Actions for Test Movie" }),
    );
    expect(
      screen.queryByRole("group", { name: "Your actions for Test Movie" }),
    ).not.toBeInTheDocument();
    const menu = await screen.findByRole("menu");
    expect(
      within(menu)
        .getAllByRole("menuitemcheckbox")
        .map((item) => item.textContent),
    ).toEqual(["Watched", "Like", "Watchlist"]);
    await user.click(within(menu).getByRole("menuitemcheckbox", { name }));
    await waitFor(() => expect(requests).toEqual([{ [field]: true }]));
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Actions for Test Movie" }),
    );
    expect(await screen.findByRole("menuitemcheckbox", { name })).toBeChecked();
  },
);

it("reaches locked Watched by arrow key and keeps its menu open when chosen", async () => {
  hoverDevice(false);
  let writes = 0;
  server.use(
    http.patch(`${apiBaseUrl}/user-movie-data/550`, () => {
      writes++;
      return HttpResponse.json(createMockUserMovieData());
    }),
  );
  render(
    <Harness>
      <MovieCard
        movie={createMockMovieListItem({
          tmdb_id: 550,
          user_movie_data: createMockUserMovieData({
            user_watched: true,
            has_entries: true,
          }),
        })}
      />
    </Harness>,
  );
  const user = userEvent.setup();
  const trigger = await screen.findByRole("button", {
    name: "Actions for Test Movie",
  });
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  const menu = await screen.findByRole("menu");
  const watched = within(menu).getByRole("menuitemcheckbox", {
    name: /^Watched/,
  });
  expect(watched).toHaveAttribute("aria-disabled", "true");
  await waitFor(() => expect(watched).toHaveAttribute("data-highlighted"));
  expect(
    within(watched).getByText(
      "Watched stays on while this film has your rating or any entries.",
    ),
  ).toBeVisible();
  await user.keyboard("{Enter}");
  expect(menu).toBeVisible();
  expect(writes).toBe(0);
});

it("returns focus to the surviving touch trigger after logging", async () => {
  hoverDevice(false);
  render(
    <Harness>
      <MovieCard movie={createMockMovieListItem({ tmdb_id: 550 })} />
    </Harness>,
  );
  const user = userEvent.setup();
  const trigger = await screen.findByRole("button", {
    name: "Actions for Test Movie",
  });
  await user.click(trigger);
  await user.click(
    await screen.findByRole("menuitem", { name: "Review or log" }),
  );
  const dialog = await screen.findByRole("dialog", { name: "Review or log" });
  expect(within(dialog).getByText("Test Movie")).toBeVisible();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(trigger).toHaveFocus());
});

it.each([
  "user_watched",
  "user_liked",
  "user_on_watchlist",
  "user_rating",
  "has_entries",
] as const)(
  "updates the shown controls when %s changes in a refreshed card",
  async (field) => {
    const record = createMockUserMovieData({
      user_watched: false,
      user_liked: false,
      user_on_watchlist: false,
      user_rating: null,
      has_entries: false,
    });
    const movie = createMockMovieListItem({
      tmdb_id: 550,
      user_movie_data: record,
    });
    const view = render(
      <Harness>
        <MovieCard movie={movie} />
      </Harness>,
    );
    await screen.findByRole("button", { name: "Watched" });
    const changed = field === "user_rating" ? 7 : true;
    view.rerender(
      <Harness>
        <MovieCard
          movie={{ ...movie, user_movie_data: { ...record, [field]: changed } }}
        />
      </Harness>,
    );
    const name =
      field === "user_liked"
        ? "Like"
        : field === "user_on_watchlist"
          ? "Watchlist"
          : "Watched";
    expect(screen.getByRole("button", { name })).toHaveAttribute(
      field === "user_rating" || field === "has_entries"
        ? "aria-disabled"
        : "aria-pressed",
      "true",
    );
  },
);

it("withholds controls from signed-in placeholder cards", async () => {
  render(
    <Harness>
      <GridSkeletonLoader count={1} />
    </Harness>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Session")).toHaveTextContent("authenticated"),
  );
  expect(screen.queryByRole("group", { hidden: true })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { hidden: true }),
  ).not.toBeInTheDocument();
});

it.each(["anonymous", "resolving"])(
  "withholds card controls while %s",
  async (status) => {
    clearBrowserAuth();
    const held = gate();
    if (status === "resolving") {
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({}, { status: 401 });
        }),
      );
    }
    const view = render(
      <Harness>
        <MovieCard movie={createMockMovieListItem()} />
      </Harness>,
    );
    try {
      await waitFor(() =>
        expect(screen.getByLabelText("Session")).toHaveTextContent(status),
      );
      expect(
        screen.queryByRole("group", { name: /Your actions/, hidden: true }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Actions for/, hidden: true }),
      ).not.toBeInTheDocument();
    } finally {
      held.release();
      view.unmount();
    }
  },
);

it("leaves Watched unlocked when the film is only liked", async () => {
  render(
    <Harness>
      <MovieCard
        movie={createMockMovieListItem({
          user_movie_data: createMockUserMovieData({
            user_liked: true,
            user_watched: true,
            user_rating: null,
            has_entries: false,
          }),
        })}
      />
    </Harness>,
  );
  expect(
    await screen.findByRole("button", { name: "Watched" }),
  ).not.toHaveAttribute("aria-disabled");
});
