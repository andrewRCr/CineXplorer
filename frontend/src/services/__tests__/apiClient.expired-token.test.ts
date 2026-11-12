import { beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw/http";
import apiClient, { invalidateAuthSession } from "../apiClient";
import { apiBaseUrl } from "@/config/baseUrls";
import { clearAuthTokens, setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth, token } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";
import { createMockMovieDetail } from "@tests/mocks/movieData";
import type { MovieDetail } from "@/types/movie";

const watched = createMockMovieDetail({
    tmdb_id: 550,
    user_movie_data: {
        id: 1,
        tmdb_id: 550,
        user_watched: false,
        user_on_watchlist: true,
        user_liked: false,
        user_rating: null,
        user_review: null,
    },
});

beforeEach(() => {
    invalidateAuthSession();
    clearBrowserAuth();
    document.cookie = "csrftoken=django-csrf; path=/";
    window.location.href = "http://localhost:3000";
});

describe("expired tokens on public movie requests", () => {
    it.each(["localStorage", "sessionStorage"] as const)(
        "renews before reading watchlist data from a public route (%s)",
        async (storage) => {
            setAuthTokens(token(1), storage);
            const renewed = token();
            let refreshes = 0;
            const authorization: Array<string | null> = [];
            server.use(
                http.post(`${apiBaseUrl}/auth/refresh`, () => {
                    refreshes++;
                    return HttpResponse.json({ access_token: renewed });
                }),
                http.get(`${apiBaseUrl}/movies/550`, ({ request }) => {
                    const header = request.headers.get("Authorization");
                    authorization.push(header);
                    return HttpResponse.json({
                        ...watched,
                        user_movie_data:
                            header === `Bearer ${renewed}`
                                ? watched.user_movie_data
                                : null,
                    });
                }),
            );

            const response = await apiClient.get<MovieDetail>("/movies/550");

            expect(response.status).toBe(200);
            expect(response.data.user_movie_data?.user_on_watchlist).toBe(true);
            expect(refreshes).toBe(1);
            expect(authorization).toEqual([`Bearer ${renewed}`]);
            expect(window[storage].getItem("access_token")).toBe(renewed);
            expect(
                window[
                    storage === "localStorage"
                        ? "sessionStorage"
                        : "localStorage"
                ].getItem("access_token"),
            ).toBeNull();
        },
    );

    it("holds concurrent public requests until their one renewal completes", async () => {
        setAuthTokens(token(1));
        const renewed = token();
        const release = gate();
        let refreshes = 0;
        let reads = 0;
        server.use(
            http.post(`${apiBaseUrl}/auth/refresh`, async () => {
                refreshes++;
                await release.wait;
                return HttpResponse.json({ access_token: renewed });
            }),
            http.get(`${apiBaseUrl}/movies/550`, ({ request }) => {
                reads++;
                return HttpResponse.json({
                    ...watched,
                    user_movie_data:
                        request.headers.get("Authorization") ===
                        `Bearer ${renewed}`
                            ? watched.user_movie_data
                            : null,
                });
            }),
        );
        const outcomes = Promise.allSettled([
            apiClient.get<MovieDetail>("/movies/550"),
            apiClient.get<MovieDetail>("/movies/550"),
        ]);
        try {
            await waitFor(() => expect(refreshes).toBe(1));
            expect(reads).toBe(0);
        } finally {
            release.release();
        }
        const results = await outcomes;
        expect(results.map((result) => result.status)).toEqual([
            "fulfilled",
            "fulfilled",
        ]);
        for (const result of results) {
            if (result.status === "fulfilled") {
                expect(
                    result.value.data.user_movie_data?.user_on_watchlist,
                ).toBe(true);
            }
        }
        expect(refreshes).toBe(1);
        expect(reads).toBe(2);
    });

    it.each(["refused", "missing token", "invalid token"])(
        "settles public callers without sending them after renewal is %s",
        async (failure) => {
            setAuthTokens(token(1));
            let reads = 0;
            let refreshes = 0;
            server.use(
                http.post(`${apiBaseUrl}/auth/refresh`, () => {
                    refreshes++;
                    return failure === "refused"
                        ? HttpResponse.json(
                              { detail: "Session expired" },
                              { status: 401 },
                          )
                        : HttpResponse.json(
                              failure === "missing token"
                                  ? {}
                                  : { access_token: 42 },
                          );
                }),
                http.get(`${apiBaseUrl}/movies/550`, () => {
                    reads++;
                    return HttpResponse.json({
                        ...watched,
                        user_movie_data: null,
                    });
                }),
            );
            const outcomes = await Promise.allSettled([
                apiClient.get("/movies/550"),
                apiClient.get("/movies/550"),
            ]);
            expect(outcomes.map((result) => result.status)).toEqual([
                "rejected",
                "rejected",
            ]);
            expect(reads).toBe(0);
            expect(refreshes).toBe(1);
            expect(localStorage.getItem("access_token")).toBeNull();
            expect(sessionStorage.getItem("access_token")).toBeNull();
            expect(window.location.href).toBe(
                "/login?next=%2F&session_expired=true",
            );
        },
    );
});

it("ignores an obsolete 401 after another sign-in becomes current", async () => {
    setAuthTokens(token());
    const newSessionToken = token(Math.floor(Date.now() / 1000) + 900);
    const entered = gate();
    const release = gate();
    let refreshes = 0;
    server.use(
        http.get(`${apiBaseUrl}/old-session-request`, async () => {
            entered.release();
            await release.wait;
            return HttpResponse.json(
                { detail: "Unauthorized" },
                { status: 401 },
            );
        }),
        http.post(`${apiBaseUrl}/auth/refresh`, () => {
            refreshes++;
            return HttpResponse.json(
                { detail: "Session expired" },
                { status: 401 },
            );
        }),
    );
    const outcome = Promise.allSettled([apiClient.get("/old-session-request")]);
    await entered.wait;
    invalidateAuthSession();
    clearAuthTokens();
    setAuthTokens(newSessionToken);
    release.release();
    expect(await outcome).toMatchObject([
        { status: "rejected", reason: { code: "ERR_CANCELED" } },
    ]);
    expect(refreshes).toBe(0);
    expect(localStorage.getItem("access_token")).toBe(newSessionToken);
    expect(window.location.href).toBe("http://localhost:3000");
});

it("keeps a successful request-time renewal when the server still refuses the request", async () => {
    setAuthTokens(token(1));
    const renewed = token();
    let refreshes = 0;
    let requests = 0;
    server.use(
        http.post(`${apiBaseUrl}/auth/refresh`, () => {
            refreshes++;
            return HttpResponse.json({ access_token: renewed });
        }),
        http.get(`${apiBaseUrl}/renewed-but-refused`, () => {
            requests++;
            return HttpResponse.json(
                { detail: "Unauthorized" },
                { status: 401 },
            );
        }),
    );
    await expect(apiClient.get("/renewed-but-refused")).rejects.toMatchObject({
        response: { status: 401 },
    });
    expect(refreshes).toBe(1);
    expect(requests).toBe(1);
    expect(localStorage.getItem("access_token")).toBe(renewed);
    expect(window.location.href).toBe("http://localhost:3000");
});

it.each([true, false])(
    "keeps the current page on renewal failure (expired before request: %s)",
    async (expired) => {
        setAuthTokens(expired ? token(1) : token());
        window.location.pathname = "/watchlist";
        window.location.search = "?sort=added";
        window.location.hash = "#recent";
        server.use(
            http.get(`${apiBaseUrl}/return-path-check`, () =>
                HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
            ),
            http.post(`${apiBaseUrl}/auth/refresh`, () =>
                HttpResponse.json(
                    { detail: "Session expired" },
                    { status: 401 },
                ),
            ),
        );
        try {
            await expect(
                apiClient.get("/return-path-check"),
            ).rejects.toMatchObject({
                response: { status: 401 },
            });
            expect(window.location.href).toBe(
                "/login?next=%2Fwatchlist%3Fsort%3Dadded%23recent&session_expired=true",
            );
        } finally {
            window.location.pathname = "/";
            window.location.search = "";
            window.location.hash = "";
        }
    },
);
