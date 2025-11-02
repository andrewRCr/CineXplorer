/**
 * GitLab Pajamas Theme Definition
 *
 * Maps GitLab Pajamas Design System palette colors to shadcn/ui semantic roles.
 * Provides clean, modern aesthetic from GitLab's open-source design system.
 *
 * Source: GitLab Pajamas Design System (https://design.gitlab.com)
 * Research: External research analyst - GitLab Pajamas color tokens
 */

import { gitlabPajamasPaletteLight as pLight, gitlabPajamasPaletteDark as pDark } from "../palettes/gitlab-pajamas";
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
 * GitLab Pajamas theme for CineXplorer.
 *
 * Provides clean, modern color palette following GitLab's Pajamas Design System.
 * Features GitLab's blue primary accent and subtle neutral backgrounds.
 * Uses "dimming the lights" approach for dark mode with natural depth hierarchy.
 */
export const gitlabPajamasTheme: Theme = {
	name: "gitlab-pajamas",
	label: "GitLab Pajamas",

	light: {
		// Base colors
		background: hexToRgb(pLight.bg_default), // Pure white
		foreground: hexToRgb(pLight.fg_default), // Dark gray text

		// Card colors (elevated surfaces)
		card: hexToRgb(pLight.bg_muted), // Very subtle gray (neutral-10)
		"card-foreground": hexToRgb(pLight.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pLight.bg_default), // White
		"popover-foreground": hexToRgb(pLight.fg_default),

		// Primary colors (main action buttons)
		// GitLab uses blue for primary interactive elements
		primary: hexToRgb(pLight.bg_accent_hover), // Blue-500
		"primary-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pLight.bg_button_secondary), // White with borders
		"secondary-foreground": hexToRgb(pLight.fg_default), // Dark text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pLight.bg_muted), // Subtle gray background
		"muted-foreground": hexToRgb(pLight.fg_muted), // Medium gray text

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pLight.fg_accent), // Blue-700 (darker for links)
		"accent-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pLight.bg_danger), // Red-600
		"destructive-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pLight.bg_success), // Green-500
		"success-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pLight.fg_warning), // Orange-600 (GitLab official)
		"warning-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Status colors - Info (informational)
		info: hexToRgb(pLight.fg_info), // Blue-500 (GitLab official)
		"info-foreground": hexToRgb(pLight.fg_onEmphasis), // White text

		// Rating colors (movie-specific)
		rating: hexToRgb(pLight.fg_rating), // Gold adapted for GitLab
		"rating-foreground": hexToRgb(pLight.fg_default), // Dark text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pLight.bg_emphasis), // Neutral-50 (3rd layer)

		// Badge colors (neutral tags)
		badge: hexToRgb(pLight.bg_muted), // Neutral-10
		"badge-foreground": hexToRgb(pLight.fg_muted), // Neutral-600

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pLight.bg_accent_active), // Blue-600 (active state)
		"drop-zone": hexToRgb(pLight.bg_emphasis), // Neutral-50 (subtle emphasis)

		// UI element colors
		border: hexToRgb(pLight.border_default), // Medium gray
		input: hexToRgb(pLight.bg_default), // White background
		ring: hexToRgb(pLight.fg_accent), // Blue focus ring
	},

	dark: {
		// Base colors
		background: hexToRgb(pDark.bg_default), // Near black (neutral-950)
		foreground: hexToRgb(pDark.fg_default), // Light gray text

		// Card colors (elevated surfaces)
		card: hexToRgb(pDark.bg_muted), // Neutral-900 (lighter than background)
		"card-foreground": hexToRgb(pDark.fg_default),

		// Popover colors (dropdowns, tooltips)
		popover: hexToRgb(pDark.bg_inset), // Neutral-800 (elevated)
		"popover-foreground": hexToRgb(pDark.fg_default),

		// Primary colors (main action buttons)
		primary: hexToRgb(pDark.bg_accent_hover), // Blue-300 (lighter for dark)
		"primary-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Secondary colors (alternate actions, less prominent)
		secondary: hexToRgb(pDark.bg_button_secondary), // Neutral-900
		"secondary-foreground": hexToRgb(pDark.fg_default), // Light text

		// Muted colors (backgrounds, disabled states)
		muted: hexToRgb(pDark.bg_muted), // Neutral-900 background
		"muted-foreground": hexToRgb(pDark.fg_muted), // Medium gray text

		// Accent colors (links, selections, focus)
		accent: hexToRgb(pDark.fg_accent), // Blue-200 (lighter for dark bg)
		"accent-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Destructive colors (delete, remove, etc.)
		destructive: hexToRgb(pDark.bg_danger), // Red-400 (lighter for dark)
		"destructive-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Success (positive outcomes)
		success: hexToRgb(pDark.bg_success), // Green-300 (lighter for dark)
		"success-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Warning (caution/attention)
		warning: hexToRgb(pDark.fg_warning), // Orange-300 (GitLab official)
		"warning-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Status colors - Info (informational)
		info: hexToRgb(pDark.fg_info), // Blue-300 (GitLab official)
		"info-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Rating colors (movie-specific)
		rating: hexToRgb(pDark.fg_rating), // Bright gold for dark mode
		"rating-foreground": hexToRgb(pDark.fg_onEmphasis), // Near black text

		// Surface elevation (featured sections, modals)
		"surface-elevated": hexToRgb(pDark.bg_emphasis), // Neutral-800 (3rd layer, lighter than card)

		// Badge colors (neutral tags)
		badge: hexToRgb(pDark.bg_button_secondary), // Neutral-900
		"badge-foreground": hexToRgb(pDark.fg_muted), // Neutral-200

		// Interactive states - Drag and drop
		"drag-active": hexToRgb(pDark.bg_accent_active), // Blue-400 (active state)
		"drop-zone": hexToRgb(pDark.bg_emphasis), // Neutral-800 (subtle emphasis)

		// UI element colors
		border: hexToRgb(pDark.border_default), // Neutral-700
		input: hexToRgb(pDark.bg_muted), // Neutral-900 background
		ring: hexToRgb(pDark.fg_accent), // Light blue focus ring
	},
} as const;
