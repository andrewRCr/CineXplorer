/**
 * GitLab Pajamas Theme Definition
 */

import { gitlabPajamasPaletteLight as pLight, gitlabPajamasPaletteDark as pDark } from "../color/palettes/gitlab-pajamas";
import type { Theme } from "../types";
import { createUnifiedTheme } from "../color";

export const gitlabPajamasTheme: Theme = {
    name: "gitlab-pajamas",
    label: "GitLab Pajamas",

    light: {
// Base colors
        background: pLight.bg_default, // Pure white
        foreground: pLight.fg_default, // Dark gray text
        // Card colors (elevated surfaces)
        card: pLight.bg_muted, // Very subtle gray (neutral-10)
        "card-foreground": pLight.fg_default,
        // Popover colors (dropdowns, tooltips)
        popover: pLight.bg_default, // White
        "popover-foreground": pLight.fg_default,
        // Primary colors (main action buttons)
        // GitLab uses blue for primary interactive elements
        primary: pLight.bg_accent_hover, // Blue-500
        "primary-foreground": pLight.fg_onEmphasis, // White text
        // Secondary colors (alternate actions, less prominent)
        secondary: pLight.bg_button_secondary, // White with borders
        "secondary-foreground": pLight.fg_default, // Dark text
        // Muted colors (backgrounds, disabled states)
        muted: pLight.bg_muted, // Subtle gray background
        "muted-foreground": pLight.fg_muted, // Medium gray text
        // Accent colors (links, selections, focus)
        accent: pLight.fg_accent, // Blue-700 (darker for links)
        "accent-foreground": pLight.fg_onEmphasis, // White text
        "accent-hover": pLight.fg_accent_hover,
        // Destructive colors (delete, remove, etc.)
        destructive: pLight.bg_danger, // Red-600
        "destructive-foreground": pLight.fg_onEmphasis, // White text
        // Status colors - Success (positive outcomes)
        success: pLight.bg_success, // Green-500
        "success-foreground": pLight.fg_onEmphasis, // White text
        // Status colors - Warning (caution/attention)
        warning: pLight.fg_warning, // Orange-600 (GitLab official)
        "warning-foreground": pLight.fg_onEmphasis, // White text
        // Status colors - Info (informational)
        info: pLight.fg_info, // Blue-500 (GitLab official)
        "info-foreground": pLight.fg_onEmphasis, // White text
        // Solid status background text colors
        "on-success": pLight.fg_onEmphasis, // White on green
        "on-warning": pLight.fg_onEmphasis, // White on orange
        "on-destructive": pLight.fg_onEmphasis,
        "on-info": pLight.fg_onEmphasis, // White on red
        // Rating colors (movie-specific) - TEMP: hardcoded after palette extraction
        rating: "#c17d10", // Gold adapted for GitLab's clean aesthetic
        "rating-foreground": "#000000", // Dark text
        // Surface elevation (featured sections, modals)
        "surface-elevated": pLight.bg_emphasis, // Neutral-50 (3rd layer)
        // Badge colors (neutral tags)
        badge: pLight.bg_muted, // Neutral-10
        "badge-foreground": pLight.fg_muted, // Neutral-600
        // Interactive states - Drag and drop
        "drag-active": pLight.bg_accent_active, // Blue-600 (active state)
        "drop-zone": pLight.bg_emphasis, // Neutral-50 (subtle emphasis)
        // UI element colors
        border: pLight.border_default, // Medium gray
        input: pLight.border_default, // Input border
        ring: pLight.fg_accent, // Blue focus ring
    },

    dark: {
background: pDark.bg_default, // Near black (neutral-950)
        foreground: pDark.fg_default, // Light gray text
        card: pDark.bg_muted, // Neutral-900 (lighter than background)
        "card-foreground": pDark.fg_default,
        popover: pDark.bg_inset, // Neutral-800 (elevated)
        "popover-foreground": pDark.fg_default,
        primary: pDark.bg_accent_hover, // Blue-300 (lighter for dark)
        "primary-foreground": pDark.fg_onEmphasis, // Near black text
        secondary: pDark.bg_button_secondary, // Neutral-900
        "secondary-foreground": pDark.fg_default, // Light text
        muted: pDark.bg_muted, // Neutral-900 background
        "muted-foreground": pDark.fg_muted, // Medium gray text
        accent: pDark.fg_accent, // Blue-200 (lighter for dark bg)
        "accent-foreground": pDark.fg_onEmphasis, // Near black text
        "accent-hover": pDark.fg_accent_hover,
        destructive: pDark.bg_danger, // Red-400 (lighter for dark)
        "destructive-foreground": pDark.fg_onEmphasis, // Near black text
        success: pDark.bg_success, // Green-300 (lighter for dark)
        "success-foreground": pDark.fg_onEmphasis, // Near black text
        warning: pDark.fg_warning, // Orange-300 (GitLab official)
        "warning-foreground": pDark.fg_onEmphasis, // Near black text
        info: pDark.fg_info, // Blue-300 (GitLab official)
        "info-foreground": pDark.fg_onEmphasis, // Near black text
        "on-success": pDark.fg_onEmphasis, // Dark text on light green
        "on-warning": pDark.fg_onEmphasis, // Dark text on light orange
        "on-destructive": pDark.fg_onEmphasis,
        "on-info": pDark.fg_onEmphasis, // Dark text on light red
        rating: "#f5c518", // TEMP: hardcoded after palette extraction (IMDb gold for dark mode)
        "rating-foreground": "#000000", // Black text
        "surface-elevated": pDark.bg_emphasis, // Neutral-800 (3rd layer, lighter than card)
        badge: pDark.bg_button_secondary, // Neutral-900
        "badge-foreground": pDark.fg_muted, // Neutral-200
        "drag-active": pDark.bg_accent_active, // Blue-400 (active state)
        "drop-zone": pDark.bg_emphasis, // Neutral-800 (subtle emphasis)
        border: pDark.border_default, // Neutral-700
        input: pDark.border_default, // Input border
        ring: pDark.fg_accent, // Light blue focus ring
    },
    // Phase 3 integration: Unified adapter instances
    lightUnified: createUnifiedTheme("gitlab-pajamas", "light"),
    darkUnified: createUnifiedTheme("gitlab-pajamas", "dark"),
} as const;
