/**
 * GitLab Pajamas Design System Color Palette
 *
 * Official GitLab Pajamas design system colors for light and dark modes.
 * Source: https://design.gitlab.com/product-foundations/color/
 * Package: @gitlab/ui (design tokens)
 *
 * All values verified from @gitlab/ui design tokens.
 * GitLab uses semantic tokens that map to constant color scales (neutral, blue, orange, etc.).
 *
 * **IMPORTANT:** This file contains ONLY official Pajamas tokens.
 * CineXplorer-specific extensions (rating colors, custom semantics) are in adapter/extensions.ts.
 */

/**
 * GitLab Pajamas color palette - Light Mode
 *
 * Organized by semantic function following GitLab's token structure.
 * Values are official hex colors from GitLab Pajamas design system.
 * Note: GitLab's primary interactive color is blue, not orange (orange used for warnings).
 */
export const gitlabPajamasPaletteLight = {
    // Base colors - Layer System
    /** Primary page background - Pure white (background, neutral-0) */
    bg_default: "#ffffff",
    /** First layer - Cards, sections (layer-01, neutral-50, official section token) */
    bg_section: "#ececef",
    /** Elevated surfaces - Modals use bg_default + shadow (shadow-based elevation) */
    bg_elevated: "#ffffff",

    // Legacy aliases (deprecated - use bg_section for cards)
    /** @deprecated Use bg_section for cards (neutral-10 insufficient contrast 1.02:1) */
    bg_muted: "#fbfafd",
    /** @deprecated Use bg_section for elevated surfaces */
    bg_inset: "#fbfafd",
    /** @deprecated Use bg_section */
    bg_emphasis: "#ececef",

    /** Action hover background (neutral-300 @ 16% opacity over white) */
    bg_field_hover: "#f0f0f1",

    // Foreground colors
    /** Primary text color (neutral-800) */
    fg_default: "#3a383f",
    /** Secondary text, reduced emphasis (neutral-600) */
    fg_muted: "#626168",
    /** Tertiary text, minimal emphasis (neutral-300) */
    fg_subtle: "#a4a3a8",
    /** Text on emphasis backgrounds - white for contrast */
    fg_onEmphasis: "#ffffff",

    // Semantic colors - Accent (Links, interactive)
    /** Links, primary interactive (blue-700) */
    fg_accent: "#2f5ca0",
    /** Link hover state (darker/more saturated blue - GitLab blue-700) */
    fg_accent_hover: "#1f4787",
    /** Primary action button background (green-500) */
    bg_success: "#108548",
    /** Success button hover - darker green */
    bg_success_hover: "#0d6938",

    // GitLab Brand Colors (official from design.gitlab.com/brand-design/color)
    /** GitLab brand purple - Purple 01p (primary brand color) */
    brand_purple: "#a989f5",
    /** GitLab brand orange - Orange 01p (secondary brand color) */
    brand_orange: "#fca326",
    /** GitLab purple for links - Purple 02p (used on light backgrounds) */
    fg_link_purple: "#7759c2",
    /** GitLab orange for primary actions - Orange 03p (used for CTAs on about.gitlab.com) */
    bg_action_primary: "#e24329",

    // Semantic colors - Danger (Destructive actions)
    /** Error/danger text (red-600) */
    fg_danger: "#c02f12",
    /** Destructive action button */
    bg_danger: "#c02f12",
    /** Danger button hover - darker red */
    bg_danger_hover: "#a02911",

    // Border colors - Improved contrast
    /** Strong borders (neutral-200, improved contrast 2.1:1 on white) */
    border_strong: "#bfbfc3",
    /** Subtle borders (neutral-50) */
    border_subtle: "#ececef",

    // Legacy aliases (deprecated - use border hierarchy)
    /** @deprecated Use border_strong (neutral-100 had insufficient contrast 1.17:1) */
    border_default: "#dcdcde",
    /** @deprecated Use border_subtle */
    border_muted: "#ececef",

    // Button colors
    /** Secondary button background (neutral-0 with borders) */
    bg_button_secondary: "#ffffff",
    /** Secondary button hover (neutral-10) */
    bg_button_secondary_hover: "#fbfafd",

    // Interactive states
    /** Interactive button background (blue-500) */
    bg_accent_hover: "#1f75cb",
    /** Interactive button active (blue-600) */
    bg_accent_active: "#2f68b4",

    // Additional status colors (OFFICIAL GitLab Pajamas)
    /** Warning state (orange-600) - OFFICIAL GitLab color (distinctive orange) */
    fg_warning: "#995715",
    /** Info state (blue-500) - OFFICIAL GitLab color */
    fg_info: "#1f75cb",

    // Special surfaces
    /** Strong text/headings (neutral-950) */
    fg_strong: "#18171d",
} as const;

/**
 * GitLab Pajamas color palette - Dark Mode
 *
 * Uses lighter color steps from the same constant scales for proper contrast.
 * GitLab treats dark mode as "dimming the lights" with natural depth hierarchy.
 */
export const gitlabPajamasPaletteDark = {
    // Base colors - Layer System
    /** Primary page background - Near black (background, neutral-950) */
    bg_default: "#18171d",
    /** First layer - Cards, sections (layer-01, neutral-900, good contrast) */
    bg_section: "#28272d",
    /** Elevated surfaces - Modals use bg_default + shadow (shadow-based elevation) */
    bg_elevated: "#18171d",

    // Legacy aliases (deprecated - use bg_section for cards)
    /** @deprecated Use bg_section for cards */
    bg_muted: "#28272d",
    /** @deprecated Use bg_section for elevated surfaces */
    bg_inset: "#3a383f",
    /** @deprecated Use bg_section */
    bg_emphasis: "#3a383f",

    /** Action hover background (neutral-400 @ 40% opacity over neutral-900) */
    bg_field_hover: "#4f4e53",

    // Foreground colors
    /** Primary text color (neutral-50) */
    fg_default: "#ececef",
    /** Secondary text, reduced emphasis (neutral-200) */
    fg_muted: "#bfbfc3",
    /** Tertiary text, minimal emphasis (neutral-400) */
    fg_subtle: "#89888d",
    /** Text on emphasis backgrounds - near black for contrast */
    fg_onEmphasis: "#18171d",

    // Semantic colors - Accent (Links, interactive)
    /** Links in dark mode (blue-200) - lighter for contrast */
    fg_accent: "#9dc7f1",
    /** Link hover state (brighter blue for dark mode) */
    fg_accent_hover: "#c6e2ff",
    /** Primary action button background (green-300) */
    bg_success: "#52b87a",
    /** Success button hover - brighter green */
    bg_success_hover: "#91d4a8",

    // GitLab Brand Colors (official from design.gitlab.com/brand-design/color)
    /** GitLab brand purple - Purple 01p (works in dark mode) */
    brand_purple: "#a989f5",
    /** GitLab brand orange - Orange 01p (same in both modes) */
    brand_orange: "#fca326",
    /** GitLab purple for links - Purple 01p (lighter purple for dark mode readability) */
    fg_link_purple: "#a989f5",
    /** GitLab orange for primary actions - Orange 01p (lighter variant for dark mode) */
    bg_action_primary: "#fca326",

    // Semantic colors - Danger (Destructive actions)
    /** Error/danger text (red-400) - lighter red for dark bg */
    fg_danger: "#ec5941",
    /** Destructive action button */
    bg_danger: "#ec5941",
    /** Danger button hover - lighter red */
    bg_danger_hover: "#f6806d",

    // Border colors - Improved contrast
    /** Strong borders (neutral-600, improved contrast on dark backgrounds) */
    border_strong: "#626168",
    /** Subtle borders (neutral-800) */
    border_subtle: "#3a383f",

    // Legacy aliases (deprecated - use border hierarchy)
    /** @deprecated Use border_strong */
    border_default: "#4c4b51",
    /** @deprecated Use border_subtle */
    border_muted: "#3a383f",

    // Button colors
    /** Secondary button background (neutral-900) */
    bg_button_secondary: "#28272d",
    /** Secondary button hover (neutral-800) */
    bg_button_secondary_hover: "#3a383f",

    // Interactive states
    /** Interactive button background (blue-300) */
    bg_accent_hover: "#63a6e9",
    /** Interactive button active (blue-400) */
    bg_accent_active: "#428fdc",

    // Additional status colors (OFFICIAL GitLab Pajamas)
    /** Warning state (orange-300) - OFFICIAL GitLab color (lighter for dark bg) */
    fg_warning: "#d99530",
    /** Info state (blue-300) - OFFICIAL GitLab color */
    fg_info: "#63a6e9",

    // Special surfaces
    /** Strong text/headings (neutral-0) */
    fg_strong: "#ffffff",
} as const;

/**
 * Type-safe palette color names for light mode.
 */
export type GitLabPajamasPaletteColorLight = keyof typeof gitlabPajamasPaletteLight;

/**
 * Type-safe palette color names for dark mode.
 */
export type GitLabPajamasPaletteColorDark = keyof typeof gitlabPajamasPaletteDark;
