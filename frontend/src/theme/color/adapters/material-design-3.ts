/**
 * Material Design 3 Theme Adapter (Baseline Static)
 *
 * Maps official Material Design 3 baseline tokens to CineXplorer's unified
 * theme vocabulary. Material uses a 3-tier color architecture similar to GitLab:
 * - Brand: Purple (Material's signature primary color)
 * - Primary: Purple (filled button backgrounds)
 * - Tertiary: Maroon (contrasting accent for links/interactive text)
 *
 * **Design System Source:**
 * - Documentation: https://m3.material.io/styles/color/static/baseline
 * - Package: Material Design 3 (baseline static palette)
 *
 * **Elevation Strategy:**
 * - Material uses a 6-tier surface elevation system (surface-container-lowest → highest)
 * - We map 4 of the 6 tiers to our layer-01/02/03 system for optimal contrast
 * - Elevation communicated through surface color progression (no shadows in baseline)
 *
 * **Token Organization:**
 * - Section 1: Official mappings from Material baseline
 * - Section 2: Derived tokens (borders, interaction states, shadows)
 * - Section 3: CineXplorer extensions (app-specific semantic colors)
 *
 * Related: ADR-010 (Primary/Secondary/Tertiary hierarchy)
 */

import type { UnifiedTheme } from "../types";
import {
    materialPaletteLight,
    materialPaletteDark,
} from "../palettes/material-design-3";
import { createExtensions } from "../extensions";
import {
    adjustColor,
    deriveBorderHierarchy,
    deriveInteractionStates,
} from "../utils";

/**
 * Material Design 3 palette type (light or dark mode).
 */
export type MaterialPalette = typeof materialPaletteLight | typeof materialPaletteDark;

/**
 * Create Material Design 3 adapter mapping to unified theme vocabulary.
 *
 * @param mode - Color mode (light or dark)
 * @returns UnifiedTheme with all tokens mapped
 *
 * @example
 * ```typescript
 * const lightTheme = createMaterialAdapter('light');
 * const darkTheme = createMaterialAdapter('dark');
 * ```
 */
export function createMaterialAdapter(mode: "light" | "dark"): UnifiedTheme {
    // Select palette based on mode
    const palette = mode === "light" ? materialPaletteLight : materialPaletteDark;

    // ===================================================================
    // SECTION 1: OFFICIAL MAPPINGS (Material Baseline)
    // ===================================================================
    // Material Design 3 provides a 6-tier surface elevation system.
    // We select 4 tiers that provide optimal contrast progression:
    // - background: surface (base page color)
    // - layer-01: surface-container (cards, sheets, menus)
    // - layer-02: surface-container-high (elevated dialogs)
    // - layer-03: surface-container-highest (highest elevation)
    //
    // Note: We skip surfaceContainerLowest (pure white/black) for better contrast.
    // Material's "surface" token is semantically the page background, not elevated content.

    // Core structure (4-tier mapping from 6-tier Material system)
    const background = palette.surface; // #FEF7FF light, #141218 dark (page background)
    const foreground = palette.onSurface; // #1D1B20 light, #E6E0E9 dark
    const layer01 = palette.surfaceContainer; // #F3EDF7 light, #211F26 dark (cards, sheets, menus)
    const layer02 = palette.surfaceContainerHigh; // #ECE6F0 light, #2B2930 dark (elevated)
    const layer03 = palette.surfaceContainerHighest; // #E6E0E9 light, #36343B dark (highest)

    // Popover (typically layer-02 or layer-03 context)
    const popover = layer02;
    const popoverForeground = foreground;

    // Semantic colors (official Material baseline) - ADR-010 compliant mappings
    // Material Design 3 uses a 3-tier color architecture:
    // - Brand: Purple (Material's signature primary color)
    // - Primary: Purple (action buttons, same as brand for Material)
    // - Tertiary: Maroon (contrasting accent per Material baseline)

    // BRAND: Purple (Material's signature brand color)
    // Token type: BRAND (logo, brand identity)
    const brand = palette.primary; // PURPLE (#6750A4 light, #D0BCFF dark)

    // PRIMARY: Purple background token for action buttons (ADR-010)
    // Token type: BACKGROUND (for filled buttons, FABs)
    // Rationale: Material uses primary purple for prominent actions
    // Note: Same value as brand (Material unifies brand + primary unlike GitLab)
    const primary = palette.primary; // PURPLE (#6750A4 light, #D0BCFF dark)
    const primaryForeground = palette.onPrimary; // #FFFFFF light, #381E72 dark

    // SECONDARY: Gray-purple background + mandatory 1px border (ADR-010)
    // Token type: BACKGROUND + BORDER
    const secondary = palette.secondary; // #625B71 light, #CCC2DC dark
    const secondaryForeground = palette.onSecondary; // #FFFFFF light, #332D41 dark

    // MUTED: Deemphasized, non-interactive (using surface-variant per Material)
    const muted = palette.surfaceVariant; // #E7E0EC light, #49454F dark
    const mutedForeground = palette.onSurfaceVariant; // #49454F light, #CAC4D0 dark

    // TERTIARY: Maroon foreground token for links/interactive text (ADR-010)
    // Token type: FOREGROUND (for text, links, icons)
    // Rationale: Material baseline specifies tertiary as contrasting accent
    // Distinction: tertiary is FOREGROUND (links), primary is BACKGROUND (buttons)
    const tertiary = palette.tertiary; // MAROON (#7D5260 light, #EFB8C8 dark)
    const tertiaryForeground = palette.onTertiary; // #FFFFFF light, #492532 dark

    // ACCENT: @deprecated - Use tertiary instead (ADR-010 Phase 4 migration)
    // Maintained as alias during component migration period
    const accent = palette.tertiary; // Same as tertiary
    const accentForeground = palette.onTertiary;

    // DESTRUCTIVE: Red for errors/delete actions (Material baseline error color)
    const destructive = palette.error; // #B3261E light, #F2B8B5 dark
    const destructiveForeground = palette.onError; // #FFFFFF light, #601410 dark

    // ===================================================================
    // SECTION 2: DERIVED TOKENS (Unofficial - For Consistency)
    // ===================================================================
    // These tokens don't exist in Material baseline but are derived to provide
    // consistent vocabulary across all themes. Clearly marked as derived.

    // Border hierarchy: Material provides outline + outline-variant
    // - outline: Standard borders (#79747E light, #938F99 dark)
    // - outline-variant: Lower contrast borders (#CAC4D0 light, #49454F dark)
    const border = palette.outline; // Standard border (for legacy token)
    const borderSubtle00 = palette.outlineVariant; // Lower contrast
    const borderStrong01 = palette.outline; // Standard/strong borders

    // Derive remaining border tokens from Material's two border colors
    const borderHierarchy = deriveBorderHierarchy(
        palette.outlineVariant, // Subtle base
        palette.outline, // Strong base
        "progressive", // Material uses progressive elevation in both modes
    );
    const borderSubtle02 = borderHierarchy.subtle02;
    const borderStrong02 = borderHierarchy.strong02;
    const borderStrong03 = borderHierarchy.strong03;

    // Interaction states: Derive hover/selected/active per layer
    // Material doesn't provide these systematically - we derive from layer colors
    const layer01States = deriveInteractionStates(layer01, foreground);
    const layer02States = deriveInteractionStates(layer02, foreground);

    // Shadows: Material baseline doesn't define shadows (relies on surface elevation)
    // Derive minimal conservative shadows for cross-theme consistency
    const shadowSm = mode === "light"
        ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
        : "0 1px 2px 0 rgba(0, 0, 0, 0.3)";
    const shadowMd = mode === "light"
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)";
    const shadowLg = mode === "light"
        ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        : "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)";

    // Input border: Use standard outline
    const input = palette.outline;

    // Focus ring: Use tertiary accent for consistency
    const ring = palette.tertiary;

    // Status colors: Material baseline doesn't include success/warning/info
    // Use industry-standard status color conventions (can be tweaked in practice)
    // SUCCESS: Green (standard positive feedback)
    const success = mode === "light" ? "#2E7D32" : "#66BB6A"; // Material green 700/400
    const successForeground = "#FFFFFF";
    const onSuccess = "#FFFFFF";

    // WARNING: Amber/Orange (standard caution/alert)
    const warning = mode === "light" ? "#F57C00" : "#FFA726"; // Material orange 700/400
    const warningForeground = mode === "light" ? "#FFFFFF" : "#000000";
    const onWarning = mode === "light" ? "#FFFFFF" : "#000000";

    // INFO: Blue (standard informational)
    const info = mode === "light" ? "#1976D2" : "#42A5F5"; // Material blue 700/400
    const infoForeground = "#FFFFFF";
    const onInfo = "#FFFFFF";

    // On-status colors for solid backgrounds
    const onDestructive = destructiveForeground;

    // Hover state for tertiary (derive from tertiary color)
    const accentHover = mode === "light"
        ? adjustColor(palette.tertiary, -10) // Darken for light mode
        : adjustColor(palette.tertiary, 10); // Lighten for dark mode

    // ===================================================================
    // SECTION 3: CINEXPLORER EXTENSIONS (App-Specific)
    // ===================================================================
    // Apply centralized CineXplorer extensions adapted to Material's aesthetic

    const extensions = createExtensions(
        {
            muted: palette.surfaceVariant,
            mutedForeground: palette.onSurfaceVariant,
            accentEmphasis: layer02, // Use elevated surface for emphasis
            secondaryHover: adjustColor(palette.secondary, mode === "light" ? -5 : 5),
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

        // Shadows (derived - Material baseline doesn't specify)
        "shadow-sm": shadowSm,
        "shadow-md": shadowMd,
        "shadow-lg": shadowLg,

        // Interaction states (derived)
        "layer-hover-01": layer01States.hover,
        "layer-hover-02": layer02States.hover,
        "layer-selected-01": layer01States.selected,
        "layer-selected-02": layer02States.selected,
        "layer-active-01": layer01States.active,
        "layer-active-02": layer02States.active,

        // Semantic colors (ADR-010 compliant)
        brand, // purple for Material
        brandSecondary: undefined, // Material doesn't have secondary brand color
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
        "on-destructive": onDestructive,
        "on-warning": onWarning,
        "on-info": onInfo,

        // UI elements
        border,
        input,
        ring,

        // CineXplorer extensions
        ...extensions,
    };
}
