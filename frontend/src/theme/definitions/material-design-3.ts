/**
 * Material Design 3 Theme Definition (Baseline Static)
 *
 * Maps Material Design 3 baseline palette colors to semantic token roles.
 * Provides modern, vibrant aesthetic following Google's M3 design system.
 * Source: Material Design 3 baseline (https://m3.material.io/styles/color/static/baseline)
 * Research: .arc/active/incidental/notes-theme-definition-semantic-corrections.md
 *
 * **Architecture:** 3-tier color system (similar to GitLab)
 * - Brand: Purple (Material's signature primary color)
 * - Primary: Purple (action buttons, same as brand)
 * - Tertiary: Maroon (contrasting accent for links/interactive text)
 *
 * Created: 2025-11-07 (Task 3.5.5.7 - ADR-010 validation)
 */

import {
    materialPaletteLight as pLight,
    materialPaletteDark as pDark,
} from "../color/palettes/material-design-3";
import type { Theme } from "../types";
import { createUnifiedTheme } from "../color";

/**
 * Material Design 3 theme for CineXplorer.
 * Provides vibrant, modern color palette following Google's M3 baseline.
 * Validates ADR-010 Primary/Secondary/Tertiary architecture with 3-tier system.
 */
export const materialDesign3Theme: Theme = {
    name: "material-design-3",
    label: "Material Design 3",
    light: {
        // Base colors - Material's 6-tier surface system mapped to legacy tokens
        background: pLight.surface, // #FEF7FF (page background)
        foreground: pLight.onSurface, // #1D1B20
        // Card colors (legacy mapping to surface-container)
        card: pLight.surfaceContainer, // #F3EDF7 - Material's "cards, sheets, menus"
        "card-foreground": pLight.onSurface,
        // Popover colors
        popover: pLight.surfaceContainerHigh, // #ECE6F0
        "popover-foreground": pLight.onSurface,
        // Primary colors (Purple - Material's signature)
        primary: pLight.primary, // #6750A4
        "primary-foreground": pLight.onPrimary, // #FFFFFF
        // Secondary colors (Gray-purple)
        secondary: pLight.secondary, // #625B71
        "secondary-foreground": pLight.onSecondary, // #FFFFFF
        // Muted colors (Surface variant)
        muted: pLight.surfaceVariant, // #E7E0EC
        "muted-foreground": pLight.onSurfaceVariant, // #49454F
        // Accent colors (legacy - maps to tertiary)
        accent: pLight.tertiary, // #7D5260 (Maroon)
        "accent-foreground": pLight.onTertiary, // #FFFFFF
        "accent-hover": "#6d4250", // Slightly darker maroon
        // Destructive colors
        destructive: pLight.error, // #B3261E
        "destructive-foreground": pLight.onError, // #FFFFFF
        // Status colors - Material baseline doesn't provide these, using industry standards
        success: "#2E7D32", // Material green 700
        "success-foreground": "#FFFFFF",
        warning: "#F57C00", // Material orange 700
        "warning-foreground": "#FFFFFF",
        info: "#1976D2", // Material blue 700
        "info-foreground": "#FFFFFF",
        // Solid status background text colors
        "on-success": "#FFFFFF",
        "on-warning": "#FFFFFF",
        "on-destructive": pLight.onError,
        "on-info": "#FFFFFF",
        // Rating colors (IMDb gold standard)
        rating: "#F5C518",
        "rating-foreground": "#000000",
        // Surface elevation (high-elevation container)
        "surface-elevated": pLight.surfaceContainerHigh, // #ECE6F0
        // Badge colors
        badge: pLight.surfaceVariant, // #E7E0EC
        "badge-foreground": pLight.onSurfaceVariant,
        // Interactive states
        "drag-active": pLight.surfaceContainerHighest, // #E6E0E9
        "drop-zone": pLight.surfaceVariant, // #E7E0EC
        // UI element colors
        border: pLight.outline, // #79747E
        input: pLight.outline,
        ring: pLight.tertiary, // #7D5260 (tertiary accent for focus)
    },
    dark: {
        // Base colors - Material's dark mode surface system
        background: pDark.surface, // #141218 (page background)
        foreground: pDark.onSurface, // #E6E0E9
        // Card colors
        card: pDark.surfaceContainer, // #211F26
        "card-foreground": pDark.onSurface,
        // Popover colors
        popover: pDark.surfaceContainerHigh, // #2B2930
        "popover-foreground": pDark.onSurface,
        // Primary colors (Lighter purple for dark mode)
        primary: pDark.primary, // #D0BCFF
        "primary-foreground": pDark.onPrimary, // #381E72
        // Secondary colors (Lighter gray-purple)
        secondary: pDark.secondary, // #CCC2DC
        "secondary-foreground": pDark.onSecondary, // #332D41
        // Muted colors
        muted: pDark.surfaceVariant, // #49454F
        "muted-foreground": pDark.onSurfaceVariant, // #CAC4D0
        // Accent colors (lighter pink in dark mode)
        accent: pDark.tertiary, // #EFB8C8
        "accent-foreground": pDark.onTertiary, // #492532
        "accent-hover": "#f7cad8", // Lighter pink
        // Destructive colors
        destructive: pDark.error, // #F2B8B5
        "destructive-foreground": pDark.onError, // #601410
        // Status colors (lighter variants for dark mode)
        success: "#66BB6A", // Material green 400
        "success-foreground": "#000000",
        warning: "#FFA726", // Material orange 400
        "warning-foreground": "#000000",
        info: "#42A5F5", // Material blue 400
        "info-foreground": "#000000",
        // Solid status background text colors
        "on-success": "#000000",
        "on-warning": "#000000",
        "on-destructive": pDark.onError,
        "on-info": "#000000",
        // Rating colors
        rating: "#F5C518",
        "rating-foreground": "#000000",
        // Surface elevation
        "surface-elevated": pDark.surfaceContainerHigh, // #2B2930
        // Badge colors
        badge: pDark.surfaceVariant, // #49454F
        "badge-foreground": pDark.onSurfaceVariant,
        // Interactive states
        "drag-active": pDark.surfaceContainerHighest, // #36343B
        "drop-zone": pDark.surfaceVariant, // #49454F
        // UI element colors
        border: pDark.outline, // #938F99
        input: pDark.outline,
        ring: pDark.tertiary, // #EFB8C8
    },
    // Phase 3 integration: Unified adapter instances
    lightUnified: createUnifiedTheme("material-design-3", "light"),
    darkUnified: createUnifiedTheme("material-design-3", "dark"),
} as const;
