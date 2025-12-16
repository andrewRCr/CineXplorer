/**
 * Shared utilities and components for movie grid implementations.
 */

// Constants and utilities
export {
    CARD_WIDTH,
    GAP,
    SKELETON_COUNT,
    placeholderMovie,
    calculateColumnCount,
} from "./gridConstants";

export {
    getScrollStorageKey,
    getSavedScrollPosition,
    getScrollKeys,
    cleanupOldScrollPositions,
    saveScrollPosition,
} from "./scrollStorage";

// UI Components
export { GridErrorState } from "./GridErrorState";
export { GridEmptyState } from "./GridEmptyState";
export { GridSkeletonLoader } from "./GridSkeletonLoader";
