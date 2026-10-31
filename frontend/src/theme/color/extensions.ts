/**
 * CineXplorer Theme Extensions
 *
 * Centralized definitions for app-specific semantic tokens that don't come from
 * official design systems. These tokens were previously mixed into palette files
 * and are now extracted to maintain clear separation:
 *
 * **Official tokens** → Palettes (design system sources)
 * **App-specific tokens** → Extensions (this file)
 *
 * **Extension Categories:**
 * 1. **Rating tokens:** Movie score displays (IMDb gold standard)
 * 2. **Custom semantic colors:** App-specific status/feature tokens
 * 3. **Drag-and-drop states:** Watchlist reordering interactions
 *
 * These extensions are applied consistently across all themes, adapted to fit
 * each theme's color palette character.
 *
 * Related: ADR-005 (Section: CineXplorer Extensions)
 */

/**
 * CineXplorer-specific token values for a single mode (light or dark).
 */
export interface ExtensionTokens {
    /** Star system icon color (local user [NOT TMDB] scores; IMDb gold standard) */
    "imdb-gold": string;

    /** Badge background (genre tags, neutral labels, TMDB scores below 10 votes) */
    badge: string;
    /** Text color on badge backgrounds (ADR-011 canonical naming) */
    "on-badge": string;

    /** Active drag state (item being dragged) */
    "drag-active": string;
    /** Valid drop zone indicator */
    "drop-zone": string;
}

/**
 * Standard rating colors (IMDb gold approach).
 *
 * Used as **text/icon color** for user rating star displays.
 *
 * **Light Mode:**
 * - Star color: #876B06 (darkened gold for WCAG AA compliance)
 *
 * **Dark Mode:**
 * - Star color: #F5C518 (authentic IMDb gold)
 *
 * **Rationale:**
 * Movie rating displays benefit from consistent, recognizable coloring across
 * all themes. IMDb gold is industry-standard and immediately associated with
 * quality ratings. Light mode uses darkened shade for accessibility while
 * maintaining gold appearance.
 *
 * **WCAG AA Compliance:**
 * - Light mode on white (#ffffff): 6.11:1 ✅
 * - Light mode on all layer-01 values: 4.99-5.74:1 ✅ (universal compliance)
 * - Dark mode on dark backgrounds: Authentic IMDb gold has sufficient contrast
 */
export const standardRatingColors = {
    light: {
        "imdb-gold": "#785F05",
    },
    dark: {
        "imdb-gold": "#F5C518",
    },
} as const;

/**
 * Generate CineXplorer extension tokens adapted to theme character.
 *
 * This function provides app-specific tokens that are applied consistently across
 * all themes but adapted to fit each theme's visual style.
 *
 * **Adaptation Strategy:**
 * - **Rating tokens:** Use standard IMDb gold (consistent across themes)
 * - **Badge tokens:** Adapt to theme's neutral color palette
 * - **Drag-and-drop:** Use neutral colors (muted for drop-zone, secondaryHover for drag-active)
 *
 * @param themeBase - Base theme colors to adapt extensions to
 * @param mode - Color mode (light or dark)
 * @returns Extension tokens adapted to theme
 *
 * @example
 * ```typescript
 * // For GitHub Primer theme
 * const extensions = createExtensions({
 *   muted: primerLight.bg_muted,
 *   mutedForeground: primerLight.fg_muted,
 *   secondaryHover: primerLight.bg_button_secondary_hover,
 * }, "light");
 * ```
 */
export function createExtensions(
    themeBase: {
        /** Muted/subtle background (for badges and drop zones) */
        muted: string;
        /** Muted text color (for badge text) */
        mutedForeground: string;
        /** Secondary hover state (for drag active) */
        secondaryHover: string;
    },
    mode: "light" | "dark"
): ExtensionTokens {
    const badgeFg = themeBase.mutedForeground;

    return {
        // imdb-gold tokens: Use standard IMDb gold across all themes
        "imdb-gold": standardRatingColors[mode]["imdb-gold"],

        // Badge tokens: Adapt to theme's neutral palette
        badge: themeBase.muted,
        "on-badge": badgeFg, // ADR-011: Canonical naming

        // Drag-and-drop: Use neutral backgrounds for both states
        "drag-active": themeBase.secondaryHover,
        "drop-zone": themeBase.muted, // Neutral background for valid drop targets
    };
}
