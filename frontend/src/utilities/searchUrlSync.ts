/**
 * Search URL synchronization utilities
 *
 * Parses and generates URL query strings for search parameters.
 * Mirrors the pattern in browseUrlSync.ts for consistency.
 */

import type { SearchParams } from "@/types/searchTypes";
import { DEFAULT_SEARCH_PARAMS } from "@/types/searchTypes";

/**
 * Parses search parameters from URL search string
 *
 * @param search - URL search string (e.g., "?query=batman&page=1")
 * @returns Parsed SearchParams object
 *
 * @example
 * parseSearchParamsFromUrl("?query=batman")
 * // => { query: "batman" }
 */
export function parseSearchParamsFromUrl(search: string): SearchParams {
  const params = new URLSearchParams(search);

  return {
    query: params.get("query") || DEFAULT_SEARCH_PARAMS.query,
  };
}

/**
 * Generates URL search string from search parameters
 *
 * Only includes non-default values to keep URLs clean.
 *
 * @param searchParams - Search parameters to serialize
 * @param page - Optional page number to include
 * @returns URL search string (without leading "?")
 *
 * @example
 * generateSearchUrl({ query: "batman" }, 2)
 * // => "query=batman&page=2"
 */
export function generateSearchUrl(searchParams: SearchParams, page?: number): string {
  const params = new URLSearchParams();

  if (searchParams.query) {
    params.set("query", searchParams.query);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  return params.toString();
}

/**
 * Checks if search params have an active query
 *
 * @param searchParams - Search parameters to check
 * @returns True if there's an active search query
 */
export function hasActiveSearch(searchParams: SearchParams): boolean {
  return Boolean(searchParams.query.trim());
}
