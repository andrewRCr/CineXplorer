/**
 * Tangere-Terminal Color Palette
 *
 * Color palette from the tangere-terminal theme by François Tonneau.
 * Source: https://github.com/ftonneau/tangere-terminal
 * License: MIT
 *
 * Design philosophy: Uses complementary color pairs (cool: green/blue/cyan vs warm: yellow/red/purple)
 * with high contrast ratios. Mean saturation 64%. Avoids equal HSV spacing for sophisticated restraint.
 * All values verified from official repository (2025-11-02).
 *
 * Semantic mappings derived from Vim colorscheme analysis:
 * - Color 1 (red): Errors, critical issues
 * - Color 2 (green): Functions, statements, visual selection
 * - Color 3 (yellow): Search highlights, warnings
 * - Color 4 (blue): Keywords, comments (light mode), statements (dark mode)
 * - Color 5 (purple): Selections, todo items
 * - Color 6 (cyan): Types, constants, prompts
 * - Color 11 (bright yellow): Strings, special content
 */

/**
 * Tangere-Terminal color palette - Light Mode
 *
 * Background: #fdfdfa (warm white, V=99%)
 * Foreground: #000000 (pure black)
 * Design note: Colors are darker (V=45%) for contrast against light background.
 * Bright variants (9-14) are darker than base colors for readability.
 */
export const tangerePaletteLight = {
	// Base colors
	/** Page background - warm white */
	bg_default: "#fdfdfa",
	/** Pure white for cards/elevated surfaces (color 0) */
	bg_muted: "#ffffff",
	/** Light gray for subtle surfaces (color 15) */
	bg_inset: "#d1d1d1",
	/** Medium gray for emphasis (color 8) */
	bg_emphasis: "#686868",

	// Foreground colors
	/** Primary text - pure black */
	fg_default: "#000000",
	/** Secondary text - dark gray (color 7) */
	fg_muted: "#898e99",
	/** Tertiary/subtle text - medium gray (color 8) */
	fg_subtle: "#686868",
	/** Text on colored backgrounds - pure black */
	fg_onEmphasis: "#000000",

	// Semantic colors - Accent (Links, interactive)
	/** Links, interactive elements - blue (color 4) */
	fg_accent: "#223355",
	/** Success/functions - teal (color 2) */
	/** Link hover state (darker - more emphasis) */
	fg_accent_hover: "#1a2844",
	bg_success: "#004c73",
	/** Success hover - darker teal (color 14) */
	bg_success_hover: "#002a40",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text - red (color 1) */
	fg_danger: "#9c341f",
	/** Destructive action button - red (color 1) */
	bg_danger: "#9c341f",
	/** Danger hover - same red (color 9 = color 1) */
	bg_danger_hover: "#9c341f",

	// Border colors
	/** Primary borders - medium gray (color 7) */
	border_default: "#898e99",
	/** Subtle borders - light gray (color 6) */
	border_muted: "#4b5363",

	// Button colors
	/** Secondary button - light gray surface */
	bg_button_secondary: "#d1d1d1",
	/** Secondary button hover - medium gray */
	bg_button_secondary_hover: "#898e99",

	// Interactive states
	/** Interactive hover - darker blue (color 12) */
	bg_accent_hover: "#223355",
	/** Interactive active - darkest blue */
	bg_accent_active: "#223355",

	// Additional status colors
	/** Warning state - brown/orange (color 3) */
	fg_warning: "#805619",
	/** Info state - blue (color 4) */
	fg_info: "#223355",

	// ===================================================================
	// EXTENDED COLORS (CineXplorer Extensions)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display - golden brown (adapted from color 3) */
	fg_rating: "#805619",

	// Special content colors
	/** Strings, special content - dark yellow (color 11) */
	fg_string: "#40290a",
	/** Selection background - purple (color 5) */
	bg_selection: "#663d52",
} as const;

/**
 * Tangere-Terminal color palette - Dark Mode
 *
 * Background: #1a2938 (blueish gray, V=22% - brighter than typical dark themes)
 * Foreground: #fdfdd9 (yellowish white)
 * Design note: Colors are brighter (V>70%) for contrast against dark background.
 * Bright variants (9-14) are brighter than base colors.
 */
export const tangerePaletteDark = {
	// Base colors
	/** Page background - blueish dark gray */
	bg_default: "#1a2938",
	/** Pure black for recessed surfaces (color 0) */
	bg_muted: "#000000",
	/** Elevated surface - lighter gray (color 15) */
	bg_inset: "#2f4656",
	/** Medium emphasis - gray (color 8) */
	bg_emphasis: "#b3b3b3",

	// Foreground colors
	/** Primary text - yellowish white */
	fg_default: "#fdfdd9",
	/** Secondary text - light gray (color 7) */
	fg_muted: "#e6e4d3",
	/** Tertiary/subtle text - medium gray (color 8) */
	fg_subtle: "#b3b3b3",
	/** Text on colored backgrounds - pure black */
	fg_onEmphasis: "#000000",

	// Semantic colors - Accent (Links, interactive)
	/** Links, interactive elements - light blue (color 4) */
	fg_accent: "#8fb4cd",
	/** Success/statements - teal (color 2) */
	/** Link hover state (brighter for dark mode visibility) */
	fg_accent_hover: "#aed5f1",
	bg_success: "#6dafb5",
	/** Success hover - brighter teal (color 10) */
	bg_success_hover: "#6dafb5",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text - salmon/coral (color 1) */
	fg_danger: "#f2826d",
	/** Destructive action button - salmon (color 1) */
	bg_danger: "#f2826d",
	/** Danger hover - same salmon (color 9 = color 1) */
	bg_danger_hover: "#f2826d",

	// Border colors
	/** Primary borders - medium light gray (color 6) */
	border_default: "#b2babf",
	/** Subtle borders - darker gray (color 15) */
	border_muted: "#2f4656",

	// Button colors
	/** Secondary button - dark gray surface */
	bg_button_secondary: "#2f4656",
	/** Secondary button hover - lighter gray */
	bg_button_secondary_hover: "#b2babf",

	// Interactive states
	/** Interactive hover - brighter blue (color 12) */
	bg_accent_hover: "#8fb4cd",
	/** Interactive active - bright cyan (color 14) */
	bg_accent_active: "#a9c9cc",

	// Additional status colors
	/** Warning state - golden yellow (color 3) */
	fg_warning: "#e0ba70",
	/** Info state - light blue (color 4) */
	fg_info: "#8fb4cd",

	// ===================================================================
	// EXTENDED COLORS (CineXplorer Extensions)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display - golden yellow (uses color 3 for consistency) */
	fg_rating: "#e0ba70",

	// Special content colors
	/** Strings, special content - bright yellow (color 11) */
	fg_string: "#ffdd99",
	/** Selection background - purple (color 5) */
	bg_selection: "#bb98d9",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type TangerePaletteColorLight = keyof typeof tangerePaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type TangerePaletteColorDark = keyof typeof tangerePaletteDark;
