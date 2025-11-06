/**
 * GitHub Primer Theme Definition
 *
 * Maps GitHub Primer palette colors to semantic token roles.
 * Provides neutral, professional aesthetic proven at massive scale.
 * Source: GitHub Primer design system (https://primer.style)
 * Research: .arc/active/incidental/notes-theme-system-modernization.md
 */

import { githubPaletteLight as pLight, githubPaletteDark as pDark } from "../palettes/github-primer";
import type { Theme } from "../types";
import { createUnifiedTheme } from "../adapter";

/**
 * GitHub Primer theme for CineXplorer.
 * Provides neutral, accessible color palette following GitHub's proven
 * design system. Suitable as baseline theme before custom branding.
 */
export const githubTheme: Theme = {
    name: "github-primer",
    label: "GitHub Primer",
    light: {
        // Base colors - DIRECT HEX (no conversion)
        background: pLight.bg_default,
        foreground: pLight.fg_default,
        // Card colors
        card: pLight.bg_default,
        "card-foreground": pLight.fg_default,
        // Popover colors
        popover: pLight.bg_default,
        "popover-foreground": pLight.fg_default,
        // Primary colors
        primary: pLight.bg_success,
        "primary-foreground": pLight.fg_onEmphasis,
        // Secondary colors
        secondary: pLight.bg_button_secondary,
        "secondary-foreground": pLight.fg_default,
        // Muted colors
        muted: pLight.bg_muted,
        "muted-foreground": pLight.fg_muted,
        // Accent colors
        accent: pLight.fg_accent,
        "accent-foreground": pLight.fg_onEmphasis,
        "accent-hover": pLight.fg_accent_hover,
        // Destructive colors
        destructive: pLight.bg_danger,
        "destructive-foreground": pLight.fg_onEmphasis,
        // Status colors - Success
        success: pLight.bg_success,
        "success-foreground": pLight.fg_onEmphasis,
        // Status colors - Warning (TEMP: hardcoded after palette extraction)
        warning: "#d4a72c",
        "warning-foreground": "#744500",
        // Status colors - Info (TEMP: hardcoded after palette extraction)
        info: "#0969da",
        "info-foreground": pLight.fg_onEmphasis,
        // Solid status background text colors
        "on-success": pLight.fg_onEmphasis, // White on green
        "on-warning": pLight.fg_onEmphasis, // White on yellow
        "on-destructive": pLight.fg_onEmphasis,
        "on-info": pLight.fg_onEmphasis, // White on red
        // Rating colors (TEMP: hardcoded after palette extraction)
        rating: "#bf8700",
        "rating-foreground": pLight.fg_onEmphasis,
        // Surface elevation
        "surface-elevated": pLight.bg_emphasis,
        // Badge colors
        badge: pLight.bg_muted,
        "badge-foreground": pLight.fg_muted,
        // Interactive states
        "drag-active": pLight.bg_button_secondary_hover,
        "drop-zone": pLight.bg_emphasis,
        // UI element colors
        border: pLight.border_default,
        input: pLight.border_default,
        ring: pLight.fg_accent,
    },
    dark: {
        background: pDark.bg_default,
        foreground: pDark.fg_default,
        card: pDark.bg_inset,
        "card-foreground": pDark.fg_default,
        popover: pDark.bg_inset,
        "popover-foreground": pDark.fg_default,
        primary: pDark.bg_success,
        "primary-foreground": pDark.fg_onEmphasis,
        secondary: pDark.bg_button_secondary,
        "secondary-foreground": pDark.fg_default,
        muted: pDark.bg_muted,
        "muted-foreground": pDark.fg_muted,
        accent: pDark.fg_accent,
        "accent-foreground": pDark.fg_onEmphasis,
        "accent-hover": pDark.fg_accent_hover,
        destructive: pDark.bg_danger,
        "destructive-foreground": pDark.fg_onEmphasis,
        success: pDark.bg_success,
        "success-foreground": pDark.fg_onEmphasis,
        warning: "#bb8009", // TEMP: hardcoded after palette extraction
        "warning-foreground": "#e3b341", // TEMP: hardcoded after palette extraction
        info: "#0969da", // TEMP: hardcoded after palette extraction
        "info-foreground": pDark.fg_onEmphasis,
        "on-success": pDark.fg_default, // White text on dark green
        "on-warning": pDark.fg_default, // White text on dark yellow
        "on-destructive": pDark.fg_default, // White text on dark red
        "on-info": pDark.fg_default, // White text on dark blue
        rating: "#ffc107", // TEMP: hardcoded after palette extraction
        "rating-foreground": pDark.fg_onEmphasis,
        "surface-elevated": pDark.bg_muted,
        badge: pDark.bg_button_secondary,
        "badge-foreground": pDark.fg_muted,
        "drag-active": pDark.bg_button_secondary_hover,
        "drop-zone": pDark.bg_emphasis,
        border: pDark.border_default,
        input: pDark.border_default,
        ring: pDark.fg_accent,
    },
    // Phase 3 integration: Unified adapter instances
    lightUnified: createUnifiedTheme("github", "light"),
    darkUnified: createUnifiedTheme("github", "dark"),
} as const;
