/**
 * Material Design 3 Color Palette (Baseline Static)
 *
 * Contains ONLY official Material Design 3 baseline tokens for light and dark modes.
 * All CineXplorer-specific extensions (rating, badges, etc.) are handled in the adapter layer.
 *
 * Source: https://m3.material.io/styles/color/static/baseline
 * Package: Material Design 3 (baseline static palette)
 *
 * All values verified from official Material Design 3 documentation.
 *
 * Note: Material Design 3 baseline does not include success/warning/info colors.
 * These will be derived in the adapter using industry-standard conventions.
 */

/**
 * Material Design 3 color palette - Light Mode
 *
 * Organized by semantic role following Material's token structure.
 * Values are official hex colors from Material Design 3 baseline.
 */
export const materialPaletteLight = {
    // Primary colors (Purple - Material's signature color)
    /** Primary brand color - Used for FABs, prominent buttons */
    primary: "#6750A4",
    /** Text/icons on primary color surfaces */
    onPrimary: "#FFFFFF",

    // Secondary colors (Gray-purple)
    /** Secondary actions, less prominent components */
    secondary: "#625B71",
    /** Text/icons on secondary color surfaces */
    onSecondary: "#FFFFFF",

    // Tertiary colors (Maroon)
    /** Tertiary accent for contrasting accents */
    tertiary: "#7D5260",
    /** Text/icons on tertiary color surfaces */
    onTertiary: "#FFFFFF",

    // Error colors
    /** Error states, destructive actions */
    error: "#B3261E",
    /** Text/icons on error color surfaces */
    onError: "#FFFFFF",

    // Surface colors (6-tier elevation system)
    /** Lowest surface - Page background */
    surfaceContainerLowest: "#FFFFFF",
    /** Default surface - Cards, sheets, menus */
    surface: "#FEF7FF",
    /** Mid-elevation surface container */
    surfaceContainer: "#F3EDF7",
    /** High-elevation surface container */
    surfaceContainerHigh: "#ECE6F0",
    /** Highest-elevation surface container (unused in initial mapping) */
    surfaceContainerHighest: "#E6E0E9",
    /** Surface variant - For active/inactive states */
    surfaceVariant: "#E7E0EC",

    // Surface text colors
    /** Primary text on surfaces */
    onSurface: "#1D1B20",
    /** Text/icons for active/inactive component states */
    onSurfaceVariant: "#49454F",

    // Outline/border colors
    /** Standard borders - "Subtle color used for boundaries" */
    outline: "#79747E",
    /** Lower-contrast borders - Used where 3:1 contrast not required */
    outlineVariant: "#CAC4D0",
} as const;

/**
 * Material Design 3 color palette - Dark Mode
 *
 * Dark theme optimized for low-light environments.
 * Maintains semantic parity with light mode.
 */
export const materialPaletteDark = {
    // Primary colors (Purple - lighter in dark mode)
    /** Primary brand color - Lighter purple for dark backgrounds */
    primary: "#D0BCFF",
    /** Text/icons on primary color surfaces */
    onPrimary: "#381E72",

    // Secondary colors (Gray-purple - lighter in dark mode)
    /** Secondary actions, less prominent components */
    secondary: "#CCC2DC",
    /** Text/icons on secondary color surfaces */
    onSecondary: "#332D41",

    // Tertiary colors (Pink - lighter in dark mode)
    /** Tertiary accent for contrasting accents */
    tertiary: "#EFB8C8",
    /** Text/icons on tertiary color surfaces */
    onTertiary: "#492532",

    // Error colors (Pink-red - lighter in dark mode)
    /** Error states, destructive actions */
    error: "#F2B8B5",
    /** Text/icons on error color surfaces */
    onError: "#601410",

    // Surface colors (6-tier elevation system - darker base)
    /** Lowest surface - Page background (near black) */
    surfaceContainerLowest: "#0F0D13",
    /** Default surface - Cards, sheets, menus */
    surface: "#141218",
    /** Mid-elevation surface container */
    surfaceContainer: "#211F26",
    /** High-elevation surface container */
    surfaceContainerHigh: "#2B2930",
    /** Highest-elevation surface container (unused in initial mapping) */
    surfaceContainerHighest: "#36343B",
    /** Surface variant - For active/inactive states */
    surfaceVariant: "#49454F",

    // Surface text colors
    /** Primary text on surfaces */
    onSurface: "#E6E0E9",
    /** Text/icons for active/inactive component states */
    onSurfaceVariant: "#CAC4D0",

    // Outline/border colors
    /** Standard borders - Higher contrast for dark mode */
    outline: "#938F99",
    /** Lower-contrast borders - Mid-tone gray in dark mode */
    outlineVariant: "#49454F",
} as const;

export type MaterialPalette = typeof materialPaletteLight;
