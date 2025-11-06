/**
 * Unified Theme Adapter - Public API
 *
 * Central export point for the theme adapter system. Provides factory function
 * to create UnifiedTheme instances from design system themes.
 *
 * **Architecture:**
 * ```
 * Design System Palettes → Adapters → UnifiedTheme → Components
 *                           (this layer)
 * ```
 *
 * **Usage in Theme System:**
 * ```typescript
 * import { createUnifiedTheme } from "./adapter";
 *
 * // Create adapted theme
 * const unifiedTheme = createUnifiedTheme("github", "light");
 *
 * // Use in Chakra system creation
 * const system = createThemeSystem(unifiedTheme);
 * ```
 *
 * **Implementation Phases:**
 * - Phase 1 (Task 1.2): Architecture and types ✅
 * - Phase 2: Per-theme adapter implementations
 *   - 2.1: GitHub Primer adapter
 *   - 2.2: IBM Carbon adapter
 *   - 2.3: GitLab Pajamas adapter
 * - Phase 3: Component migration to canonical names
 * - Phase 4: Remove old ThemeColors, comprehensive testing
 *
 * Related: ADR-005 (Unified Theme Adapter Layer)
 */

// Type exports
export type { UnifiedTheme } from "./types";
import type { UnifiedTheme } from "./types";

// Adapter function exports (Phase 2)
export { createGithubAdapter } from "./mappings/github-primer";
export { createCarbonAdapter } from "./mappings/ibm-carbon";
export { createPajamasAdapter } from "./mappings/gitlab-pajamas";

// Import for use within this module
import { createGithubAdapter } from "./mappings/github-primer";
import { createCarbonAdapter } from "./mappings/ibm-carbon";
import { createPajamasAdapter } from "./mappings/gitlab-pajamas";

// Utility exports (for adapter implementations)
export {
    adjustColor,
    deriveBorderHierarchy,
    deriveInteractionStates,
    deriveLayer03,
    isLightColor,
} from "./utils";

// Shadow value exports
export { getShadowValues } from "./shadows";

// Extension exports
export { createExtensions, createCustomRatingColors } from "./extensions";

/**
 * Factory function to create a UnifiedTheme from design system identifier.
 *
 * **IMPLEMENTATION STATUS:** Skeleton only - Phase 2 will implement adapters.
 *
 * This function routes to the appropriate adapter based on theme name and mode.
 * Once Phase 2 is complete, it will return fully-mapped UnifiedTheme instances.
 *
 * @param themeName - Design system identifier (github, ibm-carbon, gitlab-pajamas)
 * @param mode - Color mode (light or dark)
 * @returns UnifiedTheme with ~47 tokens adapted to design system
 *
 * @throws {Error} If theme name is invalid or adapter not yet implemented
 *
 * @example
 * ```typescript
 * // Create GitHub Primer light mode theme
 * const githubLight = createUnifiedTheme("github", "light");
 *
 * // Create IBM Carbon dark mode theme
 * const carbonDark = createUnifiedTheme("ibm-carbon", "dark");
 * ```
 */
export function createUnifiedTheme(
    themeName: "github" | "ibm-carbon" | "gitlab-pajamas",
    mode: "light" | "dark",
): UnifiedTheme {
    switch (themeName) {
        case "github":
            return createGithubAdapter(mode);
        case "ibm-carbon":
            return createCarbonAdapter(mode);
        case "gitlab-pajamas":
            return createPajamasAdapter(mode);
        default:
            throw new Error(`Unknown theme: ${themeName as string}`);
    }
}
