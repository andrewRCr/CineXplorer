import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import {
    createMockMoviePage,
    createMockMovieListItem,
} from "@tests/mocks/movieData";

export const homeFilm = createMockMovieListItem({
    tmdb_id: 947,
    title: "Lawrence of Arabia",
    poster_path: null,
});
export function homeHandlers() {
    server.use(
        http.get(`${apiBaseUrl}/movies/featured`, () =>
            HttpResponse.json({
                tmdb_id: 947,
                title: "Lawrence of Arabia",
                release_date: "1962-12-11",
                backdrop_path: null,
                tagline: null,
                focus_point: null,
                directors: [],
            }),
        ),
        http.get(`${apiBaseUrl}/movies/now-playing`, () =>
            HttpResponse.json(createMockMoviePage([homeFilm])),
        ),
        http.get(`${apiBaseUrl}/movies/upcoming`, () =>
            HttpResponse.json(
                createMockMoviePage([
                    {
                        ...homeFilm,
                        tmdb_id: 948,
                        title: "Opening soon",
                        release_date: "2026-11-20",
                    },
                ]),
            ),
        ),
        http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
            HttpResponse.json(createMockMoviePage([])),
        ),
    );
}
