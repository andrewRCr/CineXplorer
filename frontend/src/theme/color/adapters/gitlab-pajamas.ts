/**
 * GitLab Pajamas Theme Adapter
 *
 * Maps official GitLab Pajamas design system tokens to CineXplorer's unified
 * theme vocabulary. Uses semantic section tokens for cards and shadow-based
 * elevation for overlays.
 *
 * **Design System Source:**
 * - Package: @gitlab/ui (design tokens)
 * - Documentation: https://design.gitlab.com/product-foundations/color/
 *
 * **Elevation Strategy:**
 * - Official Pajamas: Shadows (gl-shadow-sm/md/lg for elevation)
 * - CineXplorer: Derived layer colors for consistency (Carbon-inspired)
 * - Trade-off: Simple component code + consistency > design system purity
 *
 * **Key Correction:**
 * Pajamas uses semantic "section" token (neutral-50) for cards - NOT neutral-10
 * which provides only 1.02:1 contrast. GitLab docs state: "Each combination has
 * a **noticeable difference** between border and background."
 *
 * **Border Philosophy:**
 * Pajamas openly acknowledges "partial support" for WCAG 3:1 non-text contrast.
 * Uses subtle borders aesthetically, provides stronger variants for clarity.
 *
 * **Token Organization:**
 * - Section 1: Official mappings (with corrections from Phase 2.3.1)
 * - Section 2: Derived tokens (border hierarchy, interaction states, layer-03)
 * - Section 3: CineXplorer extensions (app-specific semantic colors)
 *
 * Related: ADR-005 (Unified Theme Adapter Layer), ADR-006 (Layer-Based Elevation Standard)
 */

import type { UnifiedTheme } from "../types";
import {
    gitlabPajamasPaletteLight,
    gitlabPajamasPaletteDark,
} from "../palettes/gitlab-pajamas";
import { pajamasShadows } from "../shadows";
import { createExtensions } from "../extensions";
import {
    adjustColor,
    deriveBorderHierarchy,
    deriveInteractionStates,
} from "../utils";

/**
 * GitLab Pajamas palette type (light or dark mode).
 */
export type PajamasPalette =
    | typeof gitlabPajamasPaletteLight
    | typeof gitlabPajamasPaletteDark;

/**
 * Create GitLab Pajamas adapter mapping to unified theme vocabulary.
 *
 * Pajamas uses shadow-based elevation similar to Primer, but with semantic
 * section tokens for structural elements like cards.
 *
 * @param mode - Color mode (light or dark)
 * @returns UnifiedTheme with all tokens mapped
 *
 * @example
 * ```typescript
 * const lightTheme = createPajamasAdapter('light');
 * const darkTheme = createPajamasAdapter('dark');
 * ```
 */
export function createPajamasAdapter(mode: "light" | "dark"): UnifiedTheme {
    // Select palette based on mode
    const palette =
        mode === "light" ? gitlabPajamasPaletteLight : gitlabPajamasPaletteDark;

    // ===================================================================
    // SECTION 1: OFFICIAL MAPPINGS (With Corrections)
    // ===================================================================
    // Pajamas provides semantic section tokens and shadow-based elevation.
    //
    // KEY CORRECTIONS (from Phase 2.3.1):
    // - card: bg_section (neutral-50) NOT bg_muted (neutral-10, 1.02:1 contrast)
    // - border: border_strong (neutral-200/600) NOT border_default (1.17:1 contrast)

    // Core structure (Pajamas semantic + shadow-based)
    const background = palette.bg_default;
    const foreground = palette.fg_default;
    const layer01 = palette.bg_section; // Official: Cards use bg_section

    // DERIVED: Alternating pattern (ADR-008) - Carbon-inspired for consistency
    // Dark mode: Progressive lightening (7% adjustment from layer-01)
    // Light mode: Alternating (bg_default ↔ bg_section pattern)
    const layer02 = mode === "light"
        ? palette.bg_default // Alternates back to background (white)
        : adjustColor(palette.bg_section, 7); // Progressive for dark mode

    // Popover (typically layer-02 context with shadow)
    const popover = palette.bg_elevated;
    const popoverForeground = palette.fg_default;

    // Border (use improved contrast tokens)
    const border = palette.border_strong; // CORRECTED: From border_default (insufficient contrast)
    const borderSubtle00 = palette.border_subtle; // Subtle dividers
    const borderStrong01 = palette.border_strong; // Accessible borders

    // Semantic colors (official Pajamas)
    const primary = palette.bg_success;
    const primaryForeground = palette.fg_onEmphasis;

    const secondary = palette.bg_button_secondary;
    const secondaryForeground = palette.fg_default;

    const muted = palette.bg_section; // Use section token for muted
    const mutedForeground = palette.fg_muted;

    const accent = palette.fg_accent;
    const accentForeground = palette.fg_onEmphasis;
    const accentHover = palette.fg_accent_hover;

    const destructive = palette.bg_danger;
    const destructiveForeground = palette.fg_onEmphasis;

    const success = palette.bg_success;
    const successForeground = palette.fg_onEmphasis;

    // Warning/Info colors (official Pajamas)
    const warning = palette.fg_warning;
    const warningForeground = palette.fg_onEmphasis;
    const onWarning = palette.fg_onEmphasis;

    const info = palette.fg_info;
    const infoForeground = palette.fg_onEmphasis;
    const onInfo = palette.fg_onEmphasis;

    // On-status colors for solid backgrounds
    const onSuccess = palette.fg_onEmphasis;
    const onDestructive = palette.fg_onEmphasis;

    // Shadows (official Pajamas gl-shadow values)
    const shadows = pajamasShadows[mode];

    // ===================================================================
    // SECTION 2: DERIVED TOKENS (For Cross-Theme Consistency)
    // ===================================================================
    // Pajamas lacks per-layer border hierarchy and layer-03. Derive these
    // for consistency with unified vocabulary.

    // DERIVED: layer-03 alternates again (ADR-008)
    // Dark mode: Progressive lightening continues from layer-02
    // Light mode: Alternates back to gray (same as layer-01)
    const layer03 = mode === "light"
        ? palette.bg_section // Alternates back to gray (matches layer-01)
        : adjustColor(layer02, 7); // Progressive for dark mode

    // Border hierarchy: Pajamas provides two border colors (subtle + strong)
    // Derivation: Generate per-layer borders following Carbon's architectural pattern
    // - Light mode (alternating layers): 2 distinct values (subtle + strong)
    // - Dark mode (progressive layers): 5 distinct values (progressive lightening)
    const borderHierarchy = deriveBorderHierarchy(
        palette.border_subtle, // Subtle base (FIXED: was incorrectly passing border_strong!)
        palette.border_strong, // Strong base
        mode === "light" ? "alternating" : "progressive", // Pattern selection per ADR-008
    );
    const borderSubtle02 = borderHierarchy.subtle02; // Same as subtle00 (light) or +12.6% (dark)
    const borderStrong02 = borderHierarchy.strong02; // Same as strong01 (light) or +20.8% (dark)
    const borderStrong03 = borderHierarchy.strong03; // Same as strong01 (light) or +23.7% compound (dark)

    // Interaction states: Derive hover/selected/active per layer
    const layer01States = deriveInteractionStates(layer01, foreground);
    const layer02States = deriveInteractionStates(layer02, foreground);

    // Input border: Use subtle border for form fields
    const input = palette.border_subtle;

    // Focus ring: Use accent color for consistency
    const ring = palette.fg_accent;

    // ===================================================================
    // SECTION 3: CINEXPLORER EXTENSIONS (App-Specific)
    // ===================================================================
    // Apply centralized CineXplorer extensions adapted to Pajamas' clean,
    // semantic aesthetic.

    const extensions = createExtensions(
        {
            muted: palette.bg_section,
            mutedForeground: palette.fg_muted,
            accentEmphasis: palette.bg_accent_hover,
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

        // Border hierarchy (derived for consistency)
        "border-subtle-00": borderSubtle00,
        "border-subtle-02": borderSubtle02,
        "border-strong-01": borderStrong01,
        "border-strong-02": borderStrong02,
        "border-strong-03": borderStrong03,

        // Shadows (official Pajamas gl-shadow values)
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

        // Semantic colors (official Pajamas)
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
