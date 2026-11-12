/** Partially save the signed-in user's movie state by TMDB ID. */
import create from "./httpService";
import type { components } from "@/types/api";

export type UserMovieDataSchema = components["schemas"]["UserMovieDataSchema"];
// The generator treats fields with defaults as required; PATCH accepts their omission.
export type UserMovieDataPatchSchema = Partial<
    components["schemas"]["UserMovieDataPatchSchema"]
>;

const userMovieDataService = create("/user-movie-data");

/** Omitted fields stay unchanged; explicit null clears a nullable field. */
export const saveUserMovieData = (
    tmdbId: number,
    data: UserMovieDataPatchSchema,
) =>
    userMovieDataService.update<UserMovieDataPatchSchema, UserMovieDataSchema>(
        tmdbId,
        data,
    );
