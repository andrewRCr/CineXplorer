/**
 * GitHub Primer Theme Adapter
 *
 * Maps official GitHub Primer design system tokens to CineXplorer's unified
 * theme vocabulary. This adapter applies research-driven corrections to
 * misaligned official tokens and generates derived tokens for consistency.
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
 * - Section 1: Official mappings (with research-driven corrections)
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
export type GitHubPalette =
    | typeof githubPaletteLight
    | typeof githubPaletteDark;

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
    // SECTION 1: OFFICIAL MAPPINGS
    // ===================================================================
    // These mappings use official Primer tokens with visual hierarchy adjustments:
    // - Light mode: card uses bg_muted for distinction from page background (bg_default)
    // - Both modes: surface-elevated uses bg_default + shadow (bg_emphasis adds blue tint)
    // - Both modes: border_emphasis provides accessible contrast for UI components

    // Core structure
    const background = palette.bg_default;
    const foreground = palette.fg_default;
    const layer01 = palette.bg_muted; // Official: Cards use bg_muted

    // DERIVED: Alternating pattern (ADR-008) - Carbon-inspired for consistency
    // Dark mode: Progressive lightening (7% adjustment from layer-01)
    //   - Rationale: Adopts Carbon's dark mode layer progression formula (ADR-006)
    //   - Carbon Dark uses ~6-7% brightness increase per layer (#161616 → #262626 → #393939)
    //   - 7% value standardized across all non-Carbon themes for consistency
    // Light mode: Alternating (bg_default ↔ bg_muted pattern)
    //   - Rationale: ADR-008 adopts Carbon's alternating pattern for light mode
    const layer02 =
        mode === "light"
            ? palette.bg_default // Alternates back to background (white)
            : adjustColor(palette.bg_muted, 7); // Progressive for dark mode

    // Popover (typically layer-02 context)
    const popover = palette.bg_default;
    const popoverForeground = palette.fg_default;

    // Border (official Primer tokens)
    const border = palette.border_default;
    const borderSubtle00 = palette.border_default; // Base subtle border
    const borderStrong01 = palette.border_emphasis; // Accessible/emphasis border

    // Semantic colors (official Primer) - ADR-010 compliant mappings
    // GitHub Primer uses a 2-tier color architecture:
    // - Actions (buttons): GREEN (#1f883d)
    // - Interactive text (links): BLUE (#0969da)
    //
    // NOTE: All `on-*` tokens follow ADR-011 canonical naming (on-primary, on-secondary, etc.)

    // BRAND: Undefined (GitHub uses black/white logo, no brand color)
    const brand = undefined;

    // PRIMARY: Green background token for action buttons (ADR-010)
    // Token type: BACKGROUND (for filled buttons)
    // Rationale: GitHub uses green for positive actions ("merge", "create", primary CTAs)
    const primary = palette.bg_success; // GREEN (#1f883d light, #238636 dark)
    const onPrimary = palette.fg_onEmphasis;

    // SECONDARY: Gray background + mandatory 1px border (ADR-010)
    // Token type: BACKGROUND + BORDER
    // Uses derived medium gray for distinction from muted
    const secondary = palette.bg_button_secondary;
    const onSecondary =
        mode === "light"
            ? palette.fg_onEmphasis // Light mode: white text on medium gray (#8c929d)
            : palette.fg_default; // Dark mode: light text on dark gray

    // MUTED: Deemphasized, non-interactive
    const muted = palette.bg_muted;
    const onMuted = palette.fg_muted;

    // TERTIARY: Blue foreground token for links/interactive text (ADR-010)
    // Token type: FOREGROUND (for text, links, icons)
    // Rationale: GitHub uses blue for hyperlinks, focus states, interactive text
    // Distinction: tertiary is FOREGROUND (links), primary is BACKGROUND (buttons)
    const tertiary = palette.fg_accent; // BLUE (#0969da light, #58a6ff dark)
    const onTertiary = palette.fg_onEmphasis; // Rarely used

    // Status colors: destructive + success
    const destructive = palette.bg_danger;
    const onDestructive = palette.fg_onEmphasis;
    const success = palette.bg_success;
    const onSuccess = palette.fg_onEmphasis;

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
    const layer03 =
        mode === "light"
            ? palette.bg_muted // Alternates back to gray (matches layer-01)
            : adjustColor(layer02, 7); // Progressive for dark mode

    // Border hierarchy: Primer provides two border colors (default + emphasis)
    // Derivation: Generate per-layer borders following Carbon's architectural pattern
    // - Light mode (alternating layers): 2 distinct values (default + emphasis)
    // - Dark mode (progressive layers): 5 distinct values (progressive lightening)
    const borderHierarchy = deriveBorderHierarchy(
        palette.border_default, // Subtle base
        palette.border_emphasis, // Strong base for accessible UI component borders
        mode === "light" ? "alternating" : "progressive" // Pattern selection per ADR-008
    );
    const borderSubtle02 = borderHierarchy.subtle02; // Same as subtle00 (light) or +12.6% (dark)
    const borderStrong02 = borderHierarchy.strong02; // Same as strong01 (light) or +20.8% (dark)
    const borderStrong03 = borderHierarchy.strong03; // Same as strong01 (light) or +23.7% compound (dark)

    // Interaction states: Derive hover/selected/active per layer
    // Primer doesn't provide these systematically - we derive from layer colors
    const layer01States = deriveInteractionStates(layer01, foreground);
    const layer02States = deriveInteractionStates(layer02, foreground);

    // Color-based interaction states (ADR-009): For buttons and semantic colors
    const primaryStates = deriveInteractionStates(primary, onPrimary);
    const secondaryStates = deriveInteractionStates(secondary, onSecondary);

    // Tertiary interaction states: For links/interactive text (foreground token)
    const tertiaryHover = palette.fg_accent_hover; // Primer provides official hover
    const tertiaryActive = adjustColor(tertiary, mode === "light" ? -10 : 10); // Slightly darker/lighter

    // Input border: Use standard border
    const input = palette.border_default;

    // Focus ring: Use accent color for consistency
    const ring = palette.fg_accent;

    // Additional status colors (derived - Primer lacks official tokens)
    const warning = mode === "light" ? "#bf8700" : "#d29922";
    const onWarning = mode === "light" ? palette.fg_default : palette.fg_onEmphasis;
    const info = palette.fg_accent; // Primer intentionally uses accent for info
    const onInfo = palette.fg_onEmphasis;

    // ===================================================================
    // SECTION 3: CINEXPLORER EXTENSIONS (App-Specific)
    // ===================================================================
    // Apply centralized CineXplorer extensions adapted to Primer's aesthetic

    const extensions = createExtensions(
        {
            muted: palette.bg_muted,
            mutedForeground: palette.fg_muted,
            secondaryHover: palette.bg_button_secondary_hover,
        },
        mode
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

        // Semantic colors (ADR-010 + ADR-011 compliant)
        brand, // undefined for GitHub
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
        "on-badge": extensions["on-badge"],
        "drag-active": extensions["drag-active"],
        "drop-zone": extensions["drop-zone"],

        // UI elements
        border,
        input,
        ring,
    };
}
