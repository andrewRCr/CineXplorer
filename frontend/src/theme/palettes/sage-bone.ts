/**
 * Sage & Bone Color Palette
 *
 * A calm, nature-inspired palette featuring soft sage green and warm bone whites.
 * Designed for minimal distraction with gentle contrast and organic warmth.
 *
 * Light mode: Warm off-white backgrounds with soft sage accents
 * Dark mode: Deep charcoal with consistent sage green accents
 */

/**
 * Sage & Bone color palette - Light Mode
 *
 * Features warm bone whites (slight yellow tint) with soft sage green as primary accent.
 * Creates a gentle, organic aesthetic with low saturation for reduced eye strain.
 */
export const sageBonePaletteLight = {
	// Base colors
	/** Primary page background - warm bone white */
	bg_default: "#F9F9F7",
	/** Card/elevated surface - same as background for flat design */
	bg_muted: "#F9F9F7",
	/** Popover background - warm bone white */
	bg_inset: "#F9F9F7",
	/** Secondary surface - slightly darker bone */
	bg_emphasis: "#F0F0EE",

	// Foreground colors
	/** Primary text - dark charcoal */
	fg_default: "#3A3D40",
	/** Secondary text - medium gray */
	fg_muted: "#6B7280",
	/** Tertiary/subtle text - lighter gray */
	fg_subtle: "#888B8F",
	/** Text on colored backgrounds - white */
	fg_onEmphasis: "#FFFFFF",

	// Semantic colors - Accent (Links, interactive)
	/** Primary sage green accent */
	fg_accent: "#819981",
	/** Primary action button - sage green */
	bg_success: "#819981",
	/** Success hover - slightly darker sage */
	bg_success_hover: "#6F876F",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text and button - red */
	fg_danger: "#B91C1C",
	/** Destructive action button */
	bg_danger: "#B91C1C",
	/** Danger hover - slightly darker red */
	bg_danger_hover: "#991B1B",

	// Border colors
	/** Primary borders - light warm gray */
	border_default: "#E3E3E0",
	/** Input borders - same as border */
	border_muted: "#E3E3E0",

	// Button colors
	/** Secondary button - bone surface */
	bg_button_secondary: "#F0F0EE",
	/** Secondary button hover - slightly darker */
	bg_button_secondary_hover: "#E3E3E0",

	// Interactive states
	/** Primary hover - sage green */
	bg_accent_hover: "#819981",
	/** Primary active - darker sage */
	bg_accent_active: "#6F876F",

	// Additional semantic colors
	/** Warning state - amber/orange tone */
	fg_warning: "#D97706",
	/** Info state - uses sage green */
	fg_info: "#819981",

	// ===================================================================
	// EXTENDED COLORS (CineXplorer Extensions)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display - warm golden tone (reuses warning amber) */
	fg_rating: "#D97706",
} as const;

/**
 * Sage & Bone color palette - Dark Mode
 *
 * Features deep charcoal backgrounds with the same soft sage green accent.
 * Maintains warm, organic feel while providing comfortable dark environment.
 */
export const sageBonePaletteDark = {
	// Base colors
	/** Primary page background - deep charcoal */
	bg_default: "#18191A",
	/** Card/elevated surface - slightly lighter charcoal */
	bg_muted: "#1D1E1F",
	/** Popover background - same as card */
	bg_inset: "#1D1E1F",
	/** Secondary surface - medium charcoal */
	bg_emphasis: "#242526",

	// Foreground colors
	/** Primary text - warm off-white */
	fg_default: "#E4E4E3",
	/** Secondary text - medium gray */
	fg_muted: "#888B8F",
	/** Tertiary/subtle text - darker gray */
	fg_subtle: "#6B7280",
	/** Text on colored backgrounds - white */
	fg_onEmphasis: "#FFFFFF",

	// Semantic colors - Accent (Links, interactive)
	/** Primary sage green accent - same as light mode */
	fg_accent: "#819981",
	/** Primary action button - sage green */
	bg_success: "#819981",
	/** Success hover - slightly brighter sage */
	bg_success_hover: "#93AB93",

	// Semantic colors - Danger (Destructive actions)
	/** Error/danger text and button - lighter red for dark bg */
	fg_danger: "#CB3E3E",
	/** Destructive action button */
	bg_danger: "#CB3E3E",
	/** Danger hover - slightly brighter red */
	bg_danger_hover: "#DC4C4C",

	// Border colors
	/** Primary borders - dark gray */
	border_default: "#303133",
	/** Input borders - same as border */
	border_muted: "#303133",

	// Button colors
	/** Secondary button - charcoal surface */
	bg_button_secondary: "#242526",
	/** Secondary button hover - slightly lighter */
	bg_button_secondary_hover: "#303133",

	// Interactive states
	/** Primary hover - sage green */
	bg_accent_hover: "#819981",
	/** Primary active - brighter sage */
	bg_accent_active: "#93AB93",

	// Additional semantic colors
	/** Warning state - amber/orange tone */
	fg_warning: "#F59E0B",
	/** Info state - uses sage green */
	fg_info: "#819981",

	// ===================================================================
	// EXTENDED COLORS (CineXplorer Extensions)
	// ===================================================================

	// Movie-specific - Rating
	/** Rating display - warm golden tone (reuses warning amber for dark) */
	fg_rating: "#F59E0B",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type SageBonePaletteColorLight = keyof typeof sageBonePaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type SageBonePaletteColorDark = keyof typeof sageBonePaletteDark;
