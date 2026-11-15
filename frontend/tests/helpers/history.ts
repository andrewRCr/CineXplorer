import type { components } from "@/types/api";

export type HistoryEntry = components["schemas"]["HistoryEntrySchema"];
export type HistoryPage =
    components["schemas"]["PaginatedResponse_HistoryEntrySchema_"];
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
    results: HistoryEntry[],
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
