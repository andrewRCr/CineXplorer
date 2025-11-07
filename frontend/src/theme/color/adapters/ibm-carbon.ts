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
 * **CineXplorer Architectural Standard:**
 * Carbon's layer-based elevation philosophy serves as the architectural standard
 * for CineXplorer's unified theme system. All themes derive layer colors to match
 * this approach, prioritizing component simplicity and cross-theme consistency.
 *
 * **Key Advantage:**
 * Carbon's rich official vocabulary requires the LEAST derivation of all three
 * themes. Both dark and light modes use 100% official layer tokens (ADR-008).
 * Light mode: Adopts Carbon's official alternating pattern (white/gray/white/gray).
 * Dark mode: Uses Carbon's official progressive pattern (#161616 → #262626 → #393939 → #525252).
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
 * Related: ADR-005 (Unified Theme Adapter Layer), ADR-006 (Layer-Based Elevation Standard)
 */

import type { UnifiedTheme } from "../types";
import {
    ibmCarbonPaletteLight,
    ibmCarbonPaletteDark,
} from "../palettes/ibm-carbon";
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
    const layer01 = palette.bg_layer_01; // Official: Cards, first layer

    // OFFICIAL TOKENS (both modes) - ADR-008: Adopt Carbon's alternating pattern for light mode
    // Dark mode: Progressive lightening (#161616 → #262626 → #393939 → #525252)
    // Light mode: Alternating (white → gray → white → gray)
    const layer02 = palette.bg_layer_02;
    const layer03 = palette.bg_layer_03;

    // DEPRECATED (ADR-008): Previous derived progressive approach for light mode
    // These values attempted universal progressive darkening but failed visual hierarchy requirements.
    // Kept for reference:
    //   layer02 (light): adjustColor(palette.bg_layer_01, -12) = ~#e2e2e2
    //   layer03 (light): adjustColor(palette.bg_layer_01, -24) = ~#d0d0d0

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

    // Semantic colors (official Carbon) - ADR-010 compliant mappings
    // IBM Carbon uses a 1-tier unified blue architecture:
    // - Brand: BLUE (#0f62fe - IBM brand color)
    // - Actions (buttons): BLUE (same as brand)
    // - Interactive text (links): BLUE (same as brand)
    // Note: Same color value, semantically distinct tokens

    // BRAND: IBM Blue (brand identity color) - ADR-010
    const brand = palette.fg_accent; // IBM Blue (#0f62fe light, #78a9ff dark)

    // PRIMARY: Blue background token for action buttons (ADR-010)
    // Token type: BACKGROUND (fg_accent used as background)
    // Rationale: IBM uses unified blue for everything (brand = actions = links)
    // Note: Same value as brand and tertiary, but semantically distinct
    const primary = palette.fg_accent; // BLUE (#0f62fe light, #78a9ff dark)
    const primaryForeground = palette.fg_onEmphasis;

    // SECONDARY: Gray background + mandatory 1px border (ADR-010)
    // Token type: BACKGROUND + BORDER
    const secondary = palette.bg_button_secondary;
    const secondaryForeground =
        mode === "light" ? palette.fg_onEmphasis : palette.fg_default;

    // MUTED: Deemphasized, non-interactive
    const muted = palette.bg_layer_01; // Use layer-01 for muted
    const mutedForeground = palette.fg_muted;

    // TERTIARY: Blue foreground token for links/interactive text (ADR-010)
    // Token type: FOREGROUND (for text, links, icons)
    // Rationale: IBM's unified blue philosophy - same color for all interactive elements
    // Note: Same value as primary and brand, but semantically distinct
    // Distinction: tertiary is FOREGROUND (links), primary is BACKGROUND (buttons)
    const tertiary = palette.fg_accent; // BLUE (#0f62fe light, #78a9ff dark)
    const tertiaryForeground = palette.fg_onEmphasis; // Rarely used (tertiary mostly foreground-only)

    // ACCENT: @deprecated - Use tertiary instead (ADR-010 Phase 4 migration)
    // Maintained as alias during component migration period
    const accent = palette.fg_accent; // Same as tertiary
    const accentForeground = palette.fg_onEmphasis;
    const accentHover = palette.fg_accent_hover;

    // DESTRUCTIVE: Red for errors/delete actions
    const destructive = palette.bg_danger;
    const destructiveForeground = palette.fg_onEmphasis;

    // SUCCESS: Green for positive feedback (distinct from primary per ADR-010)
    // Primary = blue (actions), Success = green (feedback state)
    const success = palette.bg_success;
    const successForeground = palette.fg_onEmphasis;

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
    const layer01States = deriveInteractionStates(layer01, foreground);
    const layer02States = deriveInteractionStates(layer02, foreground);

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

        // Semantic colors (ADR-010 compliant)
        brand, // IBM Blue
        primary,
        "primary-foreground": primaryForeground,
        secondary,
        "secondary-foreground": secondaryForeground,
        muted,
        "muted-foreground": mutedForeground,
        tertiary,
        "tertiary-foreground": tertiaryForeground,
        accent, // @deprecated alias
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
