import { beforeEach, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useQuery } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { EntryDialogHost } from "@/components/movie/entry/EntryDialogHost";
import { movieDetailQuery } from "@/lib/queries";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { TestProviders } from "@tests/helpers/test-providers";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import {
  createMockMovieDetail,
  createMockUserMovieData,
} from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import WideNavBar from "../WideNavBar";

function FilmRead() {
  const query = useQuery(movieDetailQuery(1));
  return (
    <>
      <output aria-label="Film query">{query.status}</output>
      <button onClick={() => void query.refetch()}>Refetch film</button>
    </>
  );
}
function renderWide(entry = "/browse", readFilm = false) {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <AuthContextProvider>
          <EntryDialogHost>
            <WideNavBar />
            {readFilm && <FilmRead />}
          </EntryDialogHost>
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
      HttpResponse.json({ record: createMockUserMovieData(), entries: [] }),
    ),
  );
});

it("places signed-in Log after search and before the account, and opens on the picker", async () => {
  setAuthTokens(token());
  const user = userEvent.setup();
  renderWide();
  const account = await screen.findByRole("button", { name: profile.username });
  const log = screen.getByRole("button", { name: "Log" });
  const search = screen.getByRole("textbox", { name: "Search films" });
  expect(
    search.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    log.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  await user.click(log);
  expect(
    await screen.findByRole("dialog", { name: "Review or log" }),
  ).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Film" })).toBeVisible();
  expect(screen.getByRole("switch", { name: "Watched on" })).toBeChecked();
});

it.each(["anonymous", "resolving"])(
  "does not offer Log while %s",
  async (status) => {
    const held = gate();
    if (status === "resolving")
      server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, async () => {
          await held.wait;
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }),
      );
    const view = renderWide();
    try {
      if (status === "anonymous")
        await screen.findByRole("link", { name: "Sign in" });
      expect(
        screen.queryByRole("button", { name: "Log" }),
      ).not.toBeInTheDocument();
    } finally {
      held.release();
      view.unmount();
    }
  },
);

it.each(["success", "pending", "error", "missing", "refetch-error"] as const)(
  "opens on a film only for a successful current query: %s",
  async (status) => {
    setAuthTokens(token());
    const held = gate();
    let reads = 0;
    server.use(
      http.get(`${apiBaseUrl}/movies/1`, async () => {
        reads++;
        if (status === "pending") await held.wait;
        if (
          status === "error" ||
          status === "missing" ||
          (status === "refetch-error" && reads > 1)
        )
          return HttpResponse.json(
            { detail: "Unavailable" },
            { status: status === "error" ? 429 : 404 },
          );
        return HttpResponse.json(
          createMockMovieDetail({ title: "Loaded film" }),
        );
      }),
    );
    const user = userEvent.setup();
    const view = renderWide("/movie/1", true);
    try {
      await screen.findByRole("button", { name: profile.username });
      if (status !== "pending")
        await waitFor(() =>
          expect(
            screen.getByRole("status", { name: "Film query" }),
          ).toHaveTextContent(
            status === "error" || status === "missing" ? "error" : "success",
          ),
        );
      if (status === "refetch-error") {
        await user.click(screen.getByRole("button", { name: "Refetch film" }));
        await waitFor(() =>
          expect(
            screen.getByRole("status", { name: "Film query" }),
          ).toHaveTextContent("error"),
        );
      }
      await user.click(screen.getByRole("button", { name: "Log" }));
      expect(
        await screen.findByRole("dialog", { name: "Review or log" }),
      ).toBeVisible();
      if (status === "success") {
        expect(screen.getByText("Loaded film")).toBeVisible();
        expect(screen.getByRole("button", { name: "Change" })).toBeVisible();
        expect(
          screen.queryByRole("combobox", { name: "Film" }),
        ).not.toBeInTheDocument();
      } else
        expect(screen.getByRole("combobox", { name: "Film" })).toBeVisible();
      expect(reads).toBe(status === "refetch-error" ? 2 : 1);
    } finally {
      held.release();
      view.unmount();
    }
  },
);
