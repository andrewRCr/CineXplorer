/**
 * IBM Carbon Theme Definition
 *
 * Maps IBM Carbon Design System palette colors to shadcn/ui semantic roles.
 * Provides enterprise-grade aesthetic with IBM's proven accessibility standards.
 *
 * Source: IBM Carbon Design System v10 (https://carbondesignsystem.com)
 * Research: External research analyst - IBM Carbon color tokens
 */

import { ibmCarbonPaletteLight as pLight, ibmCarbonPaletteDark as pDark } from "../palettes/ibm-carbon";
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
 * IBM Carbon theme for CineXplorer.
 *
 * Provides enterprise-grade, highly accessible color palette following IBM's
 * Carbon Design System. Features IBM's distinctive blue accent and strict
 * WCAG AA compliance. Uses 3-layer system for depth hierarchy.
 */
export const ibmCarbonTheme: Theme = {
	name: "ibm-carbon",
	label: "IBM Carbon",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Pure white
		foreground: hexToRgb(pLight.fg_default), // Near black text

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_muted), // Light gray (layer-01)
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_inset), // White (layer-02)
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		// Carbon uses blue as primary interactive color
		primary: hexToRgb(pLight.fg_accent), // IBM blue
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // Dark gray
		"secondary-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_muted), // Light gray background
		"muted-foreground": hexToRgb(pLight.fg_muted), // Medium gray text

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pLight.fg_accent), // IBM blue
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Red
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pLight.bg_success), // Green
		"success-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pLight.fg_warning), // IBM yellow (support-03)
		"warning-foreground": hexToRgb(pLight.fg_default), // Near black text

		// Status colors - Info (informational)
		info: hexToRgb(pLight.fg_info), // Dark blue (support-04)
		"info-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Rating colors (movie-specific)
		rating: hexToRgb(pLight.fg_rating), // Professional gold
		"rating-foreground": hexToRgb(pLight.fg_default), // Near black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pLight.bg_emphasis), // Gray emphasis (3rd layer)

		// Badge colors (neutral tags)
		badge: hexToRgb(pLight.bg_muted), // Light gray (layer-01)
		"badge-foreground": hexToRgb(pLight.fg_muted), // Medium gray text

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pLight.bg_accent_active), // Darker blue (active state)
		"drop-zone": hexToRgb(pLight.bg_emphasis), // Gray emphasis

		// UI element colors
		border: hexToRgb(pLight.border_default), // Medium gray
		input: hexToRgb(pLight.bg_muted), // Light gray background
		ring: hexToRgb(pLight.fg_accent), // IBM blue focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Near black (gray-100)
		foreground: hexToRgb(pDark.fg_default), // Near white text

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_muted), // Gray-90 (layer-01)
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset), // Gray-80 (layer-02)
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		// Carbon uses same blue in dark mode for consistency
		primary: hexToRgb(pDark.fg_accent), // Light blue for dark bg
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Medium gray
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_muted), // Gray-90 background
		"muted-foreground": hexToRgb(pDark.fg_muted), // Medium gray text

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pDark.fg_accent), // Light blue for dark bg
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Lighter red for dark bg
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pDark.bg_success), // Brighter green for dark bg
		"success-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pDark.fg_warning), // IBM yellow (same in dark)
		"warning-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Info (informational)
		info: hexToRgb(pDark.fg_info), // Lighter blue (support-04 dark)
		"info-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Rating colors (movie-specific)
		rating: hexToRgb(pDark.fg_rating), // Bright gold for dark mode
		"rating-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pDark.bg_emphasis), // Gray-80 (3rd layer, lighter than card)

		// Badge colors (neutral tags)
		badge: hexToRgb(pDark.bg_button_secondary), // Medium gray
		"badge-foreground": hexToRgb(pDark.fg_muted), // Light gray text

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pDark.bg_accent_active), // Darker blue (active state)
		"drop-zone": hexToRgb(pDark.bg_emphasis), // Gray-80 emphasis

		// UI element colors
		border: hexToRgb(pDark.border_default), // Dark gray
		input: hexToRgb(pDark.bg_muted), // Gray-90 background
		ring: hexToRgb(pDark.fg_accent), // Light blue focus ring
	},
} as const;
