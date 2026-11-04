/**
 * Browse params test fixtures
 *
 * Provides a single source of truth for creating BrowseParams mocks in tests.
 * When new fields are added to BrowseParams, only this file needs updating.
 */
import type { BrowseParams } from "@/types/browseTypes";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";

/**
 * Creates a mock BrowseParams object with sensible defaults.
 * Uses DEFAULT_BROWSE_PARAMS as base, allowing partial overrides.
 *
 * @example
 * // Default empty params
 * const params = createMockBrowseParams();
 *
 * @example
 * // With specific overrides
 * const params = createMockBrowseParams({ genres: [28], minRating: "7.0" });
 */
export function createMockBrowseParams(
    overrides: Partial<BrowseParams> = {},
): BrowseParams {
    return {
        ...DEFAULT_BROWSE_PARAMS,
        ...overrides,
    };
}
