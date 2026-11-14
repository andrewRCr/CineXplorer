import type { components } from "@/types/api";

export type MoviePage = components["schemas"]["MovieListResponseSchema"];
type Movie = components["schemas"]["MovieListItemSchema"];
type Detail = components["schemas"]["MovieDetailSchema"];

function movie(id: number): Movie {
    const variant = (id - 1) % 4;
    return {
        tmdb_id: id,
        title: `Movie ${id}`,
        poster_path: null,
        release_date: "1981-01-01",
        vote_average: [8, 6, 4, 0][variant],
        vote_count: variant === 3 ? 0 : 20,
        runtime: 100,
        genre_ids: [],
        overview: `A synthetic story for Movie ${id}.`,
        user_movie_data: null,
    };
}

export function moviePage(
    start: number,
    count: number,
    next: number | null,
    total = count,
): MoviePage {
    return {
        page: 1,
        total_pages: next === null ? 1 : 2,
        total_results: total,
        results: Array.from({ length: count }, (_, index) =>
            movie(start + index),
        ),
        next_tmdb_page_start: next,
    };
}

export function movieDetail(id: number): Detail {
    return {
        ...movie(id),
        genres: [],
        production_companies: [],
        cast: [],
        crew: [],
        us_certification: "PG",
        spoken_languages: [],
    };
}

function homeCatalogueResponse(url: URL): object | undefined {
    if (url.pathname === "/api/movies/featured")
        return {
            tmdb_id: 947,
            title: "Lawrence of Arabia",
            release_date: "1962-12-11",
            backdrop_path: null,
            tagline: null,
            focus_point: null,
        } satisfies components["schemas"]["FeaturedMovieSchema"];
    if (url.pathname === "/api/movies/now-playing")
        return moviePage(1, 20, null);
    if (url.pathname === "/api/movies/upcoming") {
        const response = moviePage(21, 20, null);
        return {
            ...response,
            results: response.results?.map((film, index) => {
                const date = new Date();
                date.setUTCDate(
                    date.getUTCDate() + 7 + Math.floor(index / 5) * 7,
                );
                return {
                    ...film,
                    release_date: date.toISOString().slice(0, 10),
                };
            }),
        };
    }
}

export function catalogueResponse(url: URL): object | undefined {
    const home = homeCatalogueResponse(url);
    if (home) return home;
    if (url.pathname === "/api/movies/search") return moviePage(1, 39, null);
    if (url.pathname === "/api/movies/browse") {
        const cursor = url.searchParams.get("tmdb_page_start");
        if (!cursor) return moviePage(1, 39, 2, 78);
        if (cursor === "2") return moviePage(40, 39, null, 78);
    }
    const detail = /^\/api\/movies\/(\d+)$/.exec(url.pathname);
    if (detail) return movieDetail(Number(detail[1]));
    if (url.pathname === "/api/genres") {
        return [] satisfies components["schemas"]["GenreSchema"][];
    }
    if (
        url.pathname === "/api/keywords" ||
        url.pathname === "/api/keywords/search"
    ) {
        return {
            page: 1,
            total_pages: 0,
            total_results: 0,
            results: [],
        } satisfies components["schemas"]["KeywordListResponseSchema"];
    }
    if (
        url.pathname === "/api/people" ||
        url.pathname === "/api/people/search"
    ) {
        return {
            page: 1,
            total_pages: 0,
            total_results: 0,
            results: [],
        } satisfies components["schemas"]["PersonListResponseSchema"];
    }
}

/** Keep the layout scenario deterministic even when the rest of staging uses live data. */
export async function useRestoreCatalogue(
    page: import("@playwright/test").Page,
    baseURL: string,
): Promise<void> {
    const siteOrigin = new URL(baseURL).origin;
    await page.route("**/api/movies/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== siteOrigin || request.method() !== "GET") {
            await route.fallback();
            return;
        }
        if (url.pathname === "/api/movies/browse") {
            // Results must arrive after the shorter loading grid has mounted.
            await new Promise((resolve) => setTimeout(resolve, 400));
            await route.fulfill({ json: moviePage(1, 39, null) });
        } else if (/^\/api\/movies\/\d+$/.test(url.pathname)) {
            const id = Number(url.pathname.split("/").at(-1));
            await route.fulfill({ json: movieDetail(id) });
        } else {
            await route.fallback();
        }
    });
}

/** Home's color-mode checks use the same deterministic reads on every target. */
export async function useHomeCatalogue(
    page: import("@playwright/test").Page,
    baseURL: string,
): Promise<void> {
    const origin = new URL(baseURL).origin;
    await page.route("**/api/movies/**", async (route) => {
        const url = new URL(route.request().url());
        const response =
            url.origin === origin && route.request().method() === "GET"
                ? homeCatalogueResponse(url)
                : undefined;
        if (response) await route.fulfill({ json: response });
        else await route.fallback();
    });
}
