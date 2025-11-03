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
		input: pLight.bg_muted, // Pure white background
		ring: pLight.fg_accent, // Blue focus ring
	},

	dark: {
		// Base colors
		background: pDark.bg_default, // Blueish dark gray
		foreground: pDark.fg_default, // Yellowish white text

		// Card colors (elevated surfaces)
		card: pDark.bg_inset, // Lighter gray (elevated)
		"card-foreground": pDark.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pDark.bg_inset, // Lighter gray
		"popover-foreground": pDark.fg_default,

		// Primary colors (main action buttons)
		// Uses teal (color 2) for success/primary actions per Vim mappings
		primary: pDark.bg_success, // Teal
		"primary-foreground": pDark.fg_onEmphasis, // Black text

		// Secondary colors (alternate actions, less prominent)
		secondary: pDark.bg_button_secondary, // Dark gray
		"secondary-foreground": pDark.fg_default, // Light text

		// Muted colors (backgrounds, disabled states)
		muted: pDark.bg_muted, // Pure black background
		"muted-foreground": pDark.fg_muted, // Light gray text

		// Accent colors (links, selections, focus)
		// Uses light blue (color 4) per Vim keyword/link mappings
		accent: pDark.fg_accent, // Light blue
		"accent-foreground": pDark.fg_onEmphasis, // Black text

		// Destructive colors (delete, remove, etc.)
		destructive: pDark.bg_danger, // Salmon/coral
		"destructive-foreground": pDark.fg_onEmphasis, // Black text

		// Status colors - Success (positive outcomes)
		success: pDark.bg_success, // Teal
		"success-foreground": pDark.fg_onEmphasis, // Black text

		// Status colors - Warning (caution/attention)
		warning: pDark.fg_warning, // Golden yellow (color 3)
		"warning-foreground": pDark.fg_onEmphasis, // Black text

		// Status colors - Info (informational)
		info: pDark.fg_info, // Light blue (color 4)
		"info-foreground": pDark.fg_onEmphasis, // Black text

		// Rating colors (movie-specific)
		rating: pDark.fg_rating, // Golden yellow
		"rating-foreground": pDark.fg_onEmphasis, // Black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": pDark.bg_emphasis, // Medium gray (3rd layer, lighter than card)

		// Badge colors (neutral tags)
		badge: pDark.bg_button_secondary, // Dark gray
		"badge-foreground": pDark.fg_muted, // Light gray text

		// Interactive states - Drag and drop
		"drag-active": pDark.bg_accent_active, // Bright cyan
		"drop-zone": pDark.bg_selection, // Purple (color 5)

		// UI element colors
		border: pDark.border_default, // Medium light gray
		input: pDark.bg_inset, // Elevated gray background
		ring: pDark.fg_accent, // Light blue focus ring
	},
} as const;
