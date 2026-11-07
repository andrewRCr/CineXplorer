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

export function catalogueResponse(url: URL): object | undefined {
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
