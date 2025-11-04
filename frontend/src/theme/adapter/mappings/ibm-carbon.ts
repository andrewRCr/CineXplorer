/**
 * IBM Carbon Theme Adapter
 *
 * Maps official IBM Carbon design system tokens to CineXplorer's unified
 * theme vocabulary. Carbon provides the most complete token vocabulary of the
 * three systems, requiring minimal derivation.
 *
 * **Design System Source:**
 * - Package: @carbon/themes v11.0.0
 * - Documentation: https://carbondesignsystem.com/elements/color/usage/
 *
 * **Elevation Strategy:**
 * - Primary method: Layer progression (background → layer-01 → layer-02 → layer-03)
 * - Each layer has distinct color (minimal shadows, color indicates depth)
 * - Per-layer border tokens maintain visibility at each elevation
 *
 * **Key Advantage:**
 * Carbon's rich official vocabulary requires the LEAST derivation of all three
 * themes. Most tokens map 1:1 from official Carbon tokens.
 *
 * **Critical Corrections Applied:**
 * - Dark mode (G100): border uses border_strong_01 (#6f6f6f) not border_default (#393939 = invisible!)
 * - Added layer-03 token (gray-70, #525252) for highest elevation
 * - Added per-layer border hierarchy (border-strong-01/02/03, border-subtle-00/02)
 *
 * **Token Organization:**
 * - Section 1: Official mappings (with corrections from Phase 2.2.1)
 * - Section 2: Derived tokens (minimal - only interaction states and shadows)
 * - Section 3: CineXplorer extensions (app-specific semantic colors)
 *
 * Related: ADR-005 (Unified Theme Adapter Layer)
 */

import type { UnifiedTheme } from "../types";
import {
	ibmCarbonPaletteLight,
	ibmCarbonPaletteDark,
} from "../../palettes/ibm-carbon";
import { carbonShadows } from "../shadows";
import { createExtensions } from "../extensions";
import { deriveInteractionStates } from "../utils";

/**
 * IBM Carbon palette type (light or dark mode).
 */
export type CarbonPalette =
	| typeof ibmCarbonPaletteLight
	| typeof ibmCarbonPaletteDark;

/**
 * Create IBM Carbon adapter mapping to unified theme vocabulary.
 *
 * Carbon provides the richest official token vocabulary, requiring minimal
 * derivation compared to Primer and Pajamas.
 *
 * @param mode - Color mode (light or dark)
 * @returns UnifiedTheme with all tokens mapped
 *
 * @example
 * ```typescript
 * const lightTheme = createCarbonAdapter('light');
 * const darkTheme = createCarbonAdapter('dark');
 * ```
 */
export function createCarbonAdapter(mode: "light" | "dark"): UnifiedTheme {
	// Select palette based on mode
	const palette =
		mode === "light" ? ibmCarbonPaletteLight : ibmCarbonPaletteDark;

	// ===================================================================
	// SECTION 1: OFFICIAL MAPPINGS (With Corrections)
	// ===================================================================
	// Carbon provides the most complete official vocabulary. Most tokens map
	// directly from Carbon's layer system and border hierarchy.
	//
	// CRITICAL CORRECTION (Dark Mode G100):
	// - border: border_strong_01 (#6f6f6f) NOT border_default (#393939)
	// - border_default (#393939) matches layer-02 (#393939) = invisible borders!

	// Core structure (Carbon's explicit layer system)
	const background = palette.bg_default;
	const foreground = palette.fg_default;
	const layer01 = palette.bg_layer_01; // Cards, first layer
	const layer02 = palette.bg_layer_02; // Modals, elevated surfaces
	const layer03 = palette.bg_layer_03; // Dropdowns over modals, highest elevation

	// Popover (typically layer-02/03 context)
	const popover = palette.bg_layer_02;
	const popoverForeground = palette.fg_default;

	// Border hierarchy (Carbon's official per-layer borders)
	// CRITICAL: Use border_strong_01 for default border (visible on all layers)
	const border = palette.border_strong_01; // CORRECTED from border_default
	const borderSubtle00 = palette.border_subtle_00; // Low-contrast dividers on background/layer-01
	const borderSubtle02 = palette.border_subtle_02; // Low-contrast dividers on layer-02
	const borderStrong01 = palette.border_strong_01; // Accessible borders on layer-01
	const borderStrong02 = palette.border_strong_02; // Accessible borders on layer-02
	const borderStrong03 = palette.border_strong_03; // Accessible borders on layer-03

	// Semantic colors (official Carbon)
	const primary = palette.bg_success;
	const primaryForeground = palette.fg_onEmphasis;

	const secondary = palette.bg_button_secondary;
	const secondaryForeground =
		mode === "light" ? palette.fg_onEmphasis : palette.fg_default;

	const muted = palette.bg_layer_01; // Use layer-01 for muted
	const mutedForeground = palette.fg_muted;

	const accent = palette.fg_accent;
	const accentForeground = palette.fg_onEmphasis;
	const accentHover = palette.fg_accent_hover;

	const destructive = palette.bg_danger;
	const destructiveForeground = palette.fg_onEmphasis;

	const success = palette.bg_success;
	const successForeground = palette.fg_onEmphasis;

	// Warning/Info colors (official Carbon)
	const warning = palette.fg_warning;
	const warningForeground = mode === "light" ? palette.fg_default : "#000000";
	const onWarning =
		mode === "light" ? palette.fg_default : palette.fg_onEmphasis;

	const info = palette.fg_info;
	const infoForeground = palette.fg_onEmphasis;
	const onInfo = palette.fg_onEmphasis;

	// On-status colors for solid backgrounds
	const onSuccess = palette.fg_onEmphasis;
	const onDestructive = palette.fg_onEmphasis;

	// Shadows (minimal for Carbon - layer colors indicate elevation)
	const shadows = carbonShadows[mode];

	// ===================================================================
	// SECTION 2: DERIVED TOKENS (Minimal - Carbon Provides Most)
	// ===================================================================
	// Carbon provides most tokens officially. Only derive interaction states
	// if they're not available in the palette.

	// Interaction states: Derive hover/selected/active per layer
	// Carbon has official hover states, but we ensure consistency across layers
	const layer01States = deriveInteractionStates(layer01, mode);
	const layer02States = deriveInteractionStates(layer02, mode);

	// Input border: Use subtle border for form fields
	const input = palette.border_subtle_00;

	// Focus ring: Use accent color for consistency
	const ring = palette.fg_accent;

	// ===================================================================
	// SECTION 3: CINEXPLORER EXTENSIONS (App-Specific)
	// ===================================================================
	// Apply centralized CineXplorer extensions adapted to Carbon's neutral,
	// professional aesthetic.

	const extensions = createExtensions(
		{
			muted: palette.bg_layer_01,
			mutedForeground: palette.fg_muted,
			accentEmphasis: palette.bg_emphasis,
			secondaryHover: palette.bg_button_secondary_hover,
		},
		mode,
	);

	// ===================================================================
	// UNIFIED THEME ASSEMBLY
	// ===================================================================

	return {
		// Core structure
		background,
		foreground,
		"layer-01": layer01,
		"layer-02": layer02,
		"layer-03": layer03,
		popover,
		"popover-foreground": popoverForeground,

		// Border hierarchy (mostly official Carbon)
		"border-subtle-00": borderSubtle00,
		"border-subtle-02": borderSubtle02,
		"border-strong-01": borderStrong01,
		"border-strong-02": borderStrong02,
		"border-strong-03": borderStrong03,

		// Shadows (conservative - Carbon relies on layers)
		"shadow-sm": shadows.sm,
		"shadow-md": shadows.md,
		"shadow-lg": shadows.lg,

		// Interaction states (derived)
		"layer-hover-01": layer01States.hover,
		"layer-hover-02": layer02States.hover,
		"layer-selected-01": layer01States.selected,
		"layer-selected-02": layer02States.selected,
		"layer-active-01": layer01States.active,
		"layer-active-02": layer02States.active,

		// Semantic colors (official Carbon)
		primary,
		"primary-foreground": primaryForeground,
		secondary,
		"secondary-foreground": secondaryForeground,
		muted,
		"muted-foreground": mutedForeground,
		accent,
		"accent-foreground": accentForeground,
		"accent-hover": accentHover,
		destructive,
		"destructive-foreground": destructiveForeground,
		success,
		"success-foreground": successForeground,
		warning,
		"warning-foreground": warningForeground,
		info,
		"info-foreground": infoForeground,

		// On-status colors
		"on-success": onSuccess,
		"on-warning": onWarning,
		"on-destructive": onDestructive,
		"on-info": onInfo,

		// CineXplorer extensions
		rating: extensions.rating,
		"rating-foreground": extensions["rating-foreground"],
		badge: extensions.badge,
		"badge-foreground": extensions["badge-foreground"],
		"drag-active": extensions["drag-active"],
		"drop-zone": extensions["drop-zone"],

		// UI elements
		border,
		input,
		ring,
	};
}
