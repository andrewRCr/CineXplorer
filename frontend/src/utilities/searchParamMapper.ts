/**
 * Search parameter mapping utilities
 *
 * Maps frontend SearchParams to API parameters for the search endpoint.
 * Mirrors the pattern in browseParamMapper.ts for consistency.
 */

import type { SearchParams } from "@/types/searchTypes";

/**
 * API parameters for the search endpoint
 *
 * These are the actual query parameters sent to the backend search API.
 */
export interface SearchApiParams {
    query: string;
    page?: number;
    // Future expansion:
    // year_min?: number;
    // year_max?: number;
    // vote_average_gte?: number;
    // vote_average_lte?: number;
}

/**
 * Maps SearchParams to API parameters
 *
 * @param searchParams - Frontend search parameters
 * @returns API-ready parameters object
 */
export function mapSearchParamsToApi(
    searchParams: SearchParams,
): SearchApiParams {
    return {
        query: searchParams.query,
    };
}
