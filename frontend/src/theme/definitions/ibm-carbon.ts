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
		// Base colors - DIRECT HEX (no conversion)
		background: pLight.bg_default,
		foreground: pLight.fg_default,

		// Card colors
		card: pLight.bg_muted,
		"card-foreground": pLight.fg_default,

		// Popover colors
		popover: pLight.bg_inset,
		"popover-foreground": pLight.fg_default,

		// Primary colors
		primary: pLight.fg_accent,
		"primary-foreground": pLight.fg_onEmphasis,

		// Secondary colors
		secondary: pLight.bg_button_secondary,
		"secondary-foreground": pLight.fg_onEmphasis,

		// Muted colors
		muted: pLight.bg_muted,
		"muted-foreground": pLight.fg_muted,

		// Accent colors
		accent: pLight.fg_accent,
		"accent-foreground": pLight.fg_onEmphasis,

		// Destructive colors
		destructive: pLight.bg_danger,
		"destructive-foreground": pLight.fg_onEmphasis,

		// Status colors - Success
		success: pLight.bg_success,
		"success-foreground": pLight.fg_onEmphasis,

		// Status colors - Warning
		warning: pLight.fg_warning,
		"warning-foreground": pLight.fg_default,

		// Status colors - Info
		info: pLight.fg_info,
		"info-foreground": pLight.fg_onEmphasis,

		// Rating colors
		rating: pLight.fg_rating,
		"rating-foreground": pLight.fg_default,

		// Surface elevation
		"surface-elevated": pLight.bg_emphasis,

		// Badge colors
		badge: pLight.bg_muted,
		"badge-foreground": pLight.fg_muted,

		// Interactive states
		"drag-active": pLight.bg_accent_active,
		"drop-zone": pLight.bg_emphasis,

		// UI element colors
		border: pLight.border_default,
		input: pLight.bg_muted,
		ring: pLight.fg_accent,
	},

	dark: {
		// Base colors - DIRECT HEX (no conversion)
		background: pDark.bg_default,
		foreground: pDark.fg_default,

		// Card colors
		card: pDark.bg_muted,
		"card-foreground": pDark.fg_default,

		// Popover colors
		popover: pDark.bg_inset,
		"popover-foreground": pDark.fg_default,

		// Primary colors
		primary: pDark.fg_accent,
		"primary-foreground": pDark.fg_onEmphasis,

		// Secondary colors
		secondary: pDark.bg_button_secondary,
		"secondary-foreground": pDark.fg_default,

		// Muted colors
		muted: pDark.bg_muted,
		"muted-foreground": pDark.fg_muted,

		// Accent colors
		accent: pDark.fg_accent,
		"accent-foreground": pDark.fg_onEmphasis,

		// Destructive colors
		destructive: pDark.bg_danger,
		"destructive-foreground": pDark.fg_onEmphasis,

		// Status colors - Success
		success: pDark.bg_success,
		"success-foreground": pDark.fg_onEmphasis,

		// Status colors - Warning
		warning: pDark.fg_warning,
		"warning-foreground": pDark.fg_onEmphasis,

		// Status colors - Info
		info: pDark.fg_info,
		"info-foreground": pDark.fg_onEmphasis,

		// Rating colors
		rating: pDark.fg_rating,
		"rating-foreground": pDark.fg_onEmphasis,

		// Surface elevation
		"surface-elevated": pDark.bg_emphasis,

		// Badge colors
		badge: pDark.bg_button_secondary,
		"badge-foreground": pDark.fg_muted,

		// Interactive states
		"drag-active": pDark.bg_accent_active,
		"drop-zone": pDark.bg_emphasis,

		// UI element colors
		border: pDark.border_default,
		input: pDark.bg_muted,
		ring: pDark.fg_accent,
	},
} as const;
