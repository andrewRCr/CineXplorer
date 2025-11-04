/**
 * IBM Carbon Design System Color Palette
 *
 * Official IBM Carbon Design System colors for light and dark modes.
 * Source: https://carbondesignsystem.com/guidelines/color/overview/
 * Package: @carbon/themes v11.0.0
 *
 * All values verified from official Carbon v11.0.0 design tokens.
 * Carbon uses a 3-layer system with semantic token names that map to the IBM Design Language color scale.
 *
 * **IMPORTANT:** This file contains ONLY official Carbon tokens.
 * CineXplorer-specific extensions (rating colors, custom semantics) are in adapter/extensions.ts.
 */

/**
 * IBM Carbon color palette - Light Mode (White Theme)
 *
 * Organized by semantic function following Carbon's token structure.
 * Values are official hex colors from IBM Carbon Design System v10.
 */
export const ibmCarbonPaletteLight = {
	// Base colors - Layer System
	/** Primary page background - Pure white (background) */
	bg_default: "#ffffff",
	/** First layer - Cards, panels (layer-01, gray-10) */
	bg_layer_01: "#f4f4f4",
	/** Second layer - Modals, elevated surfaces (layer-02, alternates to white) */
	bg_layer_02: "#ffffff",
	/** Third layer - Highest elevation, dropdowns over modals (layer-03, gray-10) */
	bg_layer_03: "#f4f4f4",

	// Legacy aliases (deprecated - use bg_layer_* tokens)
	/** @deprecated Use bg_layer_01 */
	bg_muted: "#f4f4f4",
	/** @deprecated Use bg_layer_02 */
	bg_inset: "#ffffff",

	/** Selected state backgrounds */
	bg_emphasis: "#e0e0e0",
	/** Field/layer hover state (field-01-hover, gray10Hover) */
	bg_field_hover: "#e8e8e8",

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
	/** Link hover state (blue-70 - darker/more saturated, official Carbon hover) */
	fg_accent_hover: "#0353e9",
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

	// Border colors - Hierarchy
	/** Subtle borders on background/layer-01 (border-subtle-00, gray-20) */
	border_subtle_00: "#e0e0e0",
	/** Subtle borders on layer-02 (border-subtle-02, gray-20) */
	border_subtle_02: "#e0e0e0",
	/** Strong borders on layer-01 (border-strong-01, gray-50) */
	border_strong_01: "#8d8d8d",
	/** Strong borders on layer-02 (border-strong-02, gray-50) */
	border_strong_02: "#8d8d8d",
	/** Strong borders on layer-03 (border-strong-03, gray-50) */
	border_strong_03: "#8d8d8d",

	// Legacy aliases (deprecated - use border hierarchy tokens)
	/** @deprecated Use border_subtle_00 */
	border_default: "#e0e0e0",
	/** @deprecated Use border_strong_01/02/03 */
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
} as const;

/**
 * IBM Carbon color palette - Dark Mode (G100 Theme)
 *
 * Uses Carbon's darkest theme (g100) with inverted scale for proper depth hierarchy.
 * Maintains IBM's strict accessibility standards (WCAG AA).
 */
export const ibmCarbonPaletteDark = {
	// Base colors - Layer System
	/** Primary page background - Near black (background, gray-100) */
	bg_default: "#161616",
	/** First layer - Cards, panels (layer-01, gray-90) */
	bg_layer_01: "#262626",
	/** Second layer - Modals, elevated surfaces (layer-02, gray-80) */
	bg_layer_02: "#393939",
	/** Third layer - Highest elevation, dropdowns over modals (layer-03, gray-70) */
	bg_layer_03: "#525252",

	// Legacy aliases (deprecated - use bg_layer_* tokens)
	/** @deprecated Use bg_layer_01 */
	bg_muted: "#262626",
	/** @deprecated Use bg_layer_02 */
	bg_inset: "#393939",

	/** Selected state backgrounds */
	bg_emphasis: "#393939",
	/** Field/layer hover state (field-01-hover, gray90Hover) */
	bg_field_hover: "#333333",

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
	/** Link hover state (blue-30 - brighter for dark mode visibility) */
	fg_accent_hover: "#a6c8ff",
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

	// Border colors - Hierarchy (CRITICAL FIX: #393939 borders invisible on layer-02!)
	/** Subtle borders on background/layer-01 (border-subtle-00, gray-80) */
	border_subtle_00: "#393939",
	/** Subtle borders on layer-02 (border-subtle-02, gray-70) */
	border_subtle_02: "#525252",
	/** Strong borders on layer-01 (border-strong-01, gray-60) - VISIBLE on #262626 */
	border_strong_01: "#6f6f6f",
	/** Strong borders on layer-02 (border-strong-02, gray-50) - VISIBLE on #393939 */
	border_strong_02: "#8d8d8d",
	/** Strong borders on layer-03 (border-strong-03, gray-40) - VISIBLE on #525252 */
	border_strong_03: "#a8a8a8",

	// Legacy aliases (deprecated - use border hierarchy tokens)
	/** @deprecated Use border_subtle_00 */
	border_default: "#393939",
	/** @deprecated Use border_strong_01 */
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
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type IBMCarbonPaletteColorLight = keyof typeof ibmCarbonPaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type IBMCarbonPaletteColorDark = keyof typeof ibmCarbonPaletteDark;
