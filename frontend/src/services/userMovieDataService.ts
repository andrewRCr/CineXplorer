/** Partially save the signed-in user's movie state by TMDB ID. */
import create from "./httpService";
import type { AxiosRequestConfig } from "axios";
import type { components } from "@/types/api";

export type UserMovieDataSchema = components["schemas"]["UserMovieDataSchema"];
// The generator treats fields with defaults as required; PATCH accepts their omission.
export type UserMovieDataPatchSchema = Partial<
    components["schemas"]["UserMovieDataPatchSchema"]
>;

const userMovieDataService = create("/user-movie-data");

/** An omitted field stays unchanged except where data rules change it; null clears it. */
export const saveUserMovieData = (
    tmdbId: number,
    data: UserMovieDataPatchSchema,
    config?: AxiosRequestConfig,
) =>
    userMovieDataService.update<UserMovieDataPatchSchema, UserMovieDataSchema>(
        tmdbId,
        data,
        config,
    );

export type MovieEntries = components["schemas"]["MovieEntriesSchema"];
export type ActivityPage =
    components["schemas"]["PaginatedResponse_ActivityEntrySchema_"];
export type ActivityParams = Partial<
    components["schemas"]["ActivityQuerySchema"]
>;

export const getMovieEntries = (tmdbId: number) =>
    userMovieDataService.get<MovieEntries>(`${tmdbId}/entries`);

export const getActivity = (params: ActivityParams) =>
    create("/user-movie-data/entries").getPaginated<ActivityPage>(params);
