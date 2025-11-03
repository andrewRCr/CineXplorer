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
		background: pLight.bg_default, // Creamy linen
		foreground: pLight.fg_default, // Dark warm brown

		// Card colors (elevated surfaces)
		card: pLight.bg_muted, // Same as background (flat)
		"card-foreground": pLight.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pLight.bg_inset, // Creamy linen
		"popover-foreground": pLight.fg_default,

		// Primary colors (main action buttons)
		primary: pLight.bg_success, // Terracotta/rust
		"primary-foreground": pLight.fg_onEmphasis, // White

		// Secondary colors (alternate actions, less prominent)
		secondary: pLight.bg_button_secondary, // Light warm beige
		"secondary-foreground": pLight.fg_default, // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: pLight.bg_emphasis, // Lighter warm beige
		"muted-foreground": pLight.fg_muted, // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: pLight.fg_accent, // Terracotta
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
		border: pLight.border_default, // Warm beige
		input: pLight.bg_default, // Creamy linen
		ring: pLight.fg_accent, // Terracotta focus ring
	},

	dark: {
		// Base colors
		background: pDark.bg_default, // Deep warm black
		foreground: pDark.fg_default, // Warm light beige

		// Card colors (elevated surfaces)
		card: pDark.bg_muted, // Slightly lighter warm black
		"card-foreground": pDark.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pDark.bg_inset, // Same as card
		"popover-foreground": pDark.fg_default,

		// Primary colors (main action buttons)
		primary: pDark.bg_success, // Terracotta/rust (same as light)
		"primary-foreground": pDark.fg_onEmphasis, // White

		// Secondary colors (alternate actions, less prominent)
		secondary: pDark.bg_button_secondary, // Dark warm gray
		"secondary-foreground": pDark.fg_default, // Light text

		// Muted colors (backgrounds, disabled states)
		muted: pDark.bg_emphasis, // Dark warm gray
		"muted-foreground": pDark.fg_muted, // Medium warm gray

		// Accent colors (links, selections, focus)
		accent: pDark.fg_accent, // Terracotta
		"accent-foreground": pDark.fg_onEmphasis, // White

		// Destructive colors (delete, remove, etc.)
		destructive: pDark.bg_danger, // Lighter red for dark bg
		"destructive-foreground": pDark.fg_onEmphasis, // White

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
		ring: pDark.fg_accent, // Terracotta focus ring
	},
} as const;
