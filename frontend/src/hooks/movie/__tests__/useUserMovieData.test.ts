import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@tests/mocks/server";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { useUserMovieData } from "../useUserMovieData";

beforeEach(() => {
    document.cookie = "csrftoken=movie-save-csrf; path=/";
});

describe("User movie request transitions", () => {
    it("retains the previous movie while loading, then clears it for an invalid ID", async () => {
        server.use(
            http.get("*/api/user-movie-data/:tmdbId", async ({ params }) => {
                const id = Number(params.tmdbId);
                if (id === 13) await delay(30);
                return HttpResponse.json(
                    createMockUserMovieData({ tmdb_id: id }),
                );
            }),
        );
        const { result, rerender } = renderHook(
            ({ id }) => useUserMovieData(id),
            { initialProps: { id: "550" } },
        );
        await waitFor(() => expect(result.current.data?.tmdb_id).toBe(550));
        expect(result.current.loading).toBe(false);
        rerender({ id: "13" });
        expect(result.current.loading).toBe(true);
        expect(result.current.data?.tmdb_id).toBe(550);
        await waitFor(() => expect(result.current.data?.tmdb_id).toBe(13));
        expect(result.current.loading).toBe(false);
        rerender({ id: "invalid" });
        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("Invalid movie ID format");
    });
});

describe("untouched movie saves", () => {
    it("treats GET 404 as no record and saves with the TMDB path ID", async () => {
        const requests: { path: string; body: unknown }[] = [];
        server.use(
            http.get("*/api/user-movie-data/:tmdbId", () =>
                HttpResponse.json({ detail: "Not found" }, { status: 404 }),
            ),
            http.patch("*/api/user-movie-data/:tmdbId", async ({ request }) => {
                requests.push({
                    path: new URL(request.url).pathname,
                    body: await request.json(),
                });
                return HttpResponse.json(
                    createMockUserMovieData({
                        tmdb_id: 550,
                        user_on_watchlist: true,
                    }),
                    { status: 201 },
                );
            }),
        );
        const { result } = renderHook(() => useUserMovieData("550"));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
        await act(async () => {
            await result.current.update({ user_on_watchlist: true });
        });
        expect(result.current.data).toEqual(
            createMockUserMovieData({ tmdb_id: 550, user_on_watchlist: true }),
        );
        expect(requests).toEqual([
            {
                path: "/api/user-movie-data/550",
                body: { user_on_watchlist: true },
            },
        ]);
    });
});
