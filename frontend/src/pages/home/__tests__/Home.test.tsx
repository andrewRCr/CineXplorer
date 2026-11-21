import {
  Toaster,
  toaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { act } from "@tests/helpers/test-renderer";
import { StrictMode, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { beginUserChange } from "@/lib/session";
import { Link, Routes, Route } from "react-router";
import userEvent from "@testing-library/user-event";
import { waitFor } from "@tests/helpers/test-renderer";
import { profile } from "@tests/helpers/auth";
import {
  createMockMoviePage,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { homeFilm } from "./homeFixtures";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { beforeEach, it, expect, onTestFinished, vi } from "vitest";
import { render, screen, within } from "@tests/helpers/test-renderer";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { gate } from "@tests/helpers/web-locks";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import Home from "@/pages/home/Home";
import { homeHandlers } from "./homeFixtures";

beforeEach(() => {
  beginUserChange(new QueryClient());
  act(() => {
    toaster.remove();
    priorityToaster.remove();
  });
  clearBrowserAuth();
  authHandlers();
  homeHandlers();
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query === "(hover: hover)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});
it("holds the loading state without a headline while the session resolves", () => {
  const pending = gate();
  server.use(
    http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
      await pending.wait;
      return HttpResponse.json({}, { status: 401 });
    }),
  );
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  pending.release();
});
it("composes signed-out Home in order with named sections and no card actions", async () => {
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  await screen.findByRole("heading", {
    level: 1,
    name: "Track what you watch. Find what's next.",
  });
  await screen.findByText("Opening soon");
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
  ).toEqual(["Popular in theaters", "Most anticipated", "What you can do"]);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen
      .getAllByRole("link", { name: "See all" })
      .map((link) => link.getAttribute("href")),
  ).toEqual(["/browse/now-playing", "/browse/upcoming"]);
  const row = screen.getByRole("region", { name: "Popular in theaters" });
  expect(
    within(row).queryByRole("group", { name: /^Your actions for / }),
  ).not.toBeInTheDocument();
  expect(
    within(row).queryByRole("button", { name: /^Actions for / }),
  ).not.toBeInTheDocument();
});
it("shows signed-in Home without the hero or sign-in data notice", async () => {
  setAuthTokens(token());
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Welcome, Movie",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Popular in theaters" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Track what you watch. Find what's next."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(/^An account keeps your lists\./),
  ).not.toBeInTheDocument();
});
it("switches a rejected stored sign-in to the pitch", async () => {
  setAuthTokens(token());
  server.use(
    http.get(`${apiBaseUrl}/profile/`, () =>
      HttpResponse.json({ detail: "Unavailable" }, { status: 500 }),
    ),
  );
  render(
    <AuthContextProvider>
      <Home />
    </AuthContextProvider>,
  );
  expect(
    await screen.findByRole("heading", {
      name: "Track what you watch. Find what's next.",
    }),
  ).toBeInTheDocument();
});

const savedFilm = {
  ...homeFilm,
  user_movie_data: createMockUserMovieData({
    tmdb_id: homeFilm.tmdb_id,
    user_on_watchlist: true,
  }),
};
const libraryUrl = `${apiBaseUrl}/user-movie-data/movies`;
function SignInAgain() {
  const auth = useAuthContext();
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() =>
        void auth
          ?.login("viewer", "password")
          .then((result) => setDone(result.success))
      }
    >
      {done ? "Signed in again" : "Sign in again"}
    </button>
  );
}
function homeWithNavigation(strict = false) {
  const content = (
    <AuthContextProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/other" element={<SignInAgain />} />
      </Routes>
      <Link to="/other">Leave Home</Link>
      <Link to="/">Return Home</Link>
      <Toaster />
    </AuthContextProvider>
  );
  return render(strict ? <StrictMode>{content}</StrictMode> : content);
}
it.each(["Ada", ""])(
  "greets by first name, falling back to username: %s",
  async (first) => {
    setAuthTokens(token());
    server.use(
      http.get(`${apiBaseUrl}/profile/`, () =>
        HttpResponse.json({ ...profile, first_name: first }),
      ),
      http.get(libraryUrl, () =>
        HttpResponse.json(createMockMoviePage([savedFilm])),
      ),
    );
    render(
      <AuthContextProvider>
        <Home />
      </AuthContextProvider>,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `Welcome back, ${first || profile.username}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((node) => node.textContent),
    ).toEqual(["Your watchlist", "Popular in theaters", "Most anticipated"]);
    expect(
      screen.queryByText("Track what you watch. Find what's next."),
    ).not.toBeInTheDocument();
  },
);
it.each(["session", "watchlist", "viewings"])(
  "waits for the first %s read before choosing signed-in Home",
  async (kind) => {
    setAuthTokens(token());
    const pending = gate();
    onTestFinished(() => pending.release());
    server.use(
      http.get(`${apiBaseUrl}/profile/`, async () => {
        if (kind === "session") await pending.wait;
        return HttpResponse.json(profile);
      }),
      http.get(libraryUrl, async () => {
        if (kind === "watchlist") await pending.wait;
        return HttpResponse.json(createMockMoviePage([savedFilm]));
      }),
      http.get(`${apiBaseUrl}/user-movie-data/entries`, async () => {
        if (kind === "viewings") await pending.wait;
        return HttpResponse.json({
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [],
        });
      }),
    );
    render(
      <AuthContextProvider>
        <Home />
      </AuthContextProvider>,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    pending.release();
    expect(
      await screen.findByRole("heading", { name: "Welcome back, Movie" }),
    ).toBeInTheDocument();
  },
);
it("keeps the greeting and chosen set through Retry under StrictMode, then hides the greeting on return", async () => {
  setAuthTokens(token());
  let reads = 0;
  const pending = gate();
  onTestFinished(() => pending.release());
  server.use(
    http.get(libraryUrl, async () => {
      if (++reads === 1)
        return HttpResponse.json({ detail: "Unavailable" }, { status: 500 });
      await pending.wait;
      return HttpResponse.json(createMockMoviePage([savedFilm]));
    }),
  );
  homeWithNavigation(true);
  expect(
    await screen.findByRole("heading", { name: "Welcome back, Movie" }),
  ).toBeInTheDocument();
  await screen.findByText("Couldn't load these films.");
  expect(reads).toBe(1);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("status", { name: "Loading Your watchlist" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Welcome back, Movie" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Popular in theaters" }),
  ).toBeInTheDocument();
  pending.release();
  await screen.findByRole("heading", { level: 3, name: homeFilm.title });
  await user.click(screen.getByRole("link", { name: "Leave Home" }));
  await user.click(screen.getByRole("link", { name: "Return Home" }));
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Home",
      hidden: true,
    }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: /Welcome back/ }),
  ).not.toBeInTheDocument();
});
it("keeps the nothing-saved line and hides the greeting on a return visit", async () => {
  setAuthTokens(token());
  homeWithNavigation();
  await screen.findByRole("heading", { name: "Welcome, Movie" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: "Leave Home" }));
  await user.click(screen.getByRole("link", { name: "Return Home" }));
  expect(
    await screen.findByRole("heading", { name: "Home", hidden: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Films you add to your watchlist will show up here."),
  ).toBeInTheDocument();
});
it("holds the nothing-saved set after a first save and shows the watchlist on the next visit", async () => {
  setAuthTokens(token());
  let saved = false;
  const savedRead = gate();
  onTestFinished(() => savedRead.release());
  server.use(
    http.get(libraryUrl, async () => {
      if (saved) await savedRead.wait;
      return HttpResponse.json(createMockMoviePage(saved ? [savedFilm] : []));
    }),
    http.patch(`${apiBaseUrl}/user-movie-data/${homeFilm.tmdb_id}`, () => {
      saved = true;
      return HttpResponse.json(savedFilm.user_movie_data);
    }),
  );
  homeWithNavigation();
  await screen.findByRole("heading", { name: "Welcome, Movie" });
  const user = userEvent.setup();
  await user.click(
    within(
      await screen.findByRole("group", {
        name: `Your actions for ${homeFilm.title}`,
      }),
    ).getByRole("button", { name: "Watchlist", pressed: false }),
  );
  await screen.findByText("Added to watchlist");
  expect(
    screen.getByText("Films you add to your watchlist will show up here."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "Your watchlist" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Leave Home" }));
  await user.click(screen.getByRole("link", { name: "Return Home" }));
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  savedRead.release();
  expect(
    await screen.findByRole("heading", { level: 3, name: homeFilm.title }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Home", hidden: true }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Films you add to your watchlist will show up here."),
  ).not.toBeInTheDocument();
});
it("greets again after a real sign-in on another page changes the session generation", async () => {
  setAuthTokens(token());
  server.use(
    http.post(`${apiBaseUrl}/token/`, () =>
      HttpResponse.json({
        access_token: token(),
        user_id: 7,
        username: "viewer",
        first_name: "Movie",
      }),
    ),
  );
  homeWithNavigation();
  await screen.findByRole("heading", { name: "Welcome, Movie" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: "Leave Home" }));
  await user.click(screen.getByRole("button", { name: "Sign in again" }));
  await screen.findByRole("button", { name: "Signed in again" });
  await user.click(screen.getByRole("link", { name: "Return Home" }));
  expect(
    await screen.findByRole("heading", { name: "Welcome, Movie" }),
  ).toBeInTheDocument();
});

it("does not choose a new user's page from the previous user's cached watchlist", async () => {
  setAuthTokens(token());
  let second = false;
  const profileRead = gate(),
    listRead = gate();
  onTestFinished(() => {
    profileRead.release();
    listRead.release();
  });
  let secondReads = 0;
  const parts = token().split(".");
  parts[1] = btoa(
    JSON.stringify({
      user_id: 8,
      token_type: "access",
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  );
  server.use(
    http.post(`${apiBaseUrl}/token/`, () => {
      second = true;
      return HttpResponse.json({
        access_token: parts.join("."),
        user_id: 8,
        username: "second",
        first_name: "Second",
      });
    }),
    http.get(`${apiBaseUrl}/profile/`, async () => {
      if (second) await profileRead.wait;
      return HttpResponse.json(
        second
          ? { ...profile, id: 8, username: "second", first_name: "Second" }
          : profile,
      );
    }),
    http.get(libraryUrl, async () => {
      if (second) {
        secondReads++;
        await listRead.wait;
      }
      return HttpResponse.json(createMockMoviePage(second ? [] : [savedFilm]));
    }),
  );
  render(
    <AuthContextProvider>
      <Home />
      <SignInAgain />
    </AuthContextProvider>,
  );
  await screen.findByRole("heading", { name: "Welcome back, Movie" });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Sign in again" }));
  profileRead.release();
  await waitFor(() => expect(secondReads).toBeGreaterThan(0));
  expect(
    screen.queryByRole("region", { name: "Your watchlist" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  listRead.release();
  expect(
    await screen.findByRole("heading", { name: "Welcome, Second" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Films you add to your watchlist will show up here."),
  ).toBeInTheDocument();
});
