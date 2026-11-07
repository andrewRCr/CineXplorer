import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { describe, expect, it } from "vitest";
import { server } from "@tests/mocks/server";
import { useUserMovieData, type UserMovieData } from "../useUserMovieData";

const movieData = (id: number): UserMovieData => ({
    id,
    tmdb_id: id,
    title: `Movie ${id}`,
    user_watched: false,
    user_on_watchlist: true,
    user_liked: false,
    user_rating: null,
    user_review: null,
});

describe("User movie request transitions", () => {
    it("retains the previous movie while loading, then clears it for an invalid ID", async () => {
        server.use(
            http.get(
                "*/api/user-movie-data/by-tmdb-id",
                async ({ request }) => {
                    const id = Number(
                        new URL(request.url).searchParams.get("tmdb_id"),
                    );
                    if (id === 13) await delay(30);
                    return HttpResponse.json(movieData(id));
                },
            ),
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
