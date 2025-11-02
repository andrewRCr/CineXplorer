/**
 * Sage & Bone Theme Definition
 *
 * Maps Sage & Bone palette colors to shadcn/ui semantic roles.
 * Provides calm, nature-inspired aesthetic with gentle sage green accent.
 *
 * Design: Warm bone whites (light) / deep charcoal (dark) with soft sage green throughout.
 * Philosophy: Minimal distraction, organic warmth, gentle contrast for reduced eye strain.
 */

import { sageBonePaletteLight as pLight, sageBonePaletteDark as pDark } from "../palettes/sage-bone";
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
 * Sage & Bone theme for CineXplorer.
 *
 * Provides nature-inspired color palette with soft sage green as primary accent.
 * Features warm bone whites (light mode) and deep charcoal (dark mode) with
 * consistent sage accent across both modes. Low saturation design reduces
 * eye strain and creates organic, calming aesthetic.
 */
export const sageBoneTheme: Theme = {
	name: "sage-bone",
	label: "Sage & Bone",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Warm bone white
		foreground: hexToRgb(pLight.fg_default), // Dark charcoal

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_muted), // Same as background (flat)
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_inset), // Warm bone white
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pLight.bg_success), // Soft sage green
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // Bone surface
		"secondary-foreground": hexToRgb(pLight.fg_default), // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_emphasis), // Slightly darker bone
		"muted-foreground": hexToRgb(pLight.fg_muted), // Medium gray

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pLight.fg_accent), // Sage green
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Red
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// UI element colors
		border: hexToRgb(pLight.border_default), // Light warm gray
		input: hexToRgb(pLight.bg_default), // Warm bone white
		ring: hexToRgb(pLight.fg_accent), // Sage green focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Deep charcoal
		foreground: hexToRgb(pDark.fg_default), // Warm off-white

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_muted), // Slightly lighter charcoal
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset), // Same as card
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pDark.bg_success), // Soft sage green
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // White

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Charcoal surface
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_emphasis), // Medium charcoal
		"muted-foreground": hexToRgb(pDark.fg_muted), // Medium gray

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pDark.fg_accent), // Sage green
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // White

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Lighter red for dark bg
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // White

		// UI element colors
		border: hexToRgb(pDark.border_default), // Dark gray
		input: hexToRgb(pDark.bg_muted), // Slightly lighter charcoal
		ring: hexToRgb(pDark.fg_accent), // Sage green focus ring
	},
} as const;
