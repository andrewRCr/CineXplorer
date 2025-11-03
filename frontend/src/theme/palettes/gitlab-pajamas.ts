/**
 * GitLab Pajamas Design System Color Palette
 *
 * Official GitLab Pajamas design system colors for light and dark modes.
 * Source: https://design.gitlab.com/product-foundations/color/
 *
 * All values verified from @gitlab/ui design tokens (2025-11-02).
 * GitLab uses semantic tokens that map to constant color scales (neutral, blue, orange, etc.).
 */

/**
 * GitLab Pajamas color palette - Light Mode
 *
 * Organized by semantic function following GitLab's token structure.
 * Values are official hex colors from GitLab Pajamas design system.
 * Note: GitLab's primary interactive color is blue, not orange (orange used for warnings).
 */
export const gitlabPajamasPaletteLight = {
	// Base colors
	/** Primary page background - Pure white (neutral-0) */
	bg_default: "#ffffff",
	/** Cards, panels, subtle backgrounds (neutral-10) */
	bg_muted: "#fbfafd",
	/** Section backgrounds, elevated surfaces (neutral-10) */
	bg_inset: "#fbfafd",
	/** Strong emphasis backgrounds (neutral-50) */
	bg_emphasis: "#ececef",
	/** Action hover background (neutral-300 @ 16% opacity over white) */
	bg_field_hover: "#f0f0f1",

	// Foreground colors
	/** Primary text color (neutral-800) */
	fg_default: "#3a383f",
	/** Secondary text, reduced emphasis (neutral-600) */
	fg_muted: "#626168",
	/** Tertiary text, minimal emphasis (neutral-300) */
	fg_subtle: "#a4a3a8",
	/** Text on emphasis backgrounds - white for contrast */
	fg_onEmphasis: "#ffffff",

	// Semantic colors - Accent (Links, interactive)
	/** Links, primary interactive (blue-700) */
	fg_accent: "#2f5ca0",
	/** Link hover state (darker/more saturated blue - GitLab blue-700) */
	fg_accent_hover: "#1f4787",
	/** Primary action button background (green-500) */
	bg_success: "#108548",
	/** Success button hover - darker green */
	bg_success_hover: "#0d6938",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text (red-600) */
	fg_danger: "#c02f12",
	/** Destructive action button */
	bg_danger: "#c02f12",
	/** Danger button hover - darker red */
	bg_danger_hover: "#a02911",

	// Border colors
	/** Primary borders, dividers (neutral-100) */
	border_default: "#dcdcde",
	/** Subtle borders (neutral-50) */
	border_muted: "#ececef",

	// Button colors
	/** Secondary button background (neutral-0 with borders) */
	bg_button_secondary: "#ffffff",
	/** Secondary button hover (neutral-10) */
	bg_button_secondary_hover: "#fbfafd",

	// Interactive states
	/** Interactive button background (blue-500) */
	bg_accent_hover: "#1f75cb",
	/** Interactive button active (blue-600) */
	bg_accent_active: "#2f68b4",

	// Additional status colors (OFFICIAL GitLab Pajamas)
	/** Warning state (orange-600) - OFFICIAL GitLab color (distinctive orange) */
	fg_warning: "#995715",
	/** Info state (blue-500) - OFFICIAL GitLab color */
	fg_info: "#1f75cb",

	// ===================================================================
	// EXTENDED COLORS (Adapted for CineXplorer - Not Official Pajamas)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display (ADAPTED - IMDb gold adapted for GitLab's clean aesthetic) */
	fg_rating: "#c17d10",

	// Special surfaces
	/** Strong text/headings (neutral-950) */
	fg_strong: "#18171d",
} as const;

/**
 * GitLab Pajamas color palette - Dark Mode
 *
 * Uses lighter color steps from the same constant scales for proper contrast.
 * GitLab treats dark mode as "dimming the lights" with natural depth hierarchy.
 */
export const gitlabPajamasPaletteDark = {
	// Base colors
	/** Primary page background - Near black (neutral-950) */
	bg_default: "#18171d",
	/** Cards, panels, subtle backgrounds (neutral-900) */
	bg_muted: "#28272d",
	/** Section backgrounds, elevated surfaces (neutral-800) */
	bg_inset: "#3a383f",
	/** Strong emphasis backgrounds (neutral-800) */
	bg_emphasis: "#3a383f",
	/** Action hover background (neutral-400 @ 40% opacity over neutral-900) */
	bg_field_hover: "#4f4e53",

	// Foreground colors
	/** Primary text color (neutral-50) */
	fg_default: "#ececef",
	/** Secondary text, reduced emphasis (neutral-200) */
	fg_muted: "#bfbfc3",
	/** Tertiary text, minimal emphasis (neutral-400) */
	fg_subtle: "#89888d",
	/** Text on emphasis backgrounds - near black for contrast */
	fg_onEmphasis: "#18171d",

	// Semantic colors - Accent (Links, interactive)
	/** Links in dark mode (blue-200) - lighter for contrast */
	fg_accent: "#9dc7f1",
	/** Link hover state (brighter blue for dark mode) */
	fg_accent_hover: "#c6e2ff",
	/** Primary action button background (green-300) */
	bg_success: "#52b87a",
	/** Success button hover - brighter green */
	bg_success_hover: "#91d4a8",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text (red-400) - lighter red for dark bg */
	fg_danger: "#ec5941",
	/** Destructive action button */
	bg_danger: "#ec5941",
	/** Danger button hover - lighter red */
	bg_danger_hover: "#f6806d",

	// Border colors
	/** Primary borders, dividers (neutral-700) */
	border_default: "#4c4b51",
	/** Subtle borders (neutral-800) */
	border_muted: "#3a383f",

	// Button colors
	/** Secondary button background (neutral-900) */
	bg_button_secondary: "#28272d",
	/** Secondary button hover (neutral-800) */
	bg_button_secondary_hover: "#3a383f",

	// Interactive states
	/** Interactive button background (blue-300) */
	bg_accent_hover: "#63a6e9",
	/** Interactive button active (blue-400) */
	bg_accent_active: "#428fdc",

	// Additional status colors (OFFICIAL GitLab Pajamas)
	/** Warning state (orange-300) - OFFICIAL GitLab color (lighter for dark bg) */
	fg_warning: "#d99530",
	/** Info state (blue-300) - OFFICIAL GitLab color */
	fg_info: "#63a6e9",

	// ===================================================================
	// EXTENDED COLORS (Adapted for CineXplorer - Not Official Pajamas)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display (ADAPTED - IMDb gold adjusted for dark mode) */
	fg_rating: "#f5c518",

	// Special surfaces
	/** Strong text/headings (neutral-0) */
	fg_strong: "#ffffff",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type GitLabPajamasPaletteColorLight = keyof typeof gitlabPajamasPaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type GitLabPajamasPaletteColorDark = keyof typeof gitlabPajamasPaletteDark;
