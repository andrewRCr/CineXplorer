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
    const onPrimary = palette.onPrimary; // ADR-011: Material native on-* token (#FFFFFF light, #381E72 dark)
    const primaryForeground = onPrimary; // @deprecated: Use on-primary instead (ADR-011)

    // SECONDARY: Gray-purple background + mandatory 1px border (ADR-010)
    // Token type: BACKGROUND + BORDER
    const secondary = palette.secondary; // #625B71 light, #CCC2DC dark
    const onSecondary = palette.onSecondary; // ADR-011: Material native on-* token (#FFFFFF light, #332D41 dark)
    const secondaryForeground = onSecondary; // @deprecated: Use on-secondary instead (ADR-011)

    // MUTED: Deemphasized, non-interactive (using surface-variant per Material)
    const muted = palette.surfaceVariant; // #E7E0EC light, #49454F dark
    const onMuted = palette.onSurfaceVariant; // ADR-011: Material native on-* token (#49454F light, #CAC4D0 dark)
    const mutedForeground = onMuted; // @deprecated: Use on-muted instead (ADR-011)

    // TERTIARY: Maroon foreground token for links/interactive text (ADR-010)
    // Token type: FOREGROUND (for text, links, icons)
    // Rationale: Material baseline specifies tertiary as contrasting accent
    // Distinction: tertiary is FOREGROUND (links), primary is BACKGROUND (buttons)
    const tertiary = palette.tertiary; // MAROON (#7D5260 light, #EFB8C8 dark)
    const onTertiary = palette.onTertiary; // ADR-011: Material native on-* token (#FFFFFF light, #492532 dark)
    const tertiaryForeground = onTertiary; // @deprecated: Use on-tertiary instead (ADR-011)

    // ACCENT: @deprecated - Use tertiary instead (ADR-010 Phase 4 migration)
    // Maintained as alias during component migration period
    const accent = palette.tertiary; // Same as tertiary
    const accentForeground = palette.onTertiary;

    // DESTRUCTIVE: Red for errors/delete actions (Material baseline error color)
    const destructive = palette.error; // #B3261E light, #F2B8B5 dark
    const onDestructive = palette.onError; // ADR-011: Material native on-* token (#FFFFFF light, #601410 dark)
    const destructiveForeground = onDestructive; // @deprecated: Use on-destructive instead (ADR-011)

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

    // Color-based interaction states (ADR-009): For buttons and semantic colors
    const primaryStates = deriveInteractionStates(primary, onPrimary);
    const secondaryStates = deriveInteractionStates(secondary, onSecondary);

    // Tertiary interaction states: For links/interactive text (foreground token)
    const tertiaryHover = mode === "light"
        ? adjustColor(palette.tertiary, -10) // Darken for light mode
        : adjustColor(palette.tertiary, 10); // Lighten for dark mode
    const tertiaryActive = mode === "light"
        ? adjustColor(palette.tertiary, -15) // More pronounced darkening
        : adjustColor(palette.tertiary, 5); // Subtle lightening

    // SHADOWS: Material baseline doesn't define shadows (relies on surface tonal elevation)
    // Rationale for derived shadows:
    //   - MD3's primary elevation: Tonal surface progression (lighter = higher)
    //     Already implemented via our 4-tier layer system (background → layer-01/02/03)
    //   - Our shadows: Optional enhancement for cross-theme consistency (ADR-006)
    //   - NOT required for elevation visibility (layers handle that per ADR-006)
    //   - Philosophical alignment: Both MD3 and our system prioritize surface color over shadows
    //   - Conservative opacity ensures shadows supplement rather than conflict with tonal elevation
    // Note: CineXplorer's unified theme system prioritizes consistent vocabulary across themes
    //       over perfect fidelity to any single design system (ADR-006)
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

    // Status colors: Material baseline doesn't include success/warning/info (only error)
    // Derive from Material color roles (onPrimaryContainer, etc.) for consistency
    // Per ADR-011: Material lacks official on-success/on-warning/on-info in static baseline

    // SUCCESS: Green (standard positive feedback - Material green 700/400)
    const success = mode === "light" ? "#2E7D32" : "#66BB6A";
    const onSuccess = "#FFFFFF"; // ADR-011: Derived on-* token (Material baseline lacks official)
    const successForeground = onSuccess; // @deprecated: Use on-success instead (ADR-011)

    // WARNING: Amber/Orange (standard caution/alert - Material orange 700/400)
    const warning = mode === "light" ? "#F57C00" : "#FFA726";
    const onWarning = mode === "light" ? "#FFFFFF" : "#000000"; // ADR-011: Derived on-* token
    const warningForeground = onWarning; // @deprecated: Use on-warning instead (ADR-011)

    // INFO: Blue (standard informational - Material blue 700/400)
    const info = mode === "light" ? "#1976D2" : "#42A5F5";
    const onInfo = "#FFFFFF"; // ADR-011: Derived on-* token
    const infoForeground = onInfo; // @deprecated: Use on-info instead (ADR-011)

    // Accent hover state (deprecated - aliased to tertiaryHover)
    const accentHover = tertiaryHover;

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
        "on-popover": popoverForeground,
        "popover-foreground": popoverForeground, // @deprecated - alias for on-popover (ADR-011)

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

        // Semantic colors (ADR-010 + ADR-011 compliant)
        brand, // purple for Material
        "on-brand": onPrimary, // ADR-011: Maps to on-primary (brand IS primary purple)
        brandSecondary: undefined, // Material doesn't have secondary brand color
        "on-brandSecondary": undefined, // No brandSecondary token
        "button-outline": borderStrong01, // ADR-012: Neutral outline (DEFAULT) uses border
        "on-button-outline": foreground, // ADR-012: Neutral outline text
        "button-outline-primary": primary, // ADR-012: Primary outline (EXPLICIT) uses primary color
        "on-button-outline-primary": primary, // ADR-012: Primary outline text (same as border on transparent bg)
        "button-subtle": secondary, // ADR-012: Subtle buttons use secondary color
        "on-button-subtle": onSecondary, // ADR-012
        "button-subtle-selected": layer02States.selected, // ADR-012: Selected state for subtle buttons
        "on-button-subtle-selected": foreground, // ADR-012: Text on selected subtle buttons
        primary,
        "on-primary": onPrimary, // ADR-011: Material native on-* token
        "primary-foreground": primaryForeground, // @deprecated
        secondary,
        "on-secondary": onSecondary, // ADR-011: Material native on-* token
        "secondary-foreground": secondaryForeground, // @deprecated
        muted,
        "on-muted": onMuted, // ADR-011: Material native on-* token
        "muted-foreground": mutedForeground, // @deprecated
        tertiary,
        "on-tertiary": onTertiary, // ADR-011: Material native on-* token
        "tertiary-foreground": tertiaryForeground, // @deprecated
        accent, // @deprecated alias (ADR-010)
        "accent-foreground": accentForeground, // @deprecated
        "accent-hover": accentHover,

        // Interaction state tokens (ADR-009)
        "primary-hover": primaryStates.hover,
        "primary-active": primaryStates.active,
        "secondary-hover": secondaryStates.hover,
        "secondary-active": secondaryStates.active,
        "tertiary-hover": tertiaryHover,
        "tertiary-active": tertiaryActive,

        destructive,
        "on-destructive": onDestructive, // ADR-011: Material native on-* token
        "destructive-foreground": destructiveForeground, // @deprecated
        success,
        "on-success": onSuccess, // ADR-011: Derived on-* token (Material baseline lacks)
        "success-foreground": successForeground, // @deprecated
        warning,
        "on-warning": onWarning, // ADR-011: Derived on-* token (Material baseline lacks)
        "warning-foreground": warningForeground, // @deprecated
        info,
        "on-info": onInfo, // ADR-011: Derived on-* token (Material baseline lacks)
        "info-foreground": infoForeground, // @deprecated

        // UI elements
        border,
        input,
        ring,

        // CineXplorer extensions
        ...extensions,
    };
}
