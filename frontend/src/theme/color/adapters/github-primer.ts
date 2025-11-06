/**
 * GitHub Primer Theme Adapter
 *
 * Maps official GitHub Primer design system tokens to CineXplorer's unified
 * theme vocabulary. This adapter applies corrections discovered during Phase 1
 * research and generates derived tokens for consistency across themes.
 *
 * **Design System Source:**
 * - Package: @primer/primitives v8.x
 * - Documentation: https://primer.style/product/primitives/color/
 *
 * **Elevation Strategy:**
 * - Primary method: Shadows (bgColor-default with varying shadow levels)
 * - Layer progression: Minimal (bg_default → bg_muted, shadow-based elevation)
 * - layer-03: Derived from layer-02 (shadows provide differentiation)
 *
 * **Token Organization:**
 * - Section 1: Official mappings (with corrections from Phase 1 research)
 * - Section 2: Derived tokens (unofficial, for cross-theme consistency)
 * - Section 3: CineXplorer extensions (app-specific semantic colors)
 *
 * Related: ADR-005 (Unified Theme Adapter Layer)
 */

import type { UnifiedTheme } from "../types";
import {
    githubPaletteLight,
    githubPaletteDark,
} from "../palettes/github-primer";
import { primerShadows } from "../shadows";
import { createExtensions } from "../extensions";
import {
    adjustColor,
    deriveBorderHierarchy,
    deriveInteractionStates,
} from "../utils";

/**
 * GitHub Primer palette type (light or dark mode).
 */
export type GitHubPalette = typeof githubPaletteLight | typeof githubPaletteDark;

/**
 * Create GitHub Primer adapter mapping to unified theme vocabulary.
 *
 * @param mode - Color mode (light or dark)
 * @returns UnifiedTheme with all tokens mapped
 *
 * @example
 * ```typescript
 * const lightTheme = createGithubAdapter('light');
 * const darkTheme = createGithubAdapter('dark');
 * ```
 */
export function createGithubAdapter(mode: "light" | "dark"): UnifiedTheme {
    // Select palette based on mode
    const palette = mode === "light" ? githubPaletteLight : githubPaletteDark;

    // ===================================================================
    // SECTION 1: OFFICIAL MAPPINGS (With Corrections)
    // ===================================================================
    // These mappings use official Primer tokens. Corrections from Phase 1:
    // - Light mode: card uses bg_muted (was incorrectly bg_default - indistinguishable)
    // - Both modes: surface-elevated uses bg_default + shadow (was bg_emphasis - blue tint)
    // - Both modes: Added border_emphasis for accessible borders

    // Core structure
    const background = palette.bg_default;
    const foreground = palette.fg_default;
    const layer01 = palette.bg_muted; // Official: Cards use bg_muted

    // DERIVED: Alternating pattern (ADR-008) - Carbon-inspired for consistency
    // Dark mode: Progressive lightening (7% adjustment from layer-01)
    // Light mode: Alternating (bg_default ↔ bg_muted pattern)
    const layer02 = mode === "light"
        ? palette.bg_default // Alternates back to background (white)
        : adjustColor(palette.bg_muted, 7); // Progressive for dark mode

    // Popover (typically layer-02 context)
    const popover = palette.bg_default;
    const popoverForeground = palette.fg_default;

    // Border (official Primer tokens)
    const border = palette.border_default;
    const borderStrong01 = palette.border_emphasis; // NEW: Added in Task 2.1.1

    // Semantic colors (official Primer)
    const primary = palette.bg_success;
    const primaryForeground = palette.fg_onEmphasis;

    const secondary = palette.bg_button_secondary;
    const secondaryForeground = palette.fg_default;

    const muted = palette.bg_muted;
    const mutedForeground = palette.fg_muted;

    const accent = palette.fg_accent;
    const accentForeground = palette.fg_onEmphasis;
    const accentHover = palette.fg_accent_hover;

    const destructive = palette.bg_danger;
    const destructiveForeground = palette.fg_onEmphasis;

    const success = palette.bg_success;
    const successForeground = palette.fg_onEmphasis;

    // Shadows (official Primer shadow tokens)
    const shadows = primerShadows[mode];

    // ===================================================================
    // SECTION 2: DERIVED TOKENS (Unofficial - For Consistency)
    // ===================================================================
    // These tokens don't exist in official Primer but are derived to provide
    // consistent vocabulary across all themes. Clearly marked as derived.

    // DERIVED: layer-03 alternates again (ADR-008)
    // Dark mode: Progressive lightening continues from layer-02
    // Light mode: Alternates back to gray (same as layer-01)
    const layer03 = mode === "light"
        ? palette.bg_muted // Alternates back to gray (matches layer-01)
        : adjustColor(layer02, 7); // Progressive for dark mode

    // Border hierarchy: Primer has single border token + emphasis
    // Derivation: Generate per-layer borders for consistency with Carbon pattern
    const borderHierarchy = deriveBorderHierarchy(palette.border_default, mode);
    const borderSubtle00 = borderHierarchy.subtle00; // = border_default
    const borderSubtle02 = borderHierarchy.subtle02; // Slightly darker/lighter for layer-02
    const borderStrong02 = borderHierarchy.strong02; // More contrast for layer-02
    const borderStrong03 = borderHierarchy.strong03; // Most contrast for layer-03

    // Interaction states: Derive hover/selected/active per layer
    // Primer doesn't provide these systematically - we derive from layer colors
    const layer01States = deriveInteractionStates(layer01, mode);
    const layer02States = deriveInteractionStates(layer02, mode);

    // Input border: Use standard border
    const input = palette.border_default;

    // Focus ring: Use accent color for consistency
    const ring = palette.fg_accent;

    // Warning colors: Derived from Primer's attention scale (yellow-based)
    // Note: These were in palette previously, now derived in adapter
    const warning = mode === "light" ? "#d4a72c" : "#bb8009";
    const warningForeground = mode === "light" ? "#744500" : "#e3b341";
    const onWarning = "#ffffff";

    // Info colors: Derived from Primer's accent blue
    const info = palette.fg_accent;
    const infoForeground = palette.fg_accent;
    const onInfo = palette.fg_onEmphasis;

    // On-status colors for solid backgrounds
    const onSuccess = palette.fg_onEmphasis;
    const onDestructive = palette.fg_onEmphasis;

    // ===================================================================
    // SECTION 3: CINEXPLORER EXTENSIONS (App-Specific)
    // ===================================================================
    // Apply centralized CineXplorer extensions adapted to Primer's aesthetic

    const extensions = createExtensions(
        {
            muted: palette.bg_muted,
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

        // Border hierarchy
        "border-subtle-00": borderSubtle00,
        "border-subtle-02": borderSubtle02,
        "border-strong-01": borderStrong01,
        "border-strong-02": borderStrong02,
        "border-strong-03": borderStrong03,

        // Shadows (official Primer)
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

        // Semantic colors (official Primer)
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
