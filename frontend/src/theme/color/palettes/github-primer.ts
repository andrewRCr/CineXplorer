/**
 * GitHub Primer Color Palette
 *
 * Contains ONLY official GitHub Primer design system tokens for light and dark modes.
 * All CineXplorer-specific extensions (warning, info, rating) have been extracted to
 * the adapter layer (frontend/src/theme/adapter/extensions.ts).
 *
 * Source: https://primer.style/product/primitives/color/
 * Package: @primer/primitives v8.x
 *
 * All values verified from official Primer primitives documentation.
 * Last updated: 2025-11-04 (Task 2.1.1 - palette corrections)
 */

/**
 * GitHub Primer color palette - Light Mode
 *
 * Organized by semantic function following Primer's functional token structure.
 * Values are official hex colors from GitHub Primer primitives.
 */
export const githubPaletteLight = {
    // Base colors
    /** Primary canvas/page background - Pure white */
    bg_default: "#ffffff",
    /** Secondary surfaces, subtle emphasis */
    bg_muted: "#f6f8fa",
    /** Card/elevated surface backgrounds */
    bg_inset: "#f6f8fa",
    /** Strong emphasis backgrounds (accent) */
    bg_emphasis: "#ddf4ff",

    // Foreground colors
    /** Primary text color - Near black */
    fg_default: "#1f2328",
    /** Secondary text, reduced emphasis */
    fg_muted: "#59636e",
    /** Tertiary text, minimal emphasis */
    fg_subtle: "#818b98",
    /** Text on emphasis backgrounds */
    fg_onEmphasis: "#ffffff",

    // Semantic colors - Accent (Links, selections)
    /** Links, interactive elements, focus */
    fg_accent: "#0969da",
    /** Link hover state (darker/more saturated blue - official GitHub pattern) */
    fg_accent_hover: "#0550ae",
    /** Primary action button background */
    bg_success: "#1f883d",
    /** Success button hover */
    bg_success_hover: "#1c8139",

    // Semantic colors - Danger (Destructive actions)
    /** Error/danger text */
    fg_danger: "#d1242f",
    /** Destructive action button */
    bg_danger: "#cf222e",
    /** Danger button hover */
    bg_danger_hover: "#ca1e29",

    // Border colors
    /** Primary borders, dividers */
    border_default: "#d1d9e0",
    /** Subtle borders (translucent) */
    border_muted: "#d1d9e0b3",
    /** Strong borders, emphasis (borderColor-emphasis - official Primer) */
    border_emphasis: "#818b98",

    // Button colors (DERIVED - Primer doesn't provide explicit secondary button tokens)
    /** Secondary button background (DERIVED: medium gray for prominence and distinction from muted) */
    bg_button_secondary: "#8c929d",
    /** Secondary button hover (DERIVED: slightly darker gray) */
    bg_button_secondary_hover: "#7a808b",
} as const;

/**
 * GitHub Primer color palette - Dark Mode
 *
 * Uses inverted scale approach per Primer design principles.
 * Maintains perceptual uniformity with light mode via HSLuv color space.
 */
export const githubPaletteDark = {
    // Base colors
    /** Primary canvas/page background - Near black */
    bg_default: "#0d1117",
    /** Secondary surfaces, subtle emphasis */
    bg_muted: "#161b22",
    /**
     * Card/elevated surface backgrounds (darker than default)
     * Decision: Using official bgColor-inset (#010409) instead of bgColor-muted (#151b23).
     * Rationale: Primer's bgColor-inset is semantically correct for recessed/inset surfaces
     * (darker than default in dark mode). bgColor-muted (#151b23) would be too light and
     * violate Primer's inset surface principle. Verified from @primer/primitives v8.x.
     */
    bg_inset: "#010409",
    /** Strong emphasis backgrounds (accent) */
    bg_emphasis: "#0969da",

    // Foreground colors
    /** Primary text color - Near white */
    fg_default: "#f0f6fc",
    /** Secondary text, reduced emphasis */
    fg_muted: "#8b949e",
    /** Tertiary text, minimal emphasis */
    fg_subtle: "#6e7681",
    /** Text on emphasis backgrounds */
    fg_onEmphasis: "#0d1117",

    // Semantic colors - Accent (Links, selections)
    /** Links, interactive elements - Lighter blue for dark bg */
    fg_accent: "#58a6ff",
    /** Link hover state (brighter blue for dark mode - maintains visibility) */
    fg_accent_hover: "#79c0ff",
    /** Primary action button background */
    bg_success: "#238636",
    /** Success button hover */
    bg_success_hover: "#2ea043",

    // Semantic colors - Danger (Destructive actions)
    /** Error/danger text - Lighter red for dark bg */
    fg_danger: "#f85149",
    /** Destructive action button */
    bg_danger: "#da3633",
    /** Danger button hover */
    bg_danger_hover: "#e5534b",

    // Border colors
    /** Primary borders, dividers */
    border_default: "#30363d",
    /** Subtle borders (translucent) */
    border_muted: "#30363d66",
    /** Strong borders, emphasis (borderColor-emphasis - official Primer) */
    border_emphasis: "#656c76",

    // Button colors
    /** Secondary button background */
    bg_button_secondary: "#21262d",
    /** Secondary button hover */
    bg_button_secondary_hover: "#30363d",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type GitHubPaletteColorLight = keyof typeof githubPaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type GitHubPaletteColorDark = keyof typeof githubPaletteDark;
