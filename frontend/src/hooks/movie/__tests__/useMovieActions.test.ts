import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@tests/mocks/server";
import {
    createMockMovieListItem,
    createMockUserMovieData,
} from "@tests/mocks/movieData";
import { useMovieActions } from "../useMovieActions";

const movie = createMockMovieListItem({ tmdb_id: 550, user_movie_data: null });

beforeEach(() => {
    document.cookie = "csrftoken=movie-save-csrf; path=/";
});

describe("watchlist saves", () => {
    it.each([true, false])(
        "saves the requested state %s with one PATCH",
        async (desired) => {
            const requests: { method: string; path: string; body: unknown }[] =
                [];
            server.use(
                http.all(
                    /\/api\/user-movie-data(?:\/\d+)?$/,
                    async ({ request }) => {
                        requests.push({
                            method: request.method,
                            path: new URL(request.url).pathname,
                            body: await request.json(),
                        });
                        return HttpResponse.json(
                            createMockUserMovieData({
                                tmdb_id: 550,
                                user_on_watchlist: desired,
                            }),
                        );
                    },
                ),
            );
            const { result } = renderHook(() => useMovieActions({ movie }));
            await act(async () => {
                await result.current.toggleWatchlist(desired);
            });
            expect(requests).toEqual([
                {
                    method: "PATCH",
                    path: "/api/user-movie-data/550",
                    body: { user_on_watchlist: desired },
                },
            ]);
            expect(result.current.error).toBeNull();
            expect(result.current.isUpdating).toBe(false);
        },
    );

    it("stays updating until the save finishes", async () => {
        let finish: (() => void) | undefined;
        const pending = new Promise<void>((resolve) => {
            finish = resolve;
        });
        server.use(
            http.all(/\/api\/user-movie-data(?:\/\d+)?$/, async () => {
                await pending;
                return HttpResponse.json(
                    createMockUserMovieData({ user_on_watchlist: true }),
                );
            }),
        );
        const { result } = renderHook(() => useMovieActions({ movie }));
        let save: Promise<void> | undefined;
        act(() => {
            save = result.current.toggleWatchlist(true);
        });
        expect(result.current.isUpdating).toBe(true);
        await act(async () => {
            finish?.();
            await save;
        });
        expect(result.current.isUpdating).toBe(false);
    });

    it.each([500, 429])(
        "reports a failed save (%s) and clears the error after retry",
        async (status) => {
            server.use(
                http.all(/\/api\/user-movie-data(?:\/\d+)?$/, () =>
                    HttpResponse.json(
                        { detail: "Save unavailable" },
                        { status },
                    ),
                ),
            );
            const { result } = renderHook(() => useMovieActions({ movie }));
            await act(async () => {
                await expect(
                    result.current.toggleWatchlist(true),
                ).rejects.toThrow();
            });
            expect(result.current.error).toBeTruthy();
            expect(result.current.isUpdating).toBe(false);
            server.use(
                http.all(/\/api\/user-movie-data(?:\/\d+)?$/, () =>
                    HttpResponse.json(
                        createMockUserMovieData({ user_on_watchlist: true }),
                    ),
                ),
            );
            await act(async () => {
                await result.current.toggleWatchlist(true);
            });
            await waitFor(() => expect(result.current.error).toBeNull());
        },
    );
});
