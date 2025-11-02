/**
 * GitHub Primer Theme Definition
 *
 * Maps GitHub Primer palette colors to shadcn/ui semantic roles.
 * Provides neutral, professional aesthetic proven at massive scale.
 *
 * Source: GitHub Primer design system (https://primer.style)
 * Research: .arc/active/incidental/notes-theme-system-modernization.md
 */

import { githubPaletteLight as pLight, githubPaletteDark as pDark } from "../palettes/github";
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
 * GitHub Primer theme for CineXplorer.
 *
 * Provides neutral, accessible color palette following GitHub's proven
 * design system. Suitable as baseline theme before custom branding.
 */
export const githubTheme: Theme = {
	name: "github",
	label: "GitHub",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Pure white
		foreground: hexToRgb(pLight.fg_default), // Near black text

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_default), // Same as background (flat design)
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_default),
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		// Note: GitHub uses green for primary actions (success semantic)
		primary: hexToRgb(pLight.bg_success), // Green
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // Light gray
		"secondary-foreground": hexToRgb(pLight.fg_default), // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_muted), // Light gray background
		"muted-foreground": hexToRgb(pLight.fg_muted), // Medium gray text

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pLight.fg_accent), // Blue
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Red
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pLight.bg_success), // Green
		"success-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pLight.bg_attention), // Gold/yellow
		"warning-foreground": hexToRgb(pLight.fg_attention), // Dark brown text

		// Status colors - Info (informational)
		info: hexToRgb(pLight.bg_info), // Blue
		"info-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Rating colors (movie-specific)
		rating: hexToRgb(pLight.fg_rating), // IMDb gold adapted
		"rating-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pLight.bg_emphasis), // Light blue emphasis

		// Badge colors (neutral tags)
		badge: hexToRgb(pLight.bg_muted), // Light gray
		"badge-foreground": hexToRgb(pLight.fg_muted), // Medium gray text

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pLight.bg_button_secondary_hover), // Darker gray (active)
		"drop-zone": hexToRgb(pLight.bg_emphasis), // Light blue (success tint)

		// UI element colors
		border: hexToRgb(pLight.border_default), // Medium gray
		input: hexToRgb(pLight.bg_default), // White background
		ring: hexToRgb(pLight.fg_accent), // Blue focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Near black
		foreground: hexToRgb(pDark.fg_default), // Near white text

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_inset), // Darker than background
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset),
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pDark.bg_success), // Green
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Dark gray
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_muted), // Medium dark background
		"muted-foreground": hexToRgb(pDark.fg_muted), // Medium gray text

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pDark.fg_accent), // Lighter blue for dark bg
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Red
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pDark.bg_success), // Green
		"success-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pDark.bg_attention), // Gold/brown
		"warning-foreground": hexToRgb(pDark.fg_attention), // Light yellow text

		// Status colors - Info (informational)
		info: hexToRgb(pDark.bg_info), // Blue
		"info-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Rating colors (movie-specific)
		rating: hexToRgb(pDark.fg_rating), // Brighter gold for dark mode
		"rating-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pDark.bg_muted), // Lighter than card (tonal progression)

		// Badge colors (neutral tags)
		badge: hexToRgb(pDark.bg_button_secondary), // Dark gray
		"badge-foreground": hexToRgb(pDark.fg_muted), // Medium gray text

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pDark.bg_button_secondary_hover), // Lighter gray (active)
		"drop-zone": hexToRgb(pDark.bg_emphasis), // Blue (accent tint)

		// UI element colors
		border: hexToRgb(pDark.border_default), // Dark gray
		input: hexToRgb(pDark.bg_default), // Near black background
		ring: hexToRgb(pDark.fg_accent), // Light blue focus ring
	},
} as const;
