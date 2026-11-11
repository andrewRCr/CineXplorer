/**
 * CineXplorer Original Color Palette (Dark Mode Only)
 *
 * @deprecated REFERENCE ONLY - DO NOT IMPORT OR USE IN APPLICATION CODE.
 *
 * This palette is preserved for historical reference during future custom theme development.
 * The application uses its own default Marquee palette beside four adapted design systems
 * (GitHub Primer, IBM Carbon, GitLab Pajamas, Material Design 3), mapped to semantic tokens.
 *
 * This palette documents the colors that were actually in use in the original
 * theme system before migration to semantic tokens. Unused colors (gradients,
 * nearBlack, customGrayBorder) have been excluded.
 */

/**
 * Original CineXplorer color palette - dark mode only.
 * Colors organized by usage category for easy reference.
 *
 * @deprecated DO NOT USE - Reference only. Import from design system palettes instead.
 */
export const cinexplorerOriginalPalette = {
    // ===================================================================
    // BASE COLORS
    // ===================================================================

    /** Pure white - Used for primary text and some borders */
    white: "#FFFFFF",

    /** Pure black - Used sparingly in specific components */
    black: "#000000",

    // ===================================================================
    // GRAY SCALE (Chakra UI grays)
    // ===================================================================

    /** Light gray - Used for muted/secondary text */
    gray_200: "#E2E8F0",

    /** Medium-light gray - Used for muted text (text.muted) */
    gray_300: "#CBD5E0",

    /** Medium gray - Used for secondary text (text.secondary) */
    gray_400: "#A0AEC0",

    /** Medium-dark gray - Used for subtle borders and info text */
    gray_500: "#718096",

    /** Dark gray - Used for separators and borders */
    gray_700: "#4A5568",

    // ===================================================================
    // DARK BACKGROUNDS (Custom Dark Surfaces)
    // ===================================================================

    /** Discord-inspired dark - Primary background color */
    discord_dark: "#23272f",

    /** Chakra gray 900 - Used for sub-items, hover, and selected states */
    chakra_gray_900: "#1a202c",

    /** Tailwind zinc 900 - Used for navbar, sidebar interior, skeletons */
    tailwind_zinc_900: "#18181b",

    // ===================================================================
    // ACCENT COLORS (Blue)
    // ===================================================================

    /** Primary blue - Used for primary accent color */
    blue_500: "#3182CE",

    /** Dark blue - Used for secondary accent */
    blue_700: "#2C5282",

    /** Light blue - Used for highlights */
    blue_63b3ed: "#63b3ed",

    /** Medium blue - Used for links */
    blue_4299e1: "#4299e1",

    // ===================================================================
    // STATUS COLORS
    // ===================================================================

    // Error colors
    /** Error text color */
    red_500: "#E53E3E",

    /** Error border (light pink) */
    error_border: "#fed7d7",

    // Success colors
    /** Success text color */
    success_green: "#48bb78",

    /** Dark success text color */
    success_green_dark: "#2f855a",

    /** Success border (light green) */
    success_border: "#c6f6d5",

    // ===================================================================
    // TAG COLORS
    // ===================================================================

    /** Teal tag color */
    teal: "#38B2AC",

    /** Purple tag color */
    purple: "#805AD5",
} as const;

/**
 * Type-safe palette color names.
 * Use for referencing palette colors with TypeScript autocomplete.
 *
 * @deprecated DO NOT USE - Reference only. Use design system token types instead.
 */
export type CinexplorerOriginalColor = keyof typeof cinexplorerOriginalPalette;

/**
 * USAGE NOTES:
 *
 * This palette is preserved as a reference for future custom theme development.
 * It documents the actual colors that were in use before semantic token migration.
 *
 * Colors NOT included (were defined but unused):
 * - nearBlack (#0d0e0e) - No usage found
 * - gradientGrayLeft, gradientGrayCentered, gradientNavy - No usage found
 * - customGrayBorder (#718096) - Duplicate of gray_500, not referenced
 *
 * When developing a custom CineXplorer theme in the future, this palette can serve
 * as a starting point for color inspiration or as a fallback reference.
 *
 * Current theme system uses GitHub Primer colors mapped to semantic tokens.
 */
