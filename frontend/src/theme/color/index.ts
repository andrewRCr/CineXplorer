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
 * import { createUnifiedTheme } from "./color";
 *
 * // Create adapted theme
 * const unifiedTheme = createUnifiedTheme("github", "light");
 *
 * // Use in Chakra system creation
 * const system = createThemeSystem(unifiedTheme);
 * ```
 */

// Type exports
export type { UnifiedTheme } from "./types";
import type { UnifiedTheme } from "./types";

// Adapter function exports
export { createGithubAdapter } from "./adapters/github-primer";
export { createCarbonAdapter } from "./adapters/ibm-carbon";
export { createPajamasAdapter } from "./adapters/gitlab-pajamas";
export { createMaterialAdapter } from "./adapters/material-design-3";

// Import for use within this module
import { createGithubAdapter } from "./adapters/github-primer";
import { createCarbonAdapter } from "./adapters/ibm-carbon";
import { createPajamasAdapter } from "./adapters/gitlab-pajamas";
import { createMaterialAdapter } from "./adapters/material-design-3";

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
export { createExtensions } from "./extensions";

/**
 * Supported design system theme names.
 */
export type ThemeName =
    "github-primer" | "ibm-carbon" | "gitlab-pajamas" | "material-design-3";

/**
 * Factory function to create a UnifiedTheme from design system identifier.
 *
 * @param themeName - Design system identifier (github-primer, ibm-carbon, gitlab-pajamas, material-design-3)
 * @param mode - Color mode (light or dark)
 * @returns UnifiedTheme with ~47 tokens adapted to design system
 *
 * @throws {Error} If theme name is invalid or adapter not yet implemented
 *
 * @example
 * ```typescript
 * // Create GitHub Primer light mode theme
 * const githubLight = createUnifiedTheme("github-primer", "light");
 *
 * // Create IBM Carbon dark mode theme
 * const carbonDark = createUnifiedTheme("ibm-carbon", "dark");
 * ```
 */
export function createUnifiedTheme(
    themeName: ThemeName,
    mode: "light" | "dark",
): UnifiedTheme {
    switch (themeName) {
        case "github-primer":
            return createGithubAdapter(mode);
        case "ibm-carbon":
            return createCarbonAdapter(mode);
        case "gitlab-pajamas":
            return createPajamasAdapter(mode);
        case "material-design-3":
            return createMaterialAdapter(mode);
        default:
            throw new Error(`Unknown theme: ${themeName as string}`);
    }
}
