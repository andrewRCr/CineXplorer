import { beforeEach, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { createMockUserMovieData } from "@tests/mocks/movieData";
import { gate } from "@tests/helpers/web-locks";
import { activityQuery, entriesKey, movieEntriesQuery } from "../queries";

beforeEach(clearBrowserAuth);
const film = { record: createMockUserMovieData(), entries: [] };
const activity = { results: [], page: 2, total_results: 0, total_pages: 0 };

it("reads film entries and one activity page under the entry keys", async () => {
    server.use(
        http.get(`${apiBaseUrl}/user-movie-data/1/entries`, () =>
            HttpResponse.json(film),
        ),
        http.get(`${apiBaseUrl}/user-movie-data/entries`, ({ request }) => {
            const params = new URL(request.url).searchParams;
            return params.get("page") === "2" && params.get("page_size") === "3"
                ? HttpResponse.json(activity)
                : HttpResponse.json({ detail: "Wrong page" }, { status: 422 });
        }),
    );
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    try {
        const movieOptions = movieEntriesQuery(1);
        const activityOptions = activityQuery({ page: 2, page_size: 3 });
        expect(entriesKey).toEqual(["entries"]);
        expect(movieOptions.queryKey).toEqual(["entries", "movie", 1]);
        expect(activityOptions.queryKey).toEqual([
            "entries",
            "activity",
            { page: 2, page_size: 3 },
        ]);
        expect(await client.fetchQuery(movieOptions)).toEqual(film);
        expect(await client.fetchQuery(activityOptions)).toEqual(activity);
    } finally {
        client.clear();
    }
});

it.each(["movie", "activity"] as const)(
    "cancels the %s read's transport",
    async (kind) => {
        const entered = gate();
        const release = gate();
        let aborted = false;
        server.use(
            http.get(
                `${apiBaseUrl}/user-movie-data/${kind === "movie" ? "1/entries" : "entries"}`,
                async ({ request }) => {
                    request.signal.addEventListener("abort", () => {
                        aborted = true;
                    });
                    entered.release();
                    await release.wait;
                    return HttpResponse.json(
                        kind === "movie" ? film : activity,
                    );
                },
            ),
        );
        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const options =
            kind === "movie" ? movieEntriesQuery(1) : activityQuery({});
        try {
            const result = (
                kind === "movie"
                    ? client.fetchQuery(movieEntriesQuery(1))
                    : client.fetchQuery(activityQuery({}))
            ).catch((error: unknown) => error);
            await entered.wait;
            await client.cancelQueries({ queryKey: options.queryKey });
            await waitFor(() => expect(aborted).toBe(true));
            expect(await result).toBeInstanceOf(Error);
            expect(client.getQueryData(options.queryKey)).toBeUndefined();
        } finally {
            release.release();
            client.clear();
        }
    },
);
