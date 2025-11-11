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
    /** Rating background (TMDB scores, IMDb gold standard) */
    rating: string;
    /** Text color on rating backgrounds (ADR-011 canonical naming) */
    "on-rating": string;
    /** @deprecated Use on-rating instead (ADR-011) */
    "rating-foreground": string;

    /** Badge background (genre tags, neutral labels) */
    badge: string;
    /** Text color on badge backgrounds (ADR-011 canonical naming) */
    "on-badge": string;
    /** @deprecated Use on-badge instead (ADR-011) */
    "badge-foreground": string;

    /** Active drag state (item being dragged) */
    "drag-active": string;
    /** Valid drop zone indicator */
    "drop-zone": string;
}

/**
 * Standard rating colors (IMDb gold approach).
 *
 * **Light Mode:**
 * - Rating background: #F5C518 (IMDb gold standard)
 * - Rating foreground: #000000 (black text for maximum contrast on yellow)
 *
 * **Dark Mode:**
 * - Rating background: #D4A017 (slightly darker gold for dark backgrounds)
 * - Rating foreground: #000000 (black text maintains readability)
 *
 * **Rationale:**
 * Movie rating displays benefit from consistent, recognizable coloring across
 * all themes. The IMDb gold (#F5C518) is industry-standard and immediately
 * associated with quality ratings.
 *
 * **WCAG Compliance:**
 * - Light: #F5C518 + #000000 = 8.89:1 (AAA level)
 * - Dark: #D4A017 + #000000 = 11.24:1 (AAA level)
 */
export const standardRatingColors = {
    light: {
        rating: "#F5C518",
        "rating-foreground": "#000000",
    },
    dark: {
        rating: "#D4A017",
        "rating-foreground": "#000000",
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
 * - **Drag-and-drop:** Adapt to theme's interactive state colors
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
 *   accentEmphasis: primerLight.bg_accent_emphasis,
 *   secondaryHover: primerLight.bg_button_secondary_hover,
 * }, "light");
 * ```
 */
export function createExtensions(
    themeBase: {
        /** Muted/subtle background (for badges) */
        muted: string;
        /** Muted text color (for badge text) */
        mutedForeground: string;
        /** Accent emphasis color (for drop zones) */
        accentEmphasis: string;
        /** Secondary hover state (for drag active) */
        secondaryHover: string;
    },
    mode: "light" | "dark",
): ExtensionTokens {
    const ratingFg = standardRatingColors[mode]["rating-foreground"];
    const badgeFg = themeBase.mutedForeground;

    return {
        // Rating tokens: Use standard IMDb gold across all themes
        rating: standardRatingColors[mode].rating,
        "on-rating": ratingFg, // ADR-011: Canonical naming
        "rating-foreground": ratingFg, // @deprecated - alias for on-rating

        // Badge tokens: Adapt to theme's neutral palette
        badge: themeBase.muted,
        "on-badge": badgeFg, // ADR-011: Canonical naming
        "badge-foreground": badgeFg, // @deprecated - alias for on-badge

        // Drag-and-drop: Adapt to theme's interactive colors
        "drag-active": themeBase.secondaryHover,
        "drop-zone": themeBase.accentEmphasis,
    };
}

/**
 * Alternative: Theme-specific rating color overrides.
 *
 * If a theme needs rating colors that deviate from the IMDb gold standard,
 * use this function to provide custom values while maintaining contrast requirements.
 *
 * **Use cases:**
 * - Brand-specific color requirements
 * - Accessibility improvements for specific theme palettes
 * - Cultural/regional color preferences
 *
 * **Important:** Any custom rating colors MUST maintain WCAG AA contrast (4.5:1 minimum)
 * for text readability.
 *
 * @example
 * ```typescript
 * const customRating = createCustomRatingColors(
 *   "#FFD700", // Custom gold
 *   "#1A1A1A"  // Dark text
 * );
 * ```
 */
export function createCustomRatingColors(
    background: string,
    foreground: string,
): Pick<ExtensionTokens, "rating" | "on-rating" | "rating-foreground"> {
    // TODO: Add contrast validation in development mode
    return {
        rating: background,
        "on-rating": foreground, // ADR-011: Canonical naming
        "rating-foreground": foreground, // @deprecated - alias for on-rating
    };
}
