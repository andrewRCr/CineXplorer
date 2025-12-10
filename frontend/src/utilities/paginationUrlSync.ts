/**
 * Pagination URL synchronization utilities
 *
 * Parses and generates URL query strings for pagination parameters.
 * Handles cross-cutting pagination concerns (page, tmdb_page_start) that apply
 * to both browse and search views, orthogonal to endpoint-specific params.
 *
 * Related utilities:
 * - browseUrlSync.ts: Browse endpoint params (filters, sort)
 * - searchUrlSync.ts: Search endpoint params (query)
 */

/**
 * Pagination parameters for URL state
 */
export interface PaginationParams {
  /** Current page number (1-indexed, defaults to 1) */
  page: number;
  /** TMDB page to start fetching from (for smart buffer continuation) */
  tmdb_page_start?: number;
}

/**
 * Default pagination parameters
 */
export const DEFAULT_PAGINATION_PARAMS: PaginationParams = {
  page: 1,
  tmdb_page_start: undefined,
};

/**
 * Parses an optional positive integer from URL param value
 *
 * @param value - Raw string value from URLSearchParams.get()
 * @returns Parsed positive integer, or undefined if invalid/missing
 */
function parseOptionalPositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Parses pagination parameters from URL search string
 *
 * @param search - URL search string (e.g., "?page=2&tmdb_page_start=5")
 * @returns Parsed PaginationParams object
 *
 * @example
 * parsePaginationFromUrl("?page=3&tmdb_page_start=9")
 * // => { page: 3, tmdb_page_start: 9 }
 *
 * @example
 * parsePaginationFromUrl("?page=2")
 * // => { page: 2, tmdb_page_start: undefined }
 *
 * @example
 * parsePaginationFromUrl("")
 * // => { page: 1, tmdb_page_start: undefined }
 */
export function parsePaginationFromUrl(search: string): PaginationParams {
  const params = new URLSearchParams(search);

  const page = parseOptionalPositiveInt(params.get("page")) ?? 1;
  const tmdb_page_start = parseOptionalPositiveInt(params.get("tmdb_page_start"));

  return { page, tmdb_page_start };
}

/**
 * Generates URL search string from pagination parameters
 *
 * Only includes non-default values to keep URLs clean:
 * - Omits page=1 (default)
 * - Omits tmdb_page_start when undefined
 *
 * @param paginationParams - Pagination parameters to serialize
 * @returns URL search string (without leading "?")
 *
 * @example
 * generatePaginationUrl({ page: 3, tmdb_page_start: 9 })
 * // => "page=3&tmdb_page_start=9"
 *
 * @example
 * generatePaginationUrl({ page: 2 })
 * // => "page=2"
 *
 * @example
 * generatePaginationUrl({ page: 1 })
 * // => ""
 */
export function generatePaginationUrl(
  paginationParams: Partial<PaginationParams>
): string {
  const urlParams = new URLSearchParams();

  const page = paginationParams.page ?? 1;
  if (page > 1) {
    urlParams.set("page", String(page));
  }

  if (paginationParams.tmdb_page_start !== undefined) {
    urlParams.set("tmdb_page_start", String(paginationParams.tmdb_page_start));
  }

  return urlParams.toString();
}

/**
 * Merges pagination params into existing URL search string
 *
 * Useful when updating pagination while preserving other params (filters, query, etc.)
 *
 * @param currentSearch - Current URL search string
 * @param paginationParams - Pagination params to merge/update
 * @returns Updated URL search string
 *
 * @example
 * mergePaginationIntoUrl("?genres=28&sortBy=vote_average.desc", { page: 2, tmdb_page_start: 5 })
 * // => "genres=28&sortBy=vote_average.desc&page=2&tmdb_page_start=5"
 */
export function mergePaginationIntoUrl(
  currentSearch: string,
  paginationParams: Partial<PaginationParams>
): string {
  const urlParams = new URLSearchParams(currentSearch);

  const page = paginationParams.page ?? 1;
  if (page > 1) {
    urlParams.set("page", String(page));
  } else {
    urlParams.delete("page");
  }

  if (paginationParams.tmdb_page_start !== undefined) {
    urlParams.set("tmdb_page_start", String(paginationParams.tmdb_page_start));
  } else {
    urlParams.delete("tmdb_page_start");
  }

  return urlParams.toString();
}
