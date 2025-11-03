/**
 * Tangere Terminal Theme Definition
 */

import { tangerePaletteLight as pLight, tangerePaletteDark as pDark } from "../palettes/tangere-terminal";
import type { Theme } from "../types";

export const tangereTerminalTheme: Theme = {
	name: "tangere-terminal",
	label: "Tangere Terminal",

	light: {
// Base colors
		background: pLight.bg_default, // Warm white
		foreground: pLight.fg_default, // Pure black text
		// Card colors (elevated surfaces)
		card: pLight.bg_muted, // Pure white
		"card-foreground": pLight.fg_default,
		// Popover colors (dropdowns, tooltips)
		popover: pLight.bg_muted, // Pure white
		"popover-foreground": pLight.fg_default,
		// Primary colors (main action buttons)
		// Uses teal (color 2) for success/primary actions per Vim mappings
		primary: pLight.bg_success, // Teal
		"primary-foreground": pLight.fg_onEmphasis, // Black text
		// Secondary colors (alternate actions, less prominent)
		secondary: pLight.bg_button_secondary, // Light gray
		"secondary-foreground": pLight.fg_default, // Black text
		// Muted colors (backgrounds, disabled states)
		muted: pLight.bg_inset, // Light gray background
		"muted-foreground": pLight.fg_muted, // Dark gray text
		// Accent colors (links, selections, focus)
		// Uses blue (color 4) per Vim keyword/link mappings
		accent: pLight.fg_accent, // Blue
		"accent-foreground": pLight.fg_onEmphasis, // Black text
		"accent-hover": pLight.fg_accent_hover,
		// Destructive colors (delete, remove, etc.)
		destructive: pLight.bg_danger, // Red
		"destructive-foreground": pLight.fg_onEmphasis, // Black text
		// Status colors - Success (positive outcomes)
		success: pLight.bg_success, // Teal
		"success-foreground": pLight.fg_onEmphasis, // Black text
		// Status colors - Warning (caution/attention)
		warning: pLight.fg_warning, // Brown/orange (color 3)
		"warning-foreground": pLight.fg_onEmphasis, // Black text
		// Status colors - Info (informational)
		info: pLight.fg_info, // Blue (color 4)
		"info-foreground": pLight.fg_onEmphasis, // Black text
		// Rating colors (movie-specific)
		rating: pLight.fg_rating, // Golden brown
		"rating-foreground": pLight.fg_onEmphasis, // Black text
		// Surface elevation (featured sections, modals)
		"surface-elevated": pLight.bg_emphasis, // Medium gray (3rd layer)
		// Badge colors (neutral tags)
		badge: pLight.bg_inset, // Light gray
		"badge-foreground": pLight.fg_muted, // Dark gray text
		// Interactive states - Drag and drop
		"drag-active": pLight.bg_accent_active, // Darkest blue
		"drop-zone": pLight.bg_selection, // Purple (color 5)
		// UI element colors
		border: pLight.border_default, // Medium gray
		input: pLight.border_default, // Input border
		ring: pLight.fg_accent, // Blue focus ring
	},

	dark: {
background: pDark.bg_default, // Blueish dark gray
		foreground: pDark.fg_default, // Yellowish white text
		card: pDark.bg_inset, // Lighter gray (elevated)
		"card-foreground": pDark.fg_default,
		popover: pDark.bg_inset, // Lighter gray
		"popover-foreground": pDark.fg_default,
		primary: pDark.bg_success, // Teal
		"primary-foreground": pDark.fg_onEmphasis, // Black text
		secondary: pDark.bg_button_secondary, // Dark gray
		"secondary-foreground": pDark.fg_default, // Light text
		muted: pDark.bg_muted, // Pure black background
		"muted-foreground": pDark.fg_muted, // Light gray text
		// Uses light blue (color 4) per Vim keyword/link mappings
		accent: pDark.fg_accent, // Light blue
		"accent-foreground": pDark.fg_onEmphasis, // Black text
		"accent-hover": pDark.fg_accent_hover,
		destructive: pDark.bg_danger, // Salmon/coral
		"destructive-foreground": pDark.fg_onEmphasis, // Black text
		success: pDark.bg_success, // Teal
		"success-foreground": pDark.fg_onEmphasis, // Black text
		warning: pDark.fg_warning, // Golden yellow (color 3)
		"warning-foreground": pDark.fg_onEmphasis, // Black text
		info: pDark.fg_info, // Light blue (color 4)
		"info-foreground": pDark.fg_onEmphasis, // Black text
		rating: pDark.fg_rating, // Golden yellow
		"rating-foreground": pDark.fg_onEmphasis, // Black text
		"surface-elevated": pDark.bg_emphasis, // Medium gray (3rd layer, lighter than card)
		badge: pDark.bg_button_secondary, // Dark gray
		"badge-foreground": pDark.fg_muted, // Light gray text
		"drag-active": pDark.bg_accent_active, // Bright cyan
		"drop-zone": pDark.bg_selection, // Purple (color 5)
		border: pDark.border_default, // Medium light gray
		input: pDark.border_default, // Input border
		ring: pDark.fg_accent, // Light blue focus ring
	},
} as const;
