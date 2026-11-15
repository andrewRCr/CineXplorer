import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { getPaginationContextId } from "@/services/paginationContext";
import { TestProviders } from "@tests/helpers/test-providers";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { createMockMovieListItems } from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { server } from "@tests/mocks/server";
import { useMoviePickerItems } from "../useMoviePickerItems";

beforeEach(clearBrowserAuth);
afterEach(() => vi.useRealTimers());

it("debounces trimmed two-character searches, maps ten items under its own context and keeps them during the next search", async () => {
  const movies = createMockMovieListItems(12);
  const requests: Request[] = [];
  const next = gate();
  const nextStarted = gate();
  server.use(
    http.get(`${apiBaseUrl}/movies/search`, async ({ request }) => {
      requests.push(request);
      if (new URL(request.url).searchParams.get("query") === "abc") {
        nextStarted.release();
        await next.wait;
        return HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            {
              ...movies[0],
              title: "Next film",
              release_date: null,
              poster_path: null,
            },
          ],
          next_tmdb_page_start: null,
        });
      }
      return HttpResponse.json({
        page: 1,
        total_pages: 1,
        total_results: 12,
        results: movies,
        next_tmdb_page_start: null,
      });
    }),
  );
  vi.useFakeTimers();
  const view = renderHook(({ text }) => useMoviePickerItems(text), {
    initialProps: { text: "" },
    wrapper: TestProviders,
  });
  try {
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(requests).toHaveLength(0);
    view.rerender({ text: " a " });
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(requests).toHaveLength(0);
    view.rerender({ text: " ab" });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    view.rerender({ text: " ab " });
    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(requests).toHaveLength(0);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await act(async () => vi.advanceTimersByTimeAsync(10));
    vi.useRealTimers();
    await waitFor(() => expect(view.result.current.items).toHaveLength(10));
    expect(view.result.current.items[0]).toEqual({
      tmdbId: 1,
      title: "Test Movie 1",
      year: "2024",
      posterPath: "/test-poster.jpg",
    });
    expect(requests).toHaveLength(1);
    const firstRequest = requests[0];
    if (!firstRequest) throw new Error("Search did not make a request");
    expect(new URL(firstRequest.url).searchParams.get("query")).toBe("ab");
    expect(new URL(firstRequest.url).searchParams.get("page")).toBe("1");
    const context = firstRequest.headers.get("X-Pagination-Context");
    expect(context).toBeTruthy();
    expect(context).not.toBe(getPaginationContextId());
    const previous = view.result.current.items;
    vi.useFakeTimers();
    view.rerender({ text: "abc" });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await act(async () => vi.advanceTimersByTimeAsync(10));
    vi.useRealTimers();
    await nextStarted.wait;
    expect(view.result.current.items).toEqual(previous);
    expect(view.result.current.isSearching).toBe(true);
    expect(requests[1]?.headers.get("X-Pagination-Context")).toBe(context);
    next.release();
    await waitFor(() =>
      expect(view.result.current.items).toEqual([
        { tmdbId: 1, title: "Next film", year: null, posterPath: null },
      ]),
    );
  } finally {
    next.release();
    view.unmount();
  }
});

it("does not restart an old failed search when input crosses the minimum during debounce", async () => {
  const queries: string[] = [];
  server.use(
    http.get(`${apiBaseUrl}/movies/search`, ({ request }) => {
      const text = new URL(request.url).searchParams.get("query") ?? "";
      queries.push(text);
      return text === "ab"
        ? HttpResponse.json({ detail: "Search failed" }, { status: 429 })
        : HttpResponse.json({
            page: 1,
            total_pages: 0,
            total_results: 0,
            results: [],
            next_tmdb_page_start: null,
          });
    }),
  );
  vi.useFakeTimers();
  const view = renderHook(({ text }) => useMoviePickerItems(text), {
    initialProps: { text: "ab" },
    wrapper: TestProviders,
  });
  try {
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await act(async () => vi.advanceTimersByTimeAsync(10));
    expect(queries).toEqual(["ab"]);
    expect(view.result.current.isError).toBe(true);
    view.rerender({ text: "" });
    await act(async () => vi.advanceTimersByTimeAsync(100));
    view.rerender({ text: "cd" });
    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(queries).toEqual(["ab"]);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await act(async () => vi.advanceTimersByTimeAsync(10));
    expect(queries).toEqual(["ab", "cd"]);
  } finally {
    view.unmount();
  }
});
