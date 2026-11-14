import { readSession, sessionKey, type FirstReadContext } from "@/lib/session";
import {
    getUserMovies,
    type UserMoviesQueryParams,
} from "@/services/userMovieService";
import { queryOptions } from "@tanstack/react-query";
import {
    fetchMovieDetail,
    getNowPlayingMovies,
    getUpcomingMovies,
} from "@/services/movieService";
import { homeSectionOptions } from "@/services/homeRequests";
import type { MovieDetail } from "@/types/movie";
import type { BrowseParams } from "@/types/browseTypes";

export const virtualizedMoviesKey = (
    source: string | undefined,
    query: string | undefined,
    browseParams: BrowseParams | undefined,
) => ["movies", "virtualized", source, query, browseParams] as const;

export const infiniteMoviesKey = (
    source: string | undefined,
    query: string | undefined,
    browseParams: BrowseParams | undefined,
) => ["movies", "infinite", source, query, browseParams] as const;

export const libraryKey = ["library"] as const;

// Link the query lifetime to the service's existing cancellation contract.
function readWithSignal<T>(
    signal: AbortSignal,
    operation: { request: Promise<{ data: T }>; cancel: () => void },
): Promise<T> {
    const { request, cancel } = operation;
    if (signal.aborted) cancel();
    signal.addEventListener("abort", cancel, { once: true });
    return request
        .then((response) => response.data)
        .finally(() => signal.removeEventListener("abort", cancel));
}

export const movieDetailQuery = (tmdbId: number) =>
    queryOptions({
        queryKey: ["movies", "detail", tmdbId] as const,
        queryFn: ({ signal }) =>
            readWithSignal(signal, fetchMovieDetail().get<MovieDetail>(tmdbId)),
    });

export const libraryQuery = (params: UserMoviesQueryParams) =>
    queryOptions({
        queryKey: [...libraryKey, params] as const,
        queryFn: ({ signal }) => readWithSignal(signal, getUserMovies(params)),
    });

export const sessionQuery = (firstRead?: FirstReadContext) =>
    queryOptions({
        queryKey: sessionKey,
        queryFn: ({ client, signal }) => readSession(client, firstRead, signal),
        retry: false,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

export const homeWindowQuery = (window: "now-playing" | "upcoming") =>
    queryOptions({
        queryKey: ["movies", "home", window] as const,
        queryFn: ({ signal }) =>
            readWithSignal(
                signal,
                (window === "now-playing"
                    ? getNowPlayingMovies
                    : getUpcomingMovies)({ page: 1 }, homeSectionOptions),
            ),
    });
