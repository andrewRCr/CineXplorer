import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { createMockUserMovieData } from "../movieData";
import type { MovieListResponseSchema } from "@/services/userMovieService";

const movies: NonNullable<MovieListResponseSchema["results"]> = [
    {
        tmdb_id: 550,
        title: "Fight Club",
        user_movie_data: createMockUserMovieData({
            tmdb_id: 550,
            user_watched: false,
            user_on_watchlist: true,
            user_liked: false,
        }),
    },
    {
        tmdb_id: 13,
        title: "Forrest Gump",
        user_movie_data: createMockUserMovieData({
            tmdb_id: 13,
            user_watched: true,
            user_on_watchlist: true,
            user_liked: true,
        }),
    },
    {
        tmdb_id: 100,
        title: "Already watched",
        user_movie_data: createMockUserMovieData({
            tmdb_id: 100,
            user_watched: true,
            user_on_watchlist: false,
            user_liked: false,
        }),
    },
];

export const userMoviesHandler = http.get(
    `${apiBaseUrl}/user-movie-data/movies`,
    ({ request }) => {
        const watchlistOnly =
            new URL(request.url).searchParams.get("watchlist") === "true";
        const results = watchlistOnly
            ? movies.filter((movie) => movie.user_movie_data?.user_on_watchlist)
            : movies;
        const response: MovieListResponseSchema = {
            page: 1,
            total_pages: results.length ? 1 : 0,
            total_results: results.length,
            results,
        };
        return HttpResponse.json(response);
    },
);
