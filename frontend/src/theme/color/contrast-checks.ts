/** Color pairs and validation shared by the CLI and theme contract tests. */
import { rgb as getContrast } from "wcag-contrast";
import { resolveColorStack } from "./contrast";
import type { UnifiedTheme } from "./types";
import type { ThemeName } from "./index";

// ============================================================================
// TYPES
// ============================================================================

export interface TokenPair {
    /** Limit this pair to the named themes; omitted means every theme. */
    themes?: readonly ThemeName[];
    fg: string;
    bg: string;
    backdrop?: readonly string[]; // Bottom-to-top layers below bg
    optional?: boolean; // Skip if token undefined
    threshold?: "text" | "ui" | "decorative"; // Default: 'text'
}

export interface ValidationResult {
    themeName: string;
    mode: "light" | "dark";
    pair: TokenPair;
    fgValue: string | undefined;
    bgValue: string | undefined;
    ratio: number | null;
    passed: boolean;
    reason?: string;
    skipped?: "theme" | "optional";
}

// ============================================================================
// CONTRAST THRESHOLDS
// ============================================================================

export const THRESHOLDS = {
    text: 4.5, // WCAG AA - Normal text minimum
    ui: 3.0, // WCAG AA - UI components (borders, focus rings)
    decorative: 1.3, // Visibility minimum (not WCAG standard)
} as const;

// ============================================================================
// WHITELIST: Valid Token Combinations
// ============================================================================

const STATUS_COLORS = ["success", "destructive", "warning", "info"] as const;
const SURFACES = ["background", "layer-01", "layer-02", "layer-03"] as const;

/**
 * Category 1: Semantic Pairs (on-* Convention)
 *
 * Pattern: on-{color} text on {color} background
 * Source: Color Token System strategy, UnifiedTheme interface
 */
const semanticPairs: TokenPair[] = [
    // Action colors
    { fg: "on-primary", bg: "primary" },
    { fg: "on-secondary", bg: "secondary" },
    { fg: "on-tertiary", bg: "tertiary" },

    // Status colors
    { fg: "on-success", bg: "success" },
    { fg: "on-warning", bg: "warning" },
    { fg: "on-destructive", bg: "destructive" },
    { fg: "on-info", bg: "info" },

    // Helper colors
    { fg: "on-badge", bg: "badge" },

    { fg: "on-muted", bg: "muted" },
    { fg: "on-popover", bg: "popover" },

    // Button pattern tokens
    { fg: "on-button-subtle", bg: "button-subtle" },
    { fg: "on-button-subtle-selected", bg: "button-subtle-selected" },

    // Brand (skipped - brand colors are reference-only, not used in app UI)
    // Brand colors preserve official design system values and are not validated for WCAG compliance
    // { fg: "on-brand", bg: "brand", optional: true },
    // { fg: "on-brandSecondary", bg: "brandSecondary", optional: true },
    // { fg: "on-brandTertiary", bg: "brandTertiary", optional: true },
];

/**
 * Category 2: Text on Structural Surfaces
 *
 * Pattern: Primary/secondary text on layer backgrounds
 * Source: Component Styling Strategy - Building Surfaces section
 */
const textOnSurfaces: TokenPair[] = [
    // Primary text on all surfaces
    { fg: "foreground", bg: "background" },
    { fg: "foreground", bg: "layer-01" },
    { fg: "foreground", bg: "layer-02" },
    { fg: "foreground", bg: "layer-03" },
    { fg: "foreground", bg: "popover" },

    // Secondary/muted text on surfaces
    { fg: "on-muted", bg: "background" },
    { fg: "on-muted", bg: "layer-01" },
    { fg: "on-muted", bg: "layer-02" },
];

/**
 * Category 3: Interactive Text on Surfaces
 *
 * Pattern: Links, tertiary buttons, ghost buttons, outline buttons on surfaces
 * Source: Component Styling Strategy - Interactive Elements, Button patterns
 */
const interactiveOnSurfaces: TokenPair[] = [
    // Default interactive text
    { fg: "tertiary", bg: "background" },
    { fg: "tertiary", bg: "layer-01" },
    { fg: "tertiary", bg: "layer-02" },

    // Hover states
    { fg: "tertiary-hover", bg: "background" },
    { fg: "tertiary-hover", bg: "layer-01" },
    { fg: "tertiary-hover", bg: "layer-02" },

    // Active/pressed states
    { fg: "tertiary-active", bg: "background" },
    { fg: "tertiary-active", bg: "layer-01" },
    { fg: "tertiary-active", bg: "layer-02" },

    // Outline buttons (transparent background - text on actual surface)
    { fg: "on-button-outline", bg: "background" },
    { fg: "on-button-outline", bg: "layer-01" },
    { fg: "on-button-outline-primary", bg: "background" },
    { fg: "on-button-outline-primary", bg: "layer-01" },
];

/**
 * Category 4: Borders on Surfaces (Layer-Aware)
 *
 * Pattern: Form controls and structural borders
 * Source: Component Styling Strategy - Layer-Aware Border Tokens, Form Inputs
 */
const bordersOnSurfaces: TokenPair[] = [
    // Layer-aware borders (form controls, structural containers)
    { fg: "border-strong-01", bg: "layer-01", threshold: "ui" },
    { fg: "border-strong-02", bg: "layer-02", threshold: "ui" },
    { fg: "border-strong-03", bg: "layer-03", threshold: "ui" },

    // Subtle borders (decorative only - visibility check, not WCAG)
    { fg: "border-subtle-00", bg: "background", threshold: "decorative" },
    { fg: "border-subtle-02", bg: "layer-02", threshold: "decorative" },
];

/**
 * Category 5: Interaction States on Surfaces
 *
 * Pattern: Hover, selected, active states on interactive surfaces
 * Source: Component Styling Strategy - Interaction State Philosophy
 */
const interactionStates: TokenPair[] = [
    // Hover states
    { fg: "foreground", bg: "layer-hover-01" },
    { fg: "foreground", bg: "layer-hover-02" },
    { fg: "on-muted", bg: "layer-hover-01" },

    // Selected states
    { fg: "foreground", bg: "layer-selected-01" },
    { fg: "foreground", bg: "layer-selected-02" },
    { fg: "on-button-subtle-selected", bg: "button-subtle-selected" },

    // Active/pressed states
    { fg: "foreground", bg: "layer-active-01" },
    { fg: "foreground", bg: "layer-active-02" },
];

/**
 * Category 6: Focus Indicators
 *
 * Pattern: Focus rings and focused borders
 * Source: Component Styling Strategy - Focus Indicators (ADR-015)
 */
const focusIndicators: TokenPair[] = [
    {
        fg: "ring",
        bg: "destructive/10",
        backdrop: ["background"],
        threshold: "ui",
    },
    { fg: "tertiary", bg: "popover", threshold: "ui" },
    // Focus rings on surfaces (outline with offset, not direct contact)
    { fg: "ring", bg: "background", threshold: "ui" },
    { fg: "ring", bg: "layer-01", threshold: "ui" },
    { fg: "ring", bg: "layer-02", threshold: "ui" },

    // Focus border on inputs (tertiary border color change)
    { fg: "tertiary", bg: "background", threshold: "ui" },
    { fg: "tertiary", bg: "layer-01", threshold: "ui" },
    { fg: "tertiary", bg: "layer-02", threshold: "ui" },
];

/**
 * Category 7: Alert/Status Titles and Descriptions
 *
 * Pattern: Alert title and description text on translucent status backgrounds
 * Source: Alert recipe implementation, Component Styling Strategy
 *
 * NOTE: These use 10% opacity backgrounds that need special handling.
 * The validation script resolves opacity tokens before checking contrast.
 */
const alertDescriptions: TokenPair[] = STATUS_COLORS.flatMap((status) =>
    SURFACES.flatMap((surface) => [
        { fg: "foreground", bg: `${status}/10`, backdrop: [surface] },
        { fg: status, bg: `${status}/10`, backdrop: [surface] },
    ]),
);

/**
 * Category 8: Movie-Specific UI Elements
 *
 * Pattern: Rating stars and drag-drop interactions
 * Source: ThemeDebug CineXplorerExtensionsSection, Component Styling Strategy
 */
const movieSpecific: TokenPair[] = [
    // IMDb-gold rating stars on surfaces
    { fg: "imdb-gold", bg: "background" },
    { fg: "imdb-gold", bg: "layer-01" },
    { fg: "imdb-gold", bg: "layer-02" },

    // Drag-and-drop states
    { fg: "on-secondary", bg: "drag-active" },
    { fg: "foreground", bg: "drop-zone" },
];

/** Status text on supported surfaces, including layer-03 toast titles. */
const statusTextOnSurfaces: TokenPair[] = STATUS_COLORS.flatMap((status) =>
    SURFACES.map((surface) => ({ fg: status, bg: surface })),
);

/** Status-colored controls and technical details with their actual backing layers. */
const statusInteractions: TokenPair[] = [
    { fg: "destructive", bg: "destructive/12", backdrop: ["layer-01"] },
    {
        fg: "destructive",
        bg: "destructive/8",
        backdrop: ["background", "destructive/10"],
    },
    {
        fg: "on-destructive",
        bg: "destructive/92",
        backdrop: ["background", "destructive/10"],
    },
    { fg: "foreground", bg: "destructive/8" },
    { fg: "destructive", bg: "popover" },
    { fg: "destructive", bg: "layer-hover-02" },
];

/** Score dots, chip/toast edges, and controls on status-tinted alerts. */
const restyledElements: TokenPair[] = [
    { fg: "success", bg: "layer-hover-01", threshold: "ui" },
    { fg: "success", bg: "layer-hover-02", threshold: "ui" },
    { fg: "destructive", bg: "layer-hover-01", threshold: "ui" },
    { fg: "border-subtle-01", bg: "background", threshold: "decorative" },
    {
        fg: "border-subtle-01",
        bg: "layer-01",
        threshold: "decorative",
        themes: ["marquee"],
    },
    {
        fg: "border-subtle-01",
        bg: "layer-03",
        threshold: "decorative",
        themes: ["marquee"],
    },
    ...STATUS_COLORS.flatMap((status) =>
        SURFACES.flatMap((surface): TokenPair[] => [
            {
                fg: "on-button-outline",
                bg: `${status}/10`,
                backdrop: [surface],
            },
            {
                fg: "border-strong-02",
                bg: `${status}/10`,
                backdrop: [surface],
                threshold: "ui",
                themes: ["marquee"],
            },
            {
                fg: "tertiary",
                bg: `${status}/10`,
                backdrop: [surface],
                threshold: "ui",
                themes: ["marquee"],
            },
        ]),
    ),
];

// Combine all categories
export const ALL_TOKEN_PAIRS: TokenPair[] = [
    ...semanticPairs,
    ...textOnSurfaces,
    ...statusTextOnSurfaces,
    ...statusInteractions,
    ...interactiveOnSurfaces,
    ...bordersOnSurfaces,
    ...interactionStates,
    ...focusIndicators,
    ...alertDescriptions,
    ...movieSpecific,
    ...restyledElements,
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Validate a single token pair
 */
function validatePair(
    pair: TokenPair,
    theme: UnifiedTheme,
    themeName: string,
    mode: "light" | "dark",
): ValidationResult {
    if (pair.themes && !pair.themes.some((name) => name === themeName)) {
        return {
            themeName,
            mode,
            pair,
            fgValue: undefined,
            bgValue: undefined,
            ratio: null,
            passed: true,
            reason: "Theme scope (skipped)",
            skipped: "theme",
        };
    }
    const colors = theme;
    const fg = resolveColorStack([pair.fg], colors);
    const bg = resolveColorStack(
        [...(pair.backdrop ?? ["background"]), pair.bg],
        colors,
    );
    const fgValue = fg ? `rgb(${fg.join(", ")})` : undefined;
    const bgValue = bg ? `rgb(${bg.join(", ")})` : undefined;

    // Handle optional tokens
    if (pair.optional && (!fg || !bg)) {
        return {
            themeName,
            mode,
            pair,
            fgValue,
            bgValue,
            ratio: null,
            passed: true,
            reason: "Optional token undefined (skipped)",
            skipped: "optional",
        };
    }

    // Handle missing required tokens
    if (!fg || !bg) {
        return {
            themeName,
            mode,
            pair,
            fgValue,
            bgValue,
            ratio: null,
            passed: false,
            reason: `Missing token: ${!fgValue ? pair.fg : pair.bg}`,
        };
    }

    // Calculate contrast ratio
    const ratio = getContrast(fg, bg);
    const thresholdType = pair.threshold || "text";
    const threshold = THRESHOLDS[thresholdType];
    const passed = ratio >= threshold;

    return {
        themeName,
        mode,
        pair,
        fgValue,
        bgValue,
        ratio,
        passed,
    };
}

/** Validate each declared pair for a theme variant. */
export function validateTheme(
    theme: UnifiedTheme,
    themeName: string,
    mode: "light" | "dark",
    pairs: readonly TokenPair[] = ALL_TOKEN_PAIRS,
): ValidationResult[] {
    return pairs.map((pair) => validatePair(pair, theme, themeName, mode));
}
