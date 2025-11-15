/**
 * IBM Carbon Theme Definition
 */

import {
    ibmCarbonPaletteLight as pLight,
    ibmCarbonPaletteDark as pDark,
} from "../color/palettes/ibm-carbon";
import type { Theme } from "../types";
import { createUnifiedTheme } from "../color";

export const ibmCarbonTheme: Theme = {
    name: "ibm-carbon",
    label: "IBM Carbon",

    light: {
        // Base colors - DIRECT HEX (no conversion)
        background: pLight.bg_default,
        foreground: pLight.fg_default,
        // Card colors
        card: pLight.bg_muted,
        "card-foreground": pLight.fg_default,
        // Popover colors
        popover: pLight.bg_inset,
        "popover-foreground": pLight.fg_default,
        // Primary colors
        primary: pLight.fg_accent,
        "primary-foreground": pLight.fg_onEmphasis,
        // Secondary colors
        secondary: pLight.bg_button_secondary,
        "secondary-foreground": pLight.fg_onEmphasis,
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
        // Status colors - Warning
        warning: pLight.fg_warning,
        "warning-foreground": pLight.fg_default,
        // Status colors - Info
        info: pLight.fg_info,
        "info-foreground": pLight.fg_onEmphasis,
        // Solid status background text colors
        "on-success": pLight.fg_onEmphasis, // White text on dark green
        "on-warning": pLight.fg_default, // Dark text on light yellow (better contrast)
        "on-destructive": pLight.fg_onEmphasis, // White text on dark red
        "on-info": pLight.fg_onEmphasis, // White text on dark blue
        // Rating colors (IMDb gold standard - was pLight.fg_rating before extraction)
        "imdb-gold": "#d4a518",
        // Surface elevation
        "surface-elevated": pLight.bg_emphasis,
        // Badge colors
        badge: pLight.bg_muted,
        "badge-foreground": pLight.fg_muted,
        // Interactive states
        "drag-active": pLight.bg_accent_active,
        "drop-zone": pLight.bg_emphasis,
        // UI element colors
        border: pLight.border_default,
        input: pLight.border_default,
        ring: pLight.fg_accent,
    },

    dark: {
        background: pDark.bg_default,
        foreground: pDark.fg_default,
        card: pDark.bg_muted,
        "card-foreground": pDark.fg_default,
        popover: pDark.bg_inset,
        "popover-foreground": pDark.fg_default,
        primary: pDark.fg_accent,
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
        warning: pDark.fg_warning,
        "warning-foreground": pDark.fg_onEmphasis,
        info: pDark.fg_info,
        "info-foreground": pDark.fg_onEmphasis,
        "on-success": pDark.fg_default, // White text on dark green
        "on-warning": pDark.fg_onEmphasis, // Dark text on light yellow (IBM uses lighter yellow)
        "on-destructive": pDark.fg_default, // White text on dark red
        "on-info": pDark.fg_default, // White text on dark blue
        "imdb-gold": "#f1c21b", // TEMP: hardcoded after palette extraction
        "surface-elevated": pDark.bg_emphasis,
        badge: pDark.bg_button_secondary,
        "badge-foreground": pDark.fg_muted,
        "drag-active": pDark.bg_accent_active,
        "drop-zone": pDark.bg_emphasis,
        border: pDark.border_default,
        input: pDark.border_default,
        ring: pDark.fg_accent,
    },

    lightUnified: createUnifiedTheme("ibm-carbon", "light"),
    darkUnified: createUnifiedTheme("ibm-carbon", "dark"),
} as const;
