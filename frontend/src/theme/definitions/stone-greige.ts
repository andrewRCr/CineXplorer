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
		background: pLight.bg_default, // Cool stone white
		foreground: pLight.fg_default, // Dark warm brown

		// Card colors (elevated surfaces)
		card: pLight.bg_muted, // Same as background (flat)
		"card-foreground": pLight.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pLight.bg_inset, // Cool stone white
		"popover-foreground": pLight.fg_default,

		// Primary colors (main action buttons)
		primary: pLight.bg_success, // Dark greige
		"primary-foreground": pLight.fg_onEmphasis, // White

		// Secondary colors (alternate actions, less prominent)
		secondary: pLight.bg_button_secondary, // Light greige
		"secondary-foreground": pLight.fg_default, // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: pLight.bg_emphasis, // Light greige
		"muted-foreground": pLight.fg_muted, // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: pLight.fg_accent, // Dark greige
		"accent-foreground": pLight.fg_onEmphasis, // White

		// Destructive colors (delete, remove, etc.)
		destructive: pLight.bg_danger, // Muted red
		"destructive-foreground": pLight.fg_onEmphasis,
		// Status colors - Success (positive outcomes)
		success: pLight.bg_success,
		"success-foreground": pLight.fg_onEmphasis,

		// Status colors - Warning (caution/attention)
		warning: pLight.fg_warning,
		"warning-foreground": pLight.fg_onEmphasis,

		// Status colors - Info (informational)
		info: pLight.fg_info,
		"info-foreground": pLight.fg_onEmphasis,

		// Rating colors (movie-specific)
		rating: pLight.fg_rating,
		"rating-foreground": pLight.fg_onEmphasis,

		// Surface elevation (featured sections, modals)
		"surface-elevated": pLight.bg_emphasis,

		// Badge colors (neutral tags)
		badge: pLight.bg_muted,
		"badge-foreground": pLight.fg_muted,

		// Interactive states - Drag and drop
		"drag-active": pLight.bg_accent_active,
		"drop-zone": pLight.bg_emphasis,

		// UI element colors
		border: pLight.border_default, // Light stone gray
		input: pLight.bg_default, // Cool stone white
		ring: pLight.fg_accent, // Dark greige focus ring
	},

	dark: {
		// Base colors
		background: pDark.bg_default, // Deep warm black
		foreground: pDark.fg_default, // Light stone

		// Card colors (elevated surfaces)
		card: pDark.bg_muted, // Slightly lighter warm black
		"card-foreground": pDark.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pDark.bg_inset, // Same as card
		"popover-foreground": pDark.fg_default,

		// Primary colors (main action buttons)
		primary: pDark.bg_success, // Light stone (inverted)
		"primary-foreground": pDark.fg_onEmphasis, // Dark brown

		// Secondary colors (alternate actions, less prominent)
		secondary: pDark.bg_button_secondary, // Dark greige
		"secondary-foreground": pDark.fg_default, // Light text

		// Muted colors (backgrounds, disabled states)
		muted: pDark.bg_emphasis, // Dark greige
		"muted-foreground": pDark.fg_muted, // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: pDark.fg_accent, // Light stone
		"accent-foreground": pDark.fg_onEmphasis, // Dark brown

		// Destructive colors (delete, remove, etc.)
		destructive: pDark.bg_danger, // Lighter red for dark bg
		"destructive-foreground": pDark.fg_onEmphasis, // Dark brown

		// Status colors - Success (positive outcomes)
		success: pDark.bg_success,
		"success-foreground": pDark.fg_onEmphasis,

		// Status colors - Warning (caution/attention)
		warning: pDark.fg_warning,
		"warning-foreground": pDark.fg_onEmphasis,

		// Status colors - Info (informational)
		info: pDark.fg_info,
		"info-foreground": pDark.fg_onEmphasis,

		// Rating colors (movie-specific)
		rating: pDark.fg_rating,
		"rating-foreground": pDark.fg_onEmphasis,

		// Surface elevation (featured sections, modals)
		"surface-elevated": pDark.bg_emphasis,

		// Badge colors (neutral tags)
		badge: pDark.bg_button_secondary,
		"badge-foreground": pDark.fg_muted,

		// Interactive states - Drag and drop
		"drag-active": pDark.bg_accent_active,
		"drop-zone": pDark.bg_emphasis,

		// UI element colors
		border: pDark.border_default, // Dark warm gray
		input: pDark.bg_muted, // Slightly lighter warm black
		ring: pDark.fg_accent, // Light stone focus ring
	},
} as const;
