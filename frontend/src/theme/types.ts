/**
 * Theme System Type Definitions
 *
 * Defines type-safe interfaces for CineXplorer's theme system.
 * Uses semantic token naming inspired by shadcn/ui, implemented for Chakra UI v3.
 */

import type { UnifiedTheme } from "./color/types";


/**
 * Complete theme definition with unified adapter tokens.
 *
 * Each theme provides:
 * - Unique identifier and display name
 * - Light mode unified adapter tokens
 * - Dark mode unified adapter tokens
 *
 * Themes are immutable once defined. To change colors, create a new theme.
 */
export interface Theme {
    /** Unique theme identifier (kebab-case, e.g., "github-primer", "ibm-carbon") */
    readonly name: string;

    /** Human-readable theme name for display (e.g., "GitHub", "IBM Carbon") */
    readonly label: string;

    /**
     * Light mode unified adapter tokens.
     *
     * Provides ~67 tokens including layer system, border hierarchy, shadows,
     * and interaction states following the UnifiedTheme interface contract.
     */
    readonly lightUnified: UnifiedTheme;

    /**
     * Dark mode unified adapter tokens.
     *
     * Provides ~67 tokens including layer system, border hierarchy, shadows,
     * and interaction states following the UnifiedTheme interface contract.
     */
    readonly darkUnified: UnifiedTheme;
}

/**
 * Theme registry mapping theme names to theme definitions.
 * All registered themes available for selection.
 *
 * Example:
 * ```typescript
 * const themes: ThemeRegistry = {
 *   "github": githubTheme,
 *   "cinexplorer-custom": cinexplorerTheme,
 * };
 * ```
 */
export type ThemeRegistry = Readonly<Record<string, Theme>>;
