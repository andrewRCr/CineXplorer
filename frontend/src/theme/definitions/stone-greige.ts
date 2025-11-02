/**
 * Stone & Greige Theme Definition
 *
 * Maps Stone & Greige palette colors to shadcn/ui semantic roles.
 * Provides minimal, architectural aesthetic with sophisticated neutrals.
 *
 * Design: Cool stone whites (light) / deep warm blacks (dark) with greige accents.
 * Philosophy: Architectural minimalism, refined neutrals, subtle warmth.
 */

import { stoneGreigePaletteLight as pLight, stoneGreigePaletteDark as pDark } from "../palettes/stone-greige";
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
 * Stone & Greige theme for CineXplorer.
 *
 * Provides architectural, minimal color palette inspired by natural stone and greige.
 * Features sophisticated neutrals with subtle warmth. Light mode uses cool stone
 * backgrounds with dark greige accents; dark mode inverts to warm black with
 * light stone accents. Creates refined, high-end aesthetic.
 */
export const stoneGreigeTheme: Theme = {
	name: "stone-greige",
	label: "Stone & Greige",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Cool stone white
		foreground: hexToRgb(pLight.fg_default), // Dark warm brown

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_muted), // Same as background (flat)
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_inset), // Cool stone white
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pLight.bg_success), // Dark greige
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // Light greige
		"secondary-foreground": hexToRgb(pLight.fg_default), // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_emphasis), // Light greige
		"muted-foreground": hexToRgb(pLight.fg_muted), // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pLight.fg_accent), // Dark greige
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // White

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Muted red
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis),
		// Status colors - Success (positive outcomes)
		success: hexToRgb(pLight.bg_success),
		"success-foreground": hexToRgb(pLight.fg_onEmphasis),

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pLight.fg_warning),
		"warning-foreground": hexToRgb(pLight.fg_onEmphasis),

		// Status colors - Info (informational)
		info: hexToRgb(pLight.fg_info),
		"info-foreground": hexToRgb(pLight.fg_onEmphasis),

		// Rating colors (movie-specific)
		rating: hexToRgb(pLight.fg_rating),
		"rating-foreground": hexToRgb(pLight.fg_onEmphasis),

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pLight.bg_emphasis),

		// Badge colors (neutral tags)
		badge: hexToRgb(pLight.bg_muted),
		"badge-foreground": hexToRgb(pLight.fg_muted),

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pLight.bg_accent_active),
		"drop-zone": hexToRgb(pLight.bg_emphasis),

		// UI element colors
		border: hexToRgb(pLight.border_default), // Light stone gray
		input: hexToRgb(pLight.bg_default), // Cool stone white
		ring: hexToRgb(pLight.fg_accent), // Dark greige focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Deep warm black
		foreground: hexToRgb(pDark.fg_default), // Light stone

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_muted), // Slightly lighter warm black
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset), // Same as card
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pDark.bg_success), // Light stone (inverted)
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // Dark brown

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Dark greige
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_emphasis), // Dark greige
		"muted-foreground": hexToRgb(pDark.fg_muted), // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pDark.fg_accent), // Light stone
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // Dark brown

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Lighter red for dark bg
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // Dark brown

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pDark.bg_success),
		"success-foreground": hexToRgb(pDark.fg_onEmphasis),

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pDark.fg_warning),
		"warning-foreground": hexToRgb(pDark.fg_onEmphasis),

		// Status colors - Info (informational)
		info: hexToRgb(pDark.fg_info),
		"info-foreground": hexToRgb(pDark.fg_onEmphasis),

		// Rating colors (movie-specific)
		rating: hexToRgb(pDark.fg_rating),
		"rating-foreground": hexToRgb(pDark.fg_onEmphasis),

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pDark.bg_emphasis),

		// Badge colors (neutral tags)
		badge: hexToRgb(pDark.bg_button_secondary),
		"badge-foreground": hexToRgb(pDark.fg_muted),

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pDark.bg_accent_active),
		"drop-zone": hexToRgb(pDark.bg_emphasis),

		// UI element colors
		border: hexToRgb(pDark.border_default), // Dark warm gray
		input: hexToRgb(pDark.bg_muted), // Slightly lighter warm black
		ring: hexToRgb(pDark.fg_accent), // Light stone focus ring
	},
} as const;
