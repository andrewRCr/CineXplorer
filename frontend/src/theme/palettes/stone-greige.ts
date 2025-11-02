/**
 * Stone & Greige Color Palette
 *
 * A minimal, architectural palette inspired by natural stone and greige tones.
 * Uses warm grays ("greige") and a high-contrast dark color for primary actions, giving it a very bold, confident feel.
 *
 * Light mode: Cool stone whites with warm greige accents
 * Dark mode: Deep warm blacks with light stone accents
 */

/**
 * Stone & Greige color palette - Light Mode
 *
 * Features cool stone whites with subtle warm undertones and darker greige for accents.
 * Creates sophisticated, minimal aesthetic with architectural precision.
 */
export const stoneGreigePaletteLight = {
	// Base colors
	/** Primary page background - cool stone white */
	bg_default: "#F5F5F4",
	/** Card/elevated surface - same as background for flat design */
	bg_muted: "#F5F5F4",
	/** Popover background - cool stone white */
	bg_inset: "#F5F5F4",
	/** Secondary surface - light greige */
	bg_emphasis: "#EBEBEA",

	// Foreground colors
	/** Primary text - dark warm brown */
	fg_default: "#292524",
	/** Secondary text - medium warm gray */
	fg_muted: "#78716C",
	/** Tertiary/subtle text - lighter warm gray */
	fg_subtle: "#A8A29E",
	/** Text on colored backgrounds - white */
	fg_onEmphasis: "#FFFFFF",

	// Semantic colors - Accent (Links, interactive)
	/** Primary accent - dark greige */
	fg_accent: "#44403C",
	/** Primary action button - dark greige */
	bg_success: "#44403C",
	/** Success hover - darker greige */
	bg_success_hover: "#292524",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text and button - muted red */
	fg_danger: "#A22C2C",
	/** Destructive action button */
	bg_danger: "#A22C2C",
	/** Danger hover - darker red */
	bg_danger_hover: "#8B2626",

	// Border colors
	/** Primary borders - light stone gray */
	border_default: "#D6D6D4",
	/** Input borders - same as border */
	border_muted: "#D6D6D4",

	// Button colors
	/** Secondary button - light greige */
	bg_button_secondary: "#EBEBEA",
	/** Secondary button hover - medium stone */
	bg_button_secondary_hover: "#D6D6D4",

	// Interactive states
	/** Primary hover - dark greige */
	bg_accent_hover: "#44403C",
	/** Primary active - darkest greige */
	bg_accent_active: "#292524",

	// Additional semantic colors
	/** Warning state - amber tone */
	fg_warning: "#D97706",
	/** Info state - uses dark greige */
	fg_info: "#44403C",
} as const;

/**
 * Stone & Greige color palette - Dark Mode
 *
 * Features deep warm blacks with light stone accents. Inverts the light mode
 * relationship while maintaining architectural minimalism.
 */
export const stoneGreigePaletteDark = {
	// Base colors
	/** Primary page background - deep warm black */
	bg_default: "#1A1918",
	/** Card/elevated surface - slightly lighter warm black */
	bg_muted: "#1E1D1C",
	/** Popover background - same as card */
	bg_inset: "#1E1D1C",
	/** Secondary surface - dark greige */
	bg_emphasis: "#262524",

	// Foreground colors
	/** Primary text - light stone */
	fg_default: "#E7E6E5",
	/** Secondary text - medium warm gray */
	fg_muted: "#948D88",
	/** Tertiary/subtle text - darker warm gray */
	fg_subtle: "#78716C",
	/** Text on light backgrounds - dark brown */
	fg_onEmphasis: "#292524",

	// Semantic colors - Accent (Links, interactive)
	/** Primary accent - light stone (inverted from light mode) */
	fg_accent: "#F5F5F4",
	/** Primary action button - light stone */
	bg_success: "#F5F5F4",
	/** Success hover - slightly darker stone */
	bg_success_hover: "#E7E6E5",

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
	/** Secondary button - dark greige */
	bg_button_secondary: "#262524",
	/** Secondary button hover - slightly lighter */
	bg_button_secondary_hover: "#333230",

	// Interactive states
	/** Primary hover - light stone */
	bg_accent_hover: "#F5F5F4",
	/** Primary active - brightest stone */
	bg_accent_active: "#FFFFFF",

	// Additional semantic colors
	/** Warning state - amber tone */
	fg_warning: "#F59E0B",
	/** Info state - uses light stone */
	fg_info: "#F5F5F4",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type StoneGreigePaletteColorLight = keyof typeof stoneGreigePaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type StoneGreigePaletteColorDark = keyof typeof stoneGreigePaletteDark;
