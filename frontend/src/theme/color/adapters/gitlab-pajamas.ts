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
 * - Section 1: Official mappings (with contrast corrections)
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
    // KEY CORRECTIONS for contrast compliance:
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

    // Semantic colors (official Pajamas) - ADR-010 compliant mappings
    // GitLab Pajamas brand colors per design.gitlab.com/brand-design/color:
    // - Brand: 3 ORANGES from tanuki logo (Orange 01p/02p/03p)
    // - Actions (buttons): ORANGE 01p (#fca326 brightest orange, matches brand)
    // - Interactive text (links): PURPLE (#7759c2 Purple 02p light, #a989f5 Purple 01p dark) - UI accent, NOT brand
    //
    // NOTE: All `on-*` tokens follow ADR-011 canonical naming (on-primary, on-secondary, etc.)

    // BRAND: GitLab brand orange (primary brand color from logo) - ADR-010
    const brand = palette.brand_orange; // ORANGE 01p (#fca326, brightest in logo gradient)

    // BRAND SECONDARY: GitLab medium orange (secondary brand color from logo) - ADR-010
    const brandSecondary = palette.brand_orange_medium; // ORANGE 02p (#fc6d26, middle of logo gradient)

    // PRIMARY: Brand orange for action buttons (ADR-010)
    // Token type: BACKGROUND (for filled buttons)
    // Rationale: Light mode uses medium orange for better contrast, dark mode uses brightest for impact
    const primary = mode === "light"
        ? palette.brand_orange_medium  // Light: Orange 02p (#fc6d26, better contrast on white)
        : palette.brand_orange;        // Dark: Orange 01p (#fca326, brightest for impact)
    const onPrimary = palette.fg_onEmphasis;

    // SECONDARY: Gray background + mandatory 1px border (ADR-010)
    // Token type: BACKGROUND + BORDER
    // Fixed: Now uses neutral gray for visibility on white backgrounds
    const secondary = palette.bg_button_secondary;
    const onSecondary = mode === "light"
        ? palette.fg_onEmphasis  // Light mode: white text on medium gray
        : palette.fg_default;     // Dark mode: light gray text on dark gray

    // MUTED: Deemphasized, non-interactive
    const muted = palette.bg_section; // Use section token for muted
    const onMuted = palette.fg_muted;

    // TERTIARY: Purple foreground token for links/interactive text (ADR-010)
    // Token type: FOREGROUND (for text, links, icons)
    // Rationale: GitLab uses purple for links (Purple 02p light, Purple 01p dark)
    // Brand-aligned but semantically distinct from brand token
    // Distinction: tertiary is FOREGROUND (links), primary is BACKGROUND (buttons)
    const tertiary = palette.fg_link_purple; // PURPLE (#7759c2 light, #a989f5 dark)
    const onTertiary = palette.fg_onEmphasis; // Rarely used

    // ACCENT: @deprecated - Use tertiary instead (per ADR-010)
    // Maintained as alias during component migration period
    const accent = palette.fg_link_purple; // Same as tertiary
    const accentHover = palette.fg_accent_hover;

    // Status colors: destructive, success, warning, info (official GitLab tokens)
    const destructive = palette.bg_danger;
    const onDestructive = palette.fg_onEmphasis;
    const success = palette.bg_success;
    const onSuccess = palette.fg_onEmphasis;
    const warning = palette.fg_warning;
    const onWarning = palette.fg_onEmphasis;
    const info = palette.fg_info;
    const onInfo = palette.fg_onEmphasis;

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

    // Color-based interaction states (ADR-009): For buttons and semantic colors
    const primaryStates = deriveInteractionStates(primary, onPrimary);
    const secondaryStates = deriveInteractionStates(secondary, onSecondary);

    // Tertiary interaction states: For links/interactive text (foreground token)
    const tertiaryHover = adjustColor(tertiary, mode === "light" ? -10 : 15); // Slightly darker/lighter
    const tertiaryActive = adjustColor(tertiary, mode === "light" ? -15 : 10); // More pronounced

    // Input border: Use subtle border for form fields
    const input = palette.border_subtle;

    // Focus ring: Use tertiary (link purple) for thematic consistency (ADR-015)
    // Per ADR-015: ring token maps to tertiary to maintain visual consistency
    // across all focus indicators within each theme
    const ring = palette.fg_link_purple;

    // ===================================================================
    // SECTION 3: CINEXPLORER EXTENSIONS (App-Specific)
    // ===================================================================
    // Apply centralized CineXplorer extensions adapted to Pajamas' clean,
    // semantic aesthetic.

    const extensions = createExtensions(
        {
            muted: palette.bg_section,
            mutedForeground: palette.fg_muted,
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
        "on-popover": popoverForeground,

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

        // Semantic colors (ADR-010 + ADR-011 compliant)
        brand, // GitLab brand orange (Orange 01p, brightest)
        "on-brand": onPrimary, // ADR-011: White text on orange background
        brandSecondary, // GitLab medium orange (Orange 02p, middle gradient)
        "on-brandSecondary": onPrimary, // ADR-011: White text on orange background
        brandTertiary: palette.brand_tanuki_red, // GitLab tanuki red (Orange 03p, darkest in logo)
        "on-brandTertiary": onPrimary, // ADR-011: White text on tanuki red background
        "button-outline": borderStrong01, // ADR-012: Neutral outline (DEFAULT) uses border
        "on-button-outline": foreground, // ADR-012: Neutral outline text
        "button-outline-primary": primary, // ADR-012: Primary outline (EXPLICIT) uses primary color
        "on-button-outline-primary": primary, // ADR-012: Primary outline text (same as border on transparent bg)
        "button-subtle": secondary, // ADR-012: Subtle buttons use secondary color
        "on-button-subtle": onSecondary, // ADR-012
        "button-subtle-selected": layer02States.selected, // ADR-012: Selected state for subtle buttons
        "on-button-subtle-selected": foreground, // ADR-012: Text on selected subtle buttons
        primary,
        "on-primary": onPrimary, // ADR-011: Canonical naming
        secondary,
        "on-secondary": onSecondary, // ADR-011: Canonical naming
        muted,
        "on-muted": onMuted, // ADR-011: Canonical naming
        tertiary,
        "on-tertiary": onTertiary, // ADR-011: Canonical naming
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
        "on-destructive": onDestructive, // ADR-011: Canonical naming
        success,
        "on-success": onSuccess, // ADR-011: Canonical naming
        warning,
        "on-warning": onWarning, // ADR-011: Canonical naming
        info,
        "on-info": onInfo, // ADR-011: Canonical naming

        // CineXplorer extensions
        "imdb-gold": extensions["imdb-gold"],
        badge: extensions.badge,
        "on-badge": extensions["badge-foreground"],
        "drag-active": extensions["drag-active"],
        "drop-zone": extensions["drop-zone"],

        // UI elements
        border,
        input,
        ring,
    };
}
