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
