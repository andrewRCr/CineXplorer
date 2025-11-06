/**
 * Theme System Type Definitions
 *
 * Defines type-safe interfaces for CineXplorer's theme system.
 * Uses semantic token naming inspired by shadcn/ui, implemented for Chakra UI v3.
 */

import type { UnifiedTheme } from "./adapter/types";

/**
 * Theme color palette with semantic token naming.
 *
 * All colors are hex values (e.g., "#ffffff"). Chakra UI v3 supports
 * opacity modifiers with hex colors (e.g., bg="primary/50").
 *
 * Semantic tokens provide meaning-based color names rather than appearance-based.
 * This allows themes to change colors while maintaining consistent meaning across
 * the application.
 */
export interface ThemeColors {
    // ===================================================================
    // BASE COLORS
    // ===================================================================

    /** Default page background */
    background: string;

    /** Default text color on background */
    foreground: string;

    // ===================================================================
    // CARD COLORS
    // ===================================================================

    /** Card container backgrounds (elevated surfaces) */
    card: string;

    /** Text color on card backgrounds */
    "card-foreground": string;

    // ===================================================================
    // POPOVER COLORS
    // ===================================================================

    /** Popover/dropdown/tooltip backgrounds */
    popover: string;

    /** Text color on popover backgrounds */
    "popover-foreground": string;

    // ===================================================================
    // PRIMARY COLORS (Main Brand/Action)
    // ===================================================================

    /** Primary action elements (main buttons, key CTAs) */
    primary: string;

    /** Text/icon color on primary backgrounds */
    "primary-foreground": string;

    // ===================================================================
    // SECONDARY COLORS (Supporting Actions)
    // ===================================================================

    /** Secondary action elements (secondary buttons, alternate actions) */
    secondary: string;

    /** Text/icon color on secondary backgrounds */
    "secondary-foreground": string;

    // ===================================================================
    // MUTED COLORS (Deemphasized Content)
    // ===================================================================

    /** Muted/disabled backgrounds, subtle surfaces */
    muted: string;

    /** Secondary text, deemphasized content, labels */
    "muted-foreground": string;

    // ===================================================================
    // ACCENT COLORS (Highlights & Callouts)
    // ===================================================================

    /** Highlighted elements, callouts, badges, interactive accents, links */
    accent: string;

    /** Text/icon color on accent backgrounds */
    "accent-foreground": string;

    /**
     * Link hover state (brighter/more saturated than accent).
     * Used for interactive link hover feedback, creating visual distinction on mouse-over.
     * Typically a warmer or more vibrant shade of the accent color.
     */
    "accent-hover": string;

    // ===================================================================
    // DESTRUCTIVE COLORS (Danger/Error States)
    // ===================================================================

    /** Danger/error/destructive actions and states */
    destructive: string;

    /** Text/icon color on destructive backgrounds */
    "destructive-foreground": string;

    // ===================================================================
    // STATUS COLORS (Semantic Feedback States)
    // ===================================================================

    /** Success/positive state (completions, confirmations, positive feedback) */
    success: string;

    /** Text/icon color on success backgrounds */
    "success-foreground": string;

    /** Warning/caution state (alerts, potential issues, careful attention needed) */
    warning: string;

    /** Text/icon color on warning backgrounds */
    "warning-foreground": string;

    /** Info/neutral state (informational messages, tips, helpful guidance) */
    info: string;

    /** Text/icon color on info backgrounds */
    "info-foreground": string;

    // ===================================================================
    // SOLID STATUS BACKGROUND TEXT COLORS
    // ===================================================================

    /**
     * Text color for solid success backgrounds (badges, pills with full color fill).
     * Separate from success-foreground which is for subtle/transparent backgrounds.
     * Typically white in light mode, black/dark in dark mode depending on shade.
     */
    "on-success": string;

    /**
     * Text color for solid warning backgrounds (badges, pills with full color fill).
     * Separate from warning-foreground which is for subtle/transparent backgrounds.
     * Typically white in light mode, may vary in dark mode based on warning shade.
     */
    "on-warning": string;

    /**
     * Text color for solid destructive backgrounds (badges, pills with full color fill).
     * Separate from destructive-foreground which is for subtle/transparent backgrounds.
     * Typically white in light mode, black/dark in dark mode depending on shade.
     */
    "on-destructive": string;

    /**
     * Text color for solid info backgrounds (badges, pills with full color fill).
     * Separate from info-foreground which is for subtle/transparent backgrounds.
     * Typically white in light mode, may vary in dark mode based on info shade.
     */
    "on-info": string;

    // ===================================================================
    // RATING COLORS (Movie-Specific Semantic)
    // ===================================================================

    /**
     * Rating/score displays (movie ratings, user scores, quality indicators).
     * Distinct from warning token - ratings have different semantic meaning.
     * Light mode: #F5C518 (IMDb gold standard), Dark mode: adjusted for contrast.
     */
    rating: string;

    /** Text/icon color on rating backgrounds */
    "rating-foreground": string;

    // ===================================================================
    // SURFACE ELEVATION (Additional Elevation Layer)
    // ===================================================================

    /**
     * Elevated surface level (featured sections, emphasized cards, modals).
     * Third surface level in elevation hierarchy: background < card < surface-elevated < popover.
     * Uses tonal variation to create depth (lighter in dark mode per Material Design 3 approach).
     */
    "surface-elevated": string;

    // ===================================================================
    // BADGE COLORS (Neutral Tags & Labels)
    // ===================================================================

    /** Neutral badge backgrounds (genre tags, default labels, non-semantic tags) */
    badge: string;

    /** Text/icon color on badge backgrounds */
    "badge-foreground": string;

    // ===================================================================
    // INTERACTIVE STATES (Drag-and-Drop)
    // ===================================================================

    /**
     * Element being actively dragged (darker/emphasized appearance).
     * Indicates item is in dragged state, provides visual feedback during drag operation.
     */
    "drag-active": string;

    /**
     * Valid drop target indicator (subtle success/accent tint).
     * Shows where dragged item can be dropped, provides clear affordance for drop zones.
     */
    "drop-zone": string;

    // ===================================================================
    // UI ELEMENT COLORS
    // ===================================================================

    /** Standard borders (dividers, outlines) */
    border: string;

    /** Input field borders (text inputs, selects) */
    input: string;

    /** Focus ring color (keyboard navigation indicator) */
    ring: string;
}

/**
 * Complete theme definition with light and dark color palettes.
 *
 * Each theme provides:
 * - Unique identifier and display name
 * - Light mode color palette (ThemeColors)
 * - Dark mode color palette (ThemeColors)
 * - Optional unified adapter instances (Phase 3 integration)
 *
 * Themes are immutable once defined. To change colors, create a new theme.
 *
 * **Parallel Systems Approach:**
 * During Phase 3 migration, both old (light/dark) and new (lightUnified/darkUnified)
 * token systems coexist. Components gradually migrate from ThemeColors tokens to
 * UnifiedTheme tokens. After migration complete, ThemeColors will be removed.
 */
export interface Theme {
    /** Unique theme identifier (kebab-case, e.g., "github", "cinexplorer-custom") */
    readonly name: string;

    /** Human-readable theme name for display (e.g., "GitHub", "CineXplorer Custom") */
    readonly label: string;

    /**
     * Light mode color palette (legacy - deprecated).
     * @deprecated Use lightUnified instead. Will be removed after Phase 3 migration.
     */
    readonly light: ThemeColors;

    /**
     * Dark mode color palette (legacy - deprecated).
     * @deprecated Use darkUnified instead. Will be removed after Phase 3 migration.
     */
    readonly dark: ThemeColors;

    /**
     * Light mode unified adapter tokens (Phase 3+).
     *
     * Provides ~47 tokens including layer system, border hierarchy, shadows,
     * and interaction states. Replaces deprecated ThemeColors tokens.
     *
     * **Optional during migration:** Present after Phase 3.1 integration complete.
     */
    readonly lightUnified?: UnifiedTheme;

    /**
     * Dark mode unified adapter tokens (Phase 3+).
     *
     * Provides ~47 tokens including layer system, border hierarchy, shadows,
     * and interaction states. Replaces deprecated ThemeColors tokens.
     *
     * **Optional during migration:** Present after Phase 3.1 integration complete.
     */
    readonly darkUnified?: UnifiedTheme;
}

/**
 * Theme registry mapping theme names to theme definitions.
 * All registered themes available for selection.
 *
 * Example:
 * ```typescript
 * const themes: ThemeRegistry = {
 *   "github": githubTheme,
 *   "cinexplorer-custom": cinexplorerTheme,
 * };
 * ```
 */
export type ThemeRegistry = Readonly<Record<string, Theme>>;
