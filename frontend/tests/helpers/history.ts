import type { components } from "@/types/api";

export type HistoryEntry = components["schemas"]["HistoryEntrySchema"];
export type HistoryPage =
    components["schemas"]["PaginatedResponse_Union_HistoryEntrySchema__HistoryChangesSchema__"];
export type HistoryChanges = components["schemas"]["HistoryChangesSchema"];
export function historyChanges(
    field: HistoryChanges["field"],
    ids: number[],
    day = "2026-11-14",
): HistoryChanges {
    return {
        kind: "changes",
        day,
        field,
        count: ids.length,
        films: ids.slice(0, 8).map((id) => ({
            tmdb_id: id,
            title: `Film ${id}`,
            release_date: "2020-01-01",
            poster_path: `/film-${id}.jpg`,
            rating: field === "rating" ? 8 : null,
        })),
    };
}
export function historyEntry(
    id: number,
    overrides: Partial<HistoryEntry> = {},
): HistoryEntry {
    return {
        id,
        tmdb_id: id,
        title: `Entry ${id}`,
        day: "2026-11-14",
        kind: "viewing",
        watched_on: "2026-11-14",
        rating: null,
        review: null,
        rewatch: false,
        release_date: "2020-01-01",
        poster_path: null,
        ...overrides,
    };
}
export function historyPage(
    results: HistoryPage["results"],
    page = 1,
    totalPages = results.length ? 1 : 0,
    totalResults = results.length,
): HistoryPage {
    return {
        page,
        total_pages: totalPages,
        total_results: totalResults,
        results,
    };
}
