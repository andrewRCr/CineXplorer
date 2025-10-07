import apiClient from "./apiClient";
import type { components } from "../types/api";

// Type aliases from generated API schema
type UserMovieDataDetail = components["schemas"]["UserMovieDataDetailSchema"];
type UserMovieDataUpdate = components["schemas"]["UserMovieDataUpdateSchema"];

// Fetch user-specific data for a movie
export async function getUserMovieData(
	tmdbId: string
): Promise<UserMovieDataDetail> {
	const response = await apiClient.get(
		`/user-movie-data/by-tmdb-id/?tmdb_id=${tmdbId}`
	);
	return response.data;
}

// Update user-specific data for a movie - uses PK, not TMDB ID
export async function updateUserMovieData(
	movieId: string,
	changes: Partial<UserMovieDataUpdate>
): Promise<UserMovieDataDetail> {
	const response = await apiClient.patch(
		`/user-movie-data/${movieId}/`,
		changes
	);
	return response.data;
}
