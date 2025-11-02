/**
 * IBM Carbon Design System Color Palette
 *
 * Official IBM Carbon Design System colors for light and dark modes.
 * Source: https://carbondesignsystem.com/guidelines/color/overview/
 *
 * All values verified from official Carbon v10.7.0 design tokens (2025-11-02).
 * Carbon uses a 3-layer system with semantic token names that map to the IBM Design Language color scale.
 */

/**
 * IBM Carbon color palette - Light Mode (White Theme)
 *
 * Organized by semantic function following Carbon's token structure.
 * Values are official hex colors from IBM Carbon Design System v10.
 */
export const ibmCarbonPaletteLight = {
	// Base colors
	/** Primary page background - Pure white */
	bg_default: "#ffffff",
	/** Cards, panels, first layer (ui-01) */
	bg_muted: "#f4f4f4",
	/** Elevated surfaces, second layer (ui-02) - uses white */
	bg_inset: "#ffffff",
	/** Selected state backgrounds */
	bg_emphasis: "#e0e0e0",

	// Foreground colors
	/** Primary text color (text-01) - Near black */
	fg_default: "#161616",
	/** Secondary text, reduced emphasis (text-02) */
	fg_muted: "#525252",
	/** Tertiary text, minimal emphasis (text-03) */
	fg_subtle: "#a8a8a8",
	/** Text on emphasis backgrounds - white for contrast */
	fg_onEmphasis: "#ffffff",

	// Semantic colors - Accent (Links, interactive)
	/** Links, primary interactive (interactive-01, blue-60) */
	fg_accent: "#0f62fe",
	/** Primary action button background */
	bg_success: "#24a148",
	/** Success button hover - darker green */
	bg_success_hover: "#1f8139",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text (support-01) */
	fg_danger: "#da1e28",
	/** Destructive action button */
	bg_danger: "#da1e28",
	/** Danger button hover (hover-danger) */
	bg_danger_hover: "#ba1b23",

	// Border colors
	/** Primary borders, dividers (ui-03) */
	border_default: "#e0e0e0",
	/** Strong borders (ui-04) */
	border_muted: "#8d8d8d",

	// Button colors
	/** Secondary button background (interactive-02) */
	bg_button_secondary: "#393939",
	/** Secondary button hover (hover-secondary) */
	bg_button_secondary_hover: "#4c4c4c",

	// Interactive states
	/** Primary hover state (hover-primary, blue-70) */
	bg_accent_hover: "#0353e9",
	/** Primary active state (active-primary, blue-80) */
	bg_accent_active: "#002d9c",

	// Additional status colors (OFFICIAL Carbon)
	/** Warning state (support-03) - OFFICIAL Carbon color */
	fg_warning: "#f1c21b",
	/** Info state (support-04) - OFFICIAL Carbon color */
	fg_info: "#0043ce",

	// ===================================================================
	// EXTENDED COLORS (Adapted for CineXplorer - Not Official Carbon)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display (ADAPTED - IMDb gold adjusted for Carbon's professional aesthetic) */
	fg_rating: "#d4a518",
} as const;

/**
 * IBM Carbon color palette - Dark Mode (G100 Theme)
 *
 * Uses Carbon's darkest theme (g100) with inverted scale for proper depth hierarchy.
 * Maintains IBM's strict accessibility standards (WCAG AA).
 */
export const ibmCarbonPaletteDark = {
	// Base colors
	/** Primary page background - Near black (gray-100) */
	bg_default: "#161616",
	/** Cards, panels, first layer (ui-01, gray-90) */
	bg_muted: "#262626",
	/** Elevated surfaces, second layer (ui-02, gray-80) */
	bg_inset: "#393939",
	/** Selected state backgrounds */
	bg_emphasis: "#393939",

	// Foreground colors
	/** Primary text color (text-01) - Near white */
	fg_default: "#f4f4f4",
	/** Secondary text, reduced emphasis (text-02) */
	fg_muted: "#c6c6c6",
	/** Tertiary text, minimal emphasis (text-03) */
	fg_subtle: "#6f6f6f",
	/** Text on emphasis backgrounds - black for contrast */
	fg_onEmphasis: "#161616",

	// Semantic colors - Accent (Links, interactive)
	/** Links in dark mode (link-01, blue-40) - lighter for contrast */
	fg_accent: "#78a9ff",
	/** Primary action button background (blue-60 - same as light) */
	bg_success: "#42be65",
	/** Success button hover - brighter green for dark bg */
	bg_success_hover: "#24a148",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text (support-01 dark) - lighter red */
	fg_danger: "#fa4d56",
	/** Destructive action button */
	bg_danger: "#fa4d56",
	/** Danger button hover (hover-danger) */
	bg_danger_hover: "#ba1b23",

	// Border colors
	/** Primary borders, dividers (ui-03) */
	border_default: "#393939",
	/** Strong borders (ui-04) */
	border_muted: "#6f6f6f",

	// Button colors
	/** Secondary button background (interactive-02) */
	bg_button_secondary: "#6f6f6f",
	/** Secondary button hover (hover-secondary) */
	bg_button_secondary_hover: "#606060",

	// Interactive states
	/** Primary hover state (hover-primary, blue-70) */
	bg_accent_hover: "#0353e9",
	/** Primary active state (active-primary, blue-80) */
	bg_accent_active: "#002d9c",

	// Additional status colors (OFFICIAL Carbon)
	/** Warning state (support-03) - OFFICIAL Carbon color (same in dark) */
	fg_warning: "#f1c21b",
	/** Info state (support-04, blue-50) - OFFICIAL Carbon color (lighter blue for dark) */
	fg_info: "#4589ff",

	// ===================================================================
	// EXTENDED COLORS (Adapted for CineXplorer - Not Official Carbon)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display (ADAPTED - reuses Carbon yellow for consistency in dark mode) */
	fg_rating: "#f1c21b",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type IBMCarbonPaletteColorLight = keyof typeof ibmCarbonPaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type IBMCarbonPaletteColorDark = keyof typeof ibmCarbonPaletteDark;
