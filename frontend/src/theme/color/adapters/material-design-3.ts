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
    //
    // OFFICIAL PROGRESSIVE PATTERN (Material Design 3 specification):
    // Light: #FFFFFF → #FEF7FF → #F3EDF7 → #ECE6F0 → #E6E0E9 → #E6E0E9 (progressive darkening)
    // Dark:  #0F0D13 → #141218 → #211F26 → #2B2930 → #36343B → #36343B (progressive lightening)
    //
    // Note: We skip surfaceContainerLowest (pure white/black) for better contrast.
    // Material's "surface" token is semantically the page background, not elevated content.
    //
    // CINEXPLORER PATTERN (ADR-008 - Light mode alternating for visual nesting):
    // Light: surface (#FEF7FF) → high (#ECE6F0) → surface (#FEF7FF) → high (#ECE6F0) [ALTERNATING]
    // Dark:  surface (#141218) → container (#211F26) → high (#2B2930) → highest (#36343B) [PROGRESSIVE]
    //
    // Rationale: Progressive darkening on white backgrounds becomes indistinguishable in light mode.
    // Alternating creates clear visual "nesting" - you can see when elements are inside others.

    // Core structure (ADR-008 compliant mapping)
    const background = palette.surface; // #FEF7FF light, #141218 dark (page background)
    const foreground = palette.onSurface; // #1D1B20 light, #E6E0E9 dark
    const layer01 = mode === "light"
        ? palette.surfaceContainerHigh // #ECE6F0 light (gray - alternates from white)
        : palette.surfaceContainer; // #211F26 dark (progressive)
    const layer02 = mode === "light"
        ? palette.surface // #FEF7FF light (white - alternates back!)
        : palette.surfaceContainerHigh; // #2B2930 dark (progressive)
    const layer03 = mode === "light"
        ? palette.surfaceContainerHigh // #ECE6F0 light (gray - alternates back!)
        : palette.surfaceContainerHighest; // #36343B dark (progressive)

    // Popover (typically layer-02 or layer-03 context)
    const popover = layer02;
    const popoverForeground = foreground;

    // Semantic colors (official Material baseline) - ADR-010 compliant mappings
    // Material Design 3 uses a 3-tier color architecture:
    // - Brand: Purple (Material's signature primary color)
    // - Primary: Purple (action buttons, same as brand for Material)
    // - Tertiary: Maroon (contrasting accent per Material baseline)
    //
    // NOTE: Material provides native `on-*` tokens (onPrimary, onSecondary, etc.) that we use directly
    // All follow ADR-011 canonical naming convention

    // BRAND: Purple (Material's signature brand color)
    // Token type: BRAND (logo, brand identity)
    const brand = palette.primary; // PURPLE (#6750A4 light, #D0BCFF dark)

    // PRIMARY: Purple background token for action buttons (ADR-010)
    // Token type: BACKGROUND (for filled buttons, FABs)
    // Rationale: Material uses primary purple for prominent actions
    // Note: Same value as brand (Material unifies brand + primary unlike GitLab)
    const primary = palette.primary; // PURPLE (#6750A4 light, #D0BCFF dark)
    const onPrimary = palette.onPrimary; // Material native on-* token

    // SECONDARY: Gray-purple background + mandatory 1px border (ADR-010)
    // Token type: BACKGROUND + BORDER
    const secondary = palette.secondary; // #625B71 light, #CCC2DC dark
    const onSecondary = palette.onSecondary; // Material native on-* token

    // MUTED: Deemphasized, non-interactive (using surface-variant per Material)
    const muted = palette.surfaceVariant; // #E7E0EC light, #49454F dark
    const onMuted = palette.onSurfaceVariant; // Material native on-* token

    // TERTIARY: Maroon foreground token for links/interactive text (ADR-010)
    // Token type: FOREGROUND (for text, links, icons)
    // Rationale: Material baseline specifies tertiary as contrasting accent
    // Distinction: tertiary is FOREGROUND (links), primary is BACKGROUND (buttons)
    const tertiary = palette.tertiary; // MAROON (#7D5260 light, #EFB8C8 dark)
    const onTertiary = palette.onTertiary; // Material native on-* token

    // ACCENT: @deprecated - Use tertiary instead (replaced by standard tertiary naming per ADR-010)
    // Maintained as alias for backward compatibility
    const accent = palette.tertiary; // Same as tertiary

    // Status colors
    // NOTE: Material baseline only provides error (destructive). Success/warning/info are derived.
    const destructive = palette.error; // Material baseline error color
    const onDestructive = palette.onError; // Material native on-* token

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
        mode === "light" ? "alternating" : "progressive", // ADR-008: alternating in light, progressive in dark
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

    // Additional status colors (derived - Material baseline lacks official tokens)
    // Derived from Material color roles for consistency
    const success = mode === "light" ? "#2E7D32" : "#66BB6A"; // Material green 700/400
    const onSuccess = "#FFFFFF"; // Derived
    const warning = mode === "light" ? "#F57C00" : "#FFA726"; // Material orange 700/400
    const onWarning = mode === "light" ? "#FFFFFF" : "#000000"; // Derived
    const info = mode === "light" ? "#1976D2" : "#42A5F5"; // Material blue 700/400
    const onInfo = "#FFFFFF"; // Derived

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
        secondary,
        "on-secondary": onSecondary, // ADR-011: Material native on-* token
        muted,
        "on-muted": onMuted, // ADR-011: Material native on-* token
        tertiary,
        "on-tertiary": onTertiary, // ADR-011: Material native on-* token
        accent, // @deprecated alias (ADR-010)
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
        success,
        "on-success": onSuccess, // ADR-011: Derived on-* token (Material baseline lacks)
        warning,
        "on-warning": onWarning, // ADR-011: Derived on-* token (Material baseline lacks)
        info,
        "on-info": onInfo, // ADR-011: Derived on-* token (Material baseline lacks)

        // UI elements
        border,
        input,
        ring,

        // CineXplorer extensions
        ...extensions,
    };
}
