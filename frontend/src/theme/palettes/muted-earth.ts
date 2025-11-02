/**
 * Muted Earth Color Palette
 *
 * A warm, grounded palette featuring creamy linen backgrounds and muted terracotta/rust accents.
 * Designed for human-centered, organic aesthetic with natural warmth and approachability.
 *
 * Light mode: Creamy linen backgrounds with terracotta accents
 * Dark mode: Deep warm blacks with consistent terracotta accents
 */

/**
 * Muted Earth color palette - Light Mode
 *
 * Features creamy linen backgrounds with warm terracotta/rust as primary accent.
 * Creates grounded, human-centered aesthetic with natural warmth.
 */
export const mutedEarthPaletteLight = {
	// Base colors
	/** Primary page background - creamy linen */
	bg_default: "#FAF7F2",
	/** Card/elevated surface - same as background for flat design */
	bg_muted: "#FAF7F2",
	/** Popover background - creamy linen */
	bg_inset: "#FAF7F2",
	/** Secondary surface - lighter warm beige */
	bg_emphasis: "#F3EFE9",

	// Foreground colors
	/** Primary text - dark warm brown */
	fg_default: "#433D37",
	/** Secondary text - medium warm gray */
	fg_muted: "#7D746C",
	/** Tertiary/subtle text - lighter warm gray */
	fg_subtle: "#A39990",
	/** Text on colored backgrounds - white */
	fg_onEmphasis: "#FFFFFF",

	// Semantic colors - Accent (Links, interactive)
	/** Primary terracotta/rust accent */
	fg_accent: "#B95C50",
	/** Primary action button - terracotta */
	bg_success: "#B95C50",
	/** Success hover - darker terracotta */
	bg_success_hover: "#A54D42",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text and button - muted red */
	fg_danger: "#A22C2C",
	/** Destructive action button */
	bg_danger: "#A22C2C",
	/** Danger hover - darker red */
	bg_danger_hover: "#8B2626",

	// Border colors
	/** Primary borders - warm beige */
	border_default: "#EAE3D9",
	/** Input borders - same as border */
	border_muted: "#EAE3D9",

	// Button colors
	/** Secondary button - light warm beige */
	bg_button_secondary: "#F3EFE9",
	/** Secondary button hover - medium beige */
	bg_button_secondary_hover: "#EAE3D9",

	// Interactive states
	/** Primary hover - terracotta */
	bg_accent_hover: "#B95C50",
	/** Primary active - darker terracotta */
	bg_accent_active: "#A54D42",

	// Additional semantic colors
	/** Warning state - amber tone */
	fg_warning: "#D97706",
	/** Info state - uses terracotta */
	fg_info: "#B95C50",
} as const;

/**
 * Muted Earth color palette - Dark Mode
 *
 * Features deep warm blacks with consistent terracotta accent.
 * Maintains warm, grounded feel in dark environment.
 */
export const mutedEarthPaletteDark = {
	// Base colors
	/** Primary page background - deep warm black */
	bg_default: "#1A1918",
	/** Card/elevated surface - slightly lighter warm black */
	bg_muted: "#1E1D1C",
	/** Popover background - same as card */
	bg_inset: "#1E1D1C",
	/** Secondary surface - dark warm gray */
	bg_emphasis: "#262524",

	// Foreground colors
	/** Primary text - warm light beige */
	fg_default: "#E3E1DE",
	/** Secondary text - medium warm gray */
	fg_muted: "#938D87",
	/** Tertiary/subtle text - darker warm gray */
	fg_subtle: "#7D746C",
	/** Text on colored backgrounds - white */
	fg_onEmphasis: "#FFFFFF",

	// Semantic colors - Accent (Links, interactive)
	/** Primary terracotta/rust accent - same as light mode */
	fg_accent: "#B95C50",
	/** Primary action button - terracotta */
	bg_success: "#B95C50",
	/** Success hover - brighter terracotta */
	bg_success_hover: "#C76A5E",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text and button - lighter red for dark bg */
	fg_danger: "#C33B3B",
	/** Destructive action button */
	bg_danger: "#C33B3B",
	/** Danger hover - brighter red */
	bg_danger_hover: "#D44848",

	// Border colors
	/** Primary borders - dark warm gray */
	border_default: "#333230",
	/** Input borders - same as border */
	border_muted: "#333230",

	// Button colors
	/** Secondary button - dark warm gray */
	bg_button_secondary: "#262524",
	/** Secondary button hover - slightly lighter */
	bg_button_secondary_hover: "#333230",

	// Interactive states
	/** Primary hover - terracotta */
	bg_accent_hover: "#B95C50",
	/** Primary active - brighter terracotta */
	bg_accent_active: "#C76A5E",

	// Additional semantic colors
	/** Warning state - amber tone */
	fg_warning: "#F59E0B",
	/** Info state - uses terracotta */
	fg_info: "#B95C50",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type MutedEarthPaletteColorLight = keyof typeof mutedEarthPaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type MutedEarthPaletteColorDark = keyof typeof mutedEarthPaletteDark;
