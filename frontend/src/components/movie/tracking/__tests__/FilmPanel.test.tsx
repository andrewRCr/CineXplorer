import type { ReactNode } from "react";
import { beforeEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { renderWithRoute } from "@tests/helpers/test-renderer-with-routes";
import { screen, within, waitFor } from "@tests/helpers/test-renderer";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import {
  createMockMovieDetail,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { EntryDialogHost } from "@/components/movie/entry/EntryDialogHost";
import { gate } from "@tests/helpers/web-locks";
import { FilmPanel } from "../FilmPanel";

const film = createMockMovieDetail({
  tmdb_id: 550,
  title: "The film",
  user_movie_data: null,
});
function Session() {
  return <output aria-label="Session">{useAuthContext()?.status}</output>;
}
function show(children: ReactNode) {
  return renderWithRoute(
    "/movie/:id",
    <AuthContextProvider>
      <EntryDialogHost>
        <Session />
        {children}
      </EntryDialogHost>
    </AuthContextProvider>,
    { initialRoute: "/movie/550?from=watchlist" },
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  setAuthTokens(token());
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/550/entries`, () =>
      HttpResponse.json({
        record: createMockUserMovieData({ tmdb_id: 550 }),
        entries: [],
      }),
    ),
  );
});

it.each([
  ["Watched", "user_watched", false],
  ["Like", "user_liked", false],
  ["Watchlist", "user_on_watchlist", false],
  ["Watched", "user_watched", true],
  ["Like", "user_liked", true],
  ["Watchlist", "user_on_watchlist", true],
] as const)(
  "saves the opposite %s state from Your film (%s initially %s)",
  async (name, field, initial) => {
    const requests: unknown[] = [];
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/550`, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(
          createMockUserMovieData({
            tmdb_id: 550,
            [field]: !initial,
            user_watched:
              field === "user_liked" || (field === "user_watched" && !initial),
          }),
        );
      }),
    );
    show(
      <FilmPanel
        movie={{
          ...film,
          user_movie_data: createMockUserMovieData({
            tmdb_id: 550,
            [field]: initial,
            user_watched: field !== "user_on_watchlist" && initial,
          }),
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Your film" })).toBeVisible();
    const user = userEvent.setup();
    const control = screen.getByRole("button", { name });
    expect(control).toHaveAttribute("aria-pressed", String(initial));
    await user.click(control);
    await waitFor(() =>
      expect(requests).toEqual([
        {
          [field]: !initial,
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      ]),
    );
    expect(control).toHaveAttribute("aria-pressed", String(!initial));
  },
);

it("opens Review on the fixed film with Watched on off", async () => {
  show(<FilmPanel movie={film} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Review" }));
  const dialog = await screen.findByRole("dialog", { name: "Review or log" });
  expect(within(dialog).getByText("The film")).toBeVisible();
  expect(
    within(dialog).queryByRole("button", { name: "Change" }),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).getByRole("switch", { name: "Watched on" }),
  ).not.toBeChecked();
});

it.each([{ user_rating: 7 }, { has_entries: true }])(
  "explains the Watched lock without saving for %j",
  async (lock) => {
    let writes = 0;
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/550`, () => {
        writes++;
        return HttpResponse.json(createMockUserMovieData());
      }),
    );
    show(
      <FilmPanel
        movie={{
          ...film,
          user_movie_data: createMockUserMovieData({
            tmdb_id: 550,
            user_watched: true,
            ...lock,
          }),
        }}
      />,
    );
    const panel = screen.getByRole("region", { name: "Your film" });
    const watched = within(panel).getByRole("button", { name: "Watched" });
    expect(watched).toHaveAttribute("aria-disabled", "true");
    expect(watched).toHaveAccessibleDescription(
      "Watched stays on while this film has your rating or any entries.",
    );
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
    await userEvent.setup().click(watched);
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Watched stays on while this film has your rating or any entries.",
    );
    expect(writes).toBe(0);
  },
);

it.each(["anonymous", "resolving"])(
  "keeps writes inert while %s and explains sign-in only when anonymous",
  async (status) => {
    clearBrowserAuth();
    const held = gate();
    let writes = 0;
    server.use(
      http.patch(`${apiBaseUrl}/user-movie-data/550`, () => {
        writes++;
        return HttpResponse.json(createMockUserMovieData());
      }),
    );
    if (status === "resolving")
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
      );
    const view = show(<FilmPanel movie={film} />);
    try {
      await waitFor(() =>
        expect(screen.getByLabelText("Session")).toHaveTextContent(status),
      );
      const panel = screen.getByRole("region", { name: "Your film" });
      expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
      const user = userEvent.setup();
      for (const name of ["Watched", "Like", "Watchlist", "Review"]) {
        const control = within(panel).getByRole("button", { name });
        expect(control).toHaveAttribute("aria-disabled", "true");
        await user.click(control);
      }
      expect(writes).toBe(0);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      if (status === "anonymous") {
        expect(within(panel).getByRole("status")).toHaveTextContent(
          "Sign in to mark films watched, rate and log them, and keep a watchlist.",
        );
        expect(
          within(panel).getByRole("link", { name: "Sign in" }),
        ).toHaveAttribute(
          "href",
          "/login?next=%2Fmovie%2F550%3Ffrom%3Dwatchlist",
        );
      } else
        expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
    } finally {
      held.release();
      view.unmount();
    }
  },
);
