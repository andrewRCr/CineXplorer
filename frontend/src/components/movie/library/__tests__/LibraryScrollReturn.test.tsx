import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw/http";
import userEvent from "@testing-library/user-event";
import { apiBaseUrl } from "@/config/baseUrls";
import { beginUserChange } from "@/lib/session";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { BackToCollectionLink } from "@/components/navigation/BackToCollectionLink";
import Watchlist from "@/pages/user/Watchlist";
import LibraryFilms from "@/pages/user/LibraryFilms";
import { TestProviders } from "@tests/helpers/test-providers";
import {
  filmPage,
  prepareLibrary,
  scrollLibrary,
} from "@tests/helpers/library";
import { server } from "@tests/mocks/server";
import { measuredCollectionGeometry } from "@tests/helpers/measuredCollectionGeometry";
import { clearLibraryScrollMemory } from "@/components/movie/library/libraryScrollMemory";

let geometry: ReturnType<typeof measuredCollectionGeometry>;
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  prepareLibrary();
  clearLibraryScrollMemory();
  geometry = measuredCollectionGeometry();
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
      HttpResponse.json(filmPage(Array.from({ length: 100 }, (_, i) => i + 1))),
    ),
  );
});
function Detail({ path }: { path: string }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [status, setStatus] = useState("");
  return (
    <>
      <h1>Film detail</h1>
      <BackToCollectionLink searchParams={params} />
      <button onClick={() => void navigate(path)}>Open collection fresh</button>
      <button
        onClick={() => {
          clearLibraryScrollMemory();
          setStatus("Reloaded");
        }}
      >
        Simulate reload
      </button>
      <button
        onClick={() => {
          beginUserChange(client);
          setStatus("User changed");
        }}
      >
        Change user
      </button>
      <output>{status}</output>
    </>
  );
}
function page(path: string) {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={["/browse", path]}>
        <AuthContextProvider>
          <Routes>
            <Route path="/browse" element={<h1>Explore origin</h1>} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/library" element={<LibraryFilms />} />
            <Route path="/movie/:id" element={<Detail path={path} />} />
          </Routes>
          <BrowserBack />
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
function BrowserBack() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Browser back</button>;
}
async function openFromDeep() {
  await screen.findAllByRole("link", { name: "Film 1" });
  for (let offset = 500; offset <= 6500; offset += 500)
    await scrollLibrary(offset);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  const row = screen
    .getAllByRole("row")
    .find((row) => row.getAttribute("data-index") === "20");
  if (!row)
    throw new Error(
      `Missing measured row 20; scroll ${window.scrollY}; rows ${screen
        .getAllByRole("row")
        .map((row) => row.getAttribute("data-index"))
        .join(",")}`,
    );
  expect(row).toHaveStyle({ transform: "translateY(6320px)" });
  const link = screen.getAllByRole("link", { name: "Film 41" })[0];
  if (!link) throw new Error("Missing deep film");
  await userEvent.setup().click(link);
  await screen.findByRole("heading", { name: "Film detail" });
  await scrollLibrary(0);
  geometry.stopMeasuring();
}
for (const path of ["/watchlist", "/library"]) {
  it.each(["restore", "fresh", "reload", "user"])(
    `${path} returns with measured rows only when allowed (%s)`,
    async (mode) => {
      page(path);
      await openFromDeep();
      const user = userEvent.setup();
      if (mode === "reload")
        await user.click(
          screen.getByRole("button", { name: "Simulate reload" }),
        );
      if (mode === "user")
        await user.click(screen.getByRole("button", { name: "Change user" }));
      await user.click(
        screen.getByRole("link", {
          name: path === "/watchlist" ? "Back to Watchlist" : "Back to Library",
        }),
      );
      if (mode === "fresh") {
        // Repeat the arrival through a link without a restore signal.
        const link = (
          await screen.findAllByRole("link", { name: "Film 41" })
        )[0];
        if (!link) throw new Error("Missing restored film");
        await user.click(link);
        await user.click(
          screen.getByRole("button", { name: "Open collection fresh" }),
        );
      }
      if (mode === "restore") {
        await waitFor(() => expect(window.scrollY).toBe(6500));
        await waitFor(() => {
          const rows = screen.getAllByRole("row");
          const row = rows.find(
            (row) => row.getAttribute("data-index") === "20",
          );
          if (!row) throw new Error("Missing returned row 20");
          expect(row).toHaveStyle({ transform: "translateY(6320px)" });
        });
      } else {
        await waitFor(() => expect(window.scrollY).toBe(0));
        expect(
          (await screen.findAllByRole("link", { name: "Film 1" }))[0],
        ).toBeVisible();
        const nextRow = screen
          .getAllByRole("row")
          .find((row) => row.getAttribute("data-index") === "1");
        expect(nextRow).toHaveStyle({ transform: "translateY(16px)" });
        if (mode === "reload") {
          const link = screen.getAllByRole("link", { name: "Film 1" })[0];
          if (!link) throw new Error("Missing first film");
          await user.click(link);
          await user.click(
            screen.getByRole("link", {
              name:
                path === "/watchlist" ? "Back to Watchlist" : "Back to Library",
            }),
          );
          await waitFor(() => expect(window.scrollY).toBe(0));
        }
      }
    },
  );
}

it.each([
  ["/watchlist", "sort"],
  ["/library", "sort"],
  ["/library", "filter"],
])(
  "%s starts at the top and replaces history after a %s change",
  async (path, change) => {
    if (!path) throw new Error("Missing page path");
    page(path);
    await screen.findAllByRole("link", { name: "Film 1" });
    for (let offset = 500; offset <= 6500; offset += 500)
      await scrollLibrary(offset);
    const user = userEvent.setup();
    if (change === "filter")
      await user.click(screen.getByRole("button", { name: "Liked" }));
    else {
      await user.click(screen.getByRole("combobox", { name: "Sort by" }));
      await user.click(
        await screen.findByRole("option", { name: "Title: A–Z" }),
      );
    }
    await waitFor(() => expect(window.scrollY).toBe(0));
    await user.click(screen.getByRole("button", { name: "Browser back" }));
    expect(
      screen.getByRole("heading", { name: "Explore origin" }),
    ).toBeVisible();
  },
);
