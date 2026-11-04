/**
 * Search-specific type definitions
 *
 * Provides clean separation between search and browse parameter types.
 * Backend has this separation (SearchServiceParams vs BrowseServiceParams),
 * now frontend matches.
 *
 * For browse types, see @/types/browseTypes.ts
 */

/**
 * Search parameters for movie search functionality
 *
 * Currently minimal - just query string. Future expansion could include:
 * - year_min, year_max (search within year range)
 * - rating_min, rating_max (search with rating filter)
 * - language (search in specific language)
 */
export interface SearchParams {
    /** The search query string */
    query: string;
}

/**
 * Default search parameters - empty/inactive state
 */
export const DEFAULT_SEARCH_PARAMS: SearchParams = {
    query: "",
};
