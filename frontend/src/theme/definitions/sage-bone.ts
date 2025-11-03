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
		background: pLight.bg_default, // Warm bone white
		foreground: pLight.fg_default, // Dark charcoal

		// Card colors (elevated surfaces)
		card: pLight.bg_muted, // Same as background (flat)
		"card-foreground": pLight.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pLight.bg_inset, // Warm bone white
		"popover-foreground": pLight.fg_default,

		// Primary colors (main action buttons)
		primary: pLight.bg_success, // Soft sage green
		"primary-foreground": pLight.fg_onEmphasis, // White

		// Secondary colors (alternate actions, less prominent)
		secondary: pLight.bg_button_secondary, // Bone surface
		"secondary-foreground": pLight.fg_default, // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: pLight.bg_emphasis, // Slightly darker bone
		"muted-foreground": pLight.fg_muted, // Medium gray

		// Accent colors (links, selections, focus)
		accent: pLight.fg_accent, // Sage green
		"accent-foreground": pLight.fg_onEmphasis, // White

		// Destructive colors (delete, remove, etc.)
		destructive: pLight.bg_danger, // Red
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
		border: pLight.border_default, // Light warm gray
		input: pLight.bg_default, // Warm bone white
		ring: pLight.fg_accent, // Sage green focus ring
	},

	dark: {
		// Base colors
		background: pDark.bg_default, // Deep charcoal
		foreground: pDark.fg_default, // Warm off-white

		// Card colors (elevated surfaces)
		card: pDark.bg_muted, // Slightly lighter charcoal
		"card-foreground": pDark.fg_default,

		// Popover colors (dropdowns, tooltips)
		popover: pDark.bg_inset, // Same as card
		"popover-foreground": pDark.fg_default,

		// Primary colors (main action buttons)
		primary: pDark.bg_success, // Soft sage green
		"primary-foreground": pDark.fg_onEmphasis, // White

		// Secondary colors (alternate actions, less prominent)
		secondary: pDark.bg_button_secondary, // Charcoal surface
		"secondary-foreground": pDark.fg_default, // Light text

		// Muted colors (backgrounds, disabled states)
		muted: pDark.bg_emphasis, // Medium charcoal
		"muted-foreground": pDark.fg_muted, // Medium gray

		// Accent colors (links, selections, focus)
		accent: pDark.fg_accent, // Sage green
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
		border: pDark.border_default, // Dark gray
		input: pDark.bg_muted, // Slightly lighter charcoal
		ring: pDark.fg_accent, // Sage green focus ring
	},
} as const;
