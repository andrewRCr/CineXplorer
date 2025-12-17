/**
 * Movie search URL synchronization utilities
 *
 * Parses and generates URL query strings for movie search parameters.
 * Mirrors the pattern in browseUrlSync.ts for consistency.
 */

import type { SearchParams } from "@/types/searchTypes";
import { DEFAULT_SEARCH_PARAMS } from "@/types/searchTypes";

/**
 * Parses movie search parameters from URL query string
 *
 * @param search - URL query string (location.search, e.g., "?query=batman")
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
 * Generates URL query string from movie search parameters
 *
 * Only includes non-default values to keep URLs clean.
 * Note: Pagination is handled internally by TanStack Query (infinite scroll).
 *
 * @param searchParams - Movie search parameters to serialize
 * @returns URL query string (without leading "?")
 *
 * @example
 * generateSearchUrl({ query: "batman" })
 * // => "query=batman"
 */
export function generateSearchUrl(searchParams: SearchParams): string {
  const params = new URLSearchParams();

  if (searchParams.query) {
    params.set("query", searchParams.query);
  }

  return params.toString();
}

/**
 * Checks if movie search params have an active query
 *
 * @param searchParams - Movie search parameters to check
 * @returns True if there's an active movie search query
 */
export function hasActiveSearch(searchParams: SearchParams): boolean {
  return Boolean(searchParams.query.trim());
}
