/**
 * Tangere-Terminal Theme Definition
 *
 * Maps tangere-terminal palette colors to shadcn/ui semantic roles.
 * Provides sophisticated terminal-inspired aesthetic with complementary color harmony.
 *
 * Source: tangere-terminal by François Tonneau (https://github.com/ftonneau/tangere-terminal)
 * License: MIT
 * Research: Design philosophy + Vim/Kakoune semantic mappings
 *
 * Design philosophy: Uses complementary sectors of painter's color wheel with high contrast.
 * Avoids typical xterm equal spacing for sophistication through color restriction.
 */

import { tangerePaletteLight as pLight, tangerePaletteDark as pDark } from "../palettes/tangere-terminal";
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
 * Tangere-Terminal theme for CineXplorer.
 *
 * Provides terminal-inspired color palette with sophisticated complementary color harmony.
 * Features high contrast ratios (avg 8.5 light, 6.9 dark) and 64% mean saturation.
 * Uses warm colors for attention (errors, warnings) and cool colors for syntax/structure.
 *
 * Note: Dark background V=22% is brighter than typical dark themes to reduce discomfort
 * when viewing alongside light windows.
 */
export const tangereTerminalTheme: Theme = {
	name: "tangere-terminal",
	label: "Tangere Terminal",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Warm white
		foreground: hexToRgb(pLight.fg_default), // Pure black text

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_muted), // Pure white
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_muted), // Pure white
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		// Uses teal (color 2) for success/primary actions per Vim mappings
		primary: hexToRgb(pLight.bg_success), // Teal
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // Light gray
		"secondary-foreground": hexToRgb(pLight.fg_default), // Black text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_inset), // Light gray background
		"muted-foreground": hexToRgb(pLight.fg_muted), // Dark gray text

		// Accent colors (links, selections, focus)
		// Uses blue (color 4) per Vim keyword/link mappings
		accent: hexToRgb(pLight.fg_accent), // Blue
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Red
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pLight.bg_success), // Teal
		"success-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pLight.fg_warning), // Brown/orange (color 3)
		"warning-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Status colors - Info (informational)
		info: hexToRgb(pLight.fg_info), // Blue (color 4)
		"info-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Rating colors (movie-specific)
		rating: hexToRgb(pLight.fg_rating), // Golden brown
		"rating-foreground": hexToRgb(pLight.fg_onEmphasis), // Black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pLight.bg_emphasis), // Medium gray (3rd layer)

		// Badge colors (neutral tags)
		badge: hexToRgb(pLight.bg_inset), // Light gray
		"badge-foreground": hexToRgb(pLight.fg_muted), // Dark gray text

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pLight.bg_accent_active), // Darkest blue
		"drop-zone": hexToRgb(pLight.bg_selection), // Purple (color 5)

		// UI element colors
		border: hexToRgb(pLight.border_default), // Medium gray
		input: hexToRgb(pLight.bg_muted), // Pure white background
		ring: hexToRgb(pLight.fg_accent), // Blue focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Blueish dark gray
		foreground: hexToRgb(pDark.fg_default), // Yellowish white text

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_inset), // Lighter gray (elevated)
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset), // Lighter gray
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		// Uses teal (color 2) for success/primary actions per Vim mappings
		primary: hexToRgb(pDark.bg_success), // Teal
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Dark gray
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_muted), // Pure black background
		"muted-foreground": hexToRgb(pDark.fg_muted), // Light gray text

		// Accent colors (links, selections, focus)
		// Uses light blue (color 4) per Vim keyword/link mappings
		accent: hexToRgb(pDark.fg_accent), // Light blue
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Salmon/coral
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pDark.bg_success), // Teal
		"success-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pDark.fg_warning), // Golden yellow (color 3)
		"warning-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Status colors - Info (informational)
		info: hexToRgb(pDark.fg_info), // Light blue (color 4)
		"info-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Rating colors (movie-specific)
		rating: hexToRgb(pDark.fg_rating), // Golden yellow
		"rating-foreground": hexToRgb(pDark.fg_onEmphasis), // Black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pDark.bg_emphasis), // Medium gray (3rd layer, lighter than card)

		// Badge colors (neutral tags)
		badge: hexToRgb(pDark.bg_button_secondary), // Dark gray
		"badge-foreground": hexToRgb(pDark.fg_muted), // Light gray text

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pDark.bg_accent_active), // Bright cyan
		"drop-zone": hexToRgb(pDark.bg_selection), // Purple (color 5)

		// UI element colors
		border: hexToRgb(pDark.border_default), // Medium light gray
		input: hexToRgb(pDark.bg_inset), // Elevated gray background
		ring: hexToRgb(pDark.fg_accent), // Light blue focus ring
	},
} as const;
