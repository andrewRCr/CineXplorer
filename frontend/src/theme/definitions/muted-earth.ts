/**
 * Muted Earth Theme Definition
 *
 * Maps Muted Earth palette colors to shadcn/ui semantic roles.
 * Provides warm, grounded aesthetic with natural terracotta accents.
 *
 * Design: Creamy linen (light) / deep warm blacks (dark) with terracotta throughout.
 * Philosophy: Human-centered, organic warmth, approachable and grounded.
 */

import { mutedEarthPaletteLight as pLight, mutedEarthPaletteDark as pDark } from "../palettes/muted-earth";
import type { Theme } from "../types";

/**
 * Convert hex color to RGB space-separated string for Chakra UI.
 * Example: "#ffffff" → "255 255 255"
 *
 * Chakra UI uses RGB space-separated format to support opacity modifiers
 * like bg="primary/50" for 50% opacity.
 */
function hexToRgb(hex: string): string {
	// Remove # if present
	const cleanHex = hex.replace("#", "");

	// Handle translucent colors (8-char hex with alpha)
	if (cleanHex.length === 8) {
		const r = parseInt(cleanHex.substring(0, 2), 16);
		const g = parseInt(cleanHex.substring(2, 4), 16);
		const b = parseInt(cleanHex.substring(4, 6), 16);
		// Ignore alpha channel - Chakra handles opacity separately
		return `${r} ${g} ${b}`;
	}

	// Standard 6-char hex
	const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
	if (!result) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

/**
 * Muted Earth theme for CineXplorer.
 *
 * Provides warm, grounded color palette with creamy linen backgrounds and
 * muted terracotta/rust accents. Features natural warmth and organic feel
 * with human-centered, approachable aesthetic. Terracotta accent remains
 * consistent across light and dark modes for brand continuity.
 */
export const mutedEarthTheme: Theme = {
	name: "muted-earth",
	label: "Muted Earth",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Creamy linen
		foreground: hexToRgb(pLight.fg_default), // Dark warm brown

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_muted), // Same as background (flat)
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_inset), // Creamy linen
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pLight.bg_success), // Terracotta/rust
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // Light warm beige
		"secondary-foreground": hexToRgb(pLight.fg_default), // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_emphasis), // Lighter warm beige
		"muted-foreground": hexToRgb(pLight.fg_muted), // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pLight.fg_accent), // Terracotta
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Muted red
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// UI element colors
		border: hexToRgb(pLight.border_default), // Warm beige
		input: hexToRgb(pLight.bg_default), // Creamy linen
		ring: hexToRgb(pLight.fg_accent), // Terracotta focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Deep warm black
		foreground: hexToRgb(pDark.fg_default), // Warm light beige

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_muted), // Slightly lighter warm black
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset), // Same as card
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pDark.bg_success), // Terracotta/rust (same as light)
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // White

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Dark warm gray
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_emphasis), // Dark warm gray
		"muted-foreground": hexToRgb(pDark.fg_muted), // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pDark.fg_accent), // Terracotta
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // White

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Lighter red for dark bg
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // White

		// UI element colors
		border: hexToRgb(pDark.border_default), // Dark warm gray
		input: hexToRgb(pDark.bg_muted), // Slightly lighter warm black
		ring: hexToRgb(pDark.fg_accent), // Terracotta focus ring
	},
} as const;
