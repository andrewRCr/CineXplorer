import type { UserMoviesQueryParams } from "@/services/userMovieService";

export interface LibrarySortOption {
    label: string;
    sort: NonNullable<UserMoviesQueryParams["sort"]>;
    direction: NonNullable<UserMoviesQueryParams["direction"]>;
}
export const watchlistSorts: LibrarySortOption[] = [
    { label: "Date added: newest", sort: "added", direction: "desc" },
    { label: "Date added: oldest", sort: "added", direction: "asc" },
    { label: "Title: A–Z", sort: "title", direction: "asc" },
    { label: "Title: Z–A", sort: "title", direction: "desc" },
    { label: "Release date: newest", sort: "release", direction: "desc" },
    { label: "Release date: oldest", sort: "release", direction: "asc" },
];

export const filmSorts: LibrarySortOption[] = [
    ...watchlistSorts.slice(0, 2),
    { label: "Last watched: newest", sort: "watched", direction: "desc" },
    { label: "Last watched: oldest", sort: "watched", direction: "asc" },
    { label: "Your rating: highest", sort: "rating", direction: "desc" },
    { label: "Your rating: lowest", sort: "rating", direction: "asc" },
    ...watchlistSorts.slice(2),
];
