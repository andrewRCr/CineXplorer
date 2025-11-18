/**
 * Chakra UI Theme Configuration
 *
 * Implements provider-based theme switching with semantic tokens.
 * Uses Chakra UI v3 token reference system with hex color values.
 *
 * Theme system architecture:
 * - Base tokens: Hex color values from theme palettes
 * - Semantic tokens: References to base tokens (e.g., {colors.light.background})
 * - Light/dark mode: Handled by `base` and `_dark` properties
 * - Theme switching: Provider recreates system when theme changes
 *
 * **TRANSITIONAL STATE:**
 * - Theme registry, exports, and createThemeSystem() are active core infrastructure
 * - createBaseTokens()/createSemanticTokens() use legacy theme.light/theme.dark structure
 * - Supports both old ThemeColors tokens (~39) and new UnifiedTheme tokens (~47)
 * - Planned cleanup will remove legacy dual-palette code and ThemeColors interface
 * - See tasks-theme-system-modernization.md for scheduled refactoring
 */

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Import all theme definitions
import { githubTheme } from "./definitions/github";
import { ibmCarbonTheme } from "./definitions/ibm-carbon";
import { gitlabPajamasTheme } from "./definitions/gitlab-pajamas";
import { materialDesign3Theme } from "./definitions/material-design-3";
import type { Theme, ThemeColors } from "./types";

// Import layout tokens
import { layoutFoundations } from "./layout/foundations";
import { layoutSemanticTokens } from "./layout/semantic-tokens";
import { zIndexSemanticTokens } from "./layout/z-index";

// Import recipes
import { buttonRecipe, selectRecipe, alertRecipe, badgeRecipe, checkboxRecipe, radioRecipe, switchRecipe } from "./recipes";

/**
 * Theme Registry
 *
 * Production themes optimized for accessibility and visual consistency.
 * IBM Carbon is the default - its layer-based elevation philosophy guides
 * CineXplorer's unified theme system architecture.
 *
 * Material Design 3 added to validate unified adapter pattern across multiple design systems.
 */
export const themeRegistry = {
    "ibm-carbon": ibmCarbonTheme,
    "github-primer": githubTheme,
    "gitlab-pajamas": gitlabPajamasTheme,
    "material-design-3": materialDesign3Theme,
} as const;

export const defaultThemeName = "ibm-carbon";
export type ThemeName = keyof typeof themeRegistry;

export function getTheme(name: string): Theme {
    return themeRegistry[name as ThemeName] || themeRegistry[defaultThemeName];
}

/**
 * Create base tokens from theme.
 *
 * Base tokens are the foundation layer containing raw hex color values and shadow definitions.
 * Semantic tokens reference these to create meaningful, mode-aware color and shadow names.
 *
 * During parallel systems migration, this includes both
 * old ThemeColors tokens (~39) and new UnifiedTheme tokens (~47) when available.
 * Result: ~86 tokens available during migration, enabling gradual component updates.
 *
 * **Shadow Tokens:** Shadow tokens (shadow-sm, shadow-md, shadow-lg) are extracted
 * separately and returned in their own category to align with Chakra UI's token system
 * architecture (colors vs shadows are distinct token types).
 */
function createBaseTokens(theme: Theme) {
    const tokenKeys = Object.keys(theme.light) as Array<keyof ThemeColors>;

    // Shadow token names (extracted separately)
    const shadowTokens = ["shadow-sm", "shadow-md", "shadow-lg"] as const;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lightColors: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const darkColors: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lightShadows: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const darkShadows: Record<string, any> = {};

    // Add legacy ThemeColors tokens
    for (const tokenKey of tokenKeys) {
        lightColors[tokenKey] = { value: theme.light[tokenKey] };
        darkColors[tokenKey] = { value: theme.dark[tokenKey] };
    }

    // Add unified adapter tokens if available (parallel systems; intermediate state for now, see header comment)
    if (theme.lightUnified && theme.darkUnified) {
        const unifiedKeys = Object.keys(theme.lightUnified) as Array<
            keyof typeof theme.lightUnified
        >;

        for (const tokenKey of unifiedKeys) {
            // Extract shadow tokens separately
            if (
                shadowTokens.includes(tokenKey as (typeof shadowTokens)[number])
            ) {
                lightShadows[tokenKey] = {
                    value: theme.lightUnified[tokenKey],
                };
                darkShadows[tokenKey] = { value: theme.darkUnified[tokenKey] };
            } else {
                // All other tokens go to colors
                lightColors[tokenKey] = { value: theme.lightUnified[tokenKey] };
                darkColors[tokenKey] = { value: theme.darkUnified[tokenKey] };
            }
        }
    }

    return {
        colors: { light: lightColors, dark: darkColors },
        shadows: { light: lightShadows, dark: darkShadows },
    };
}

/**
 * Create semantic tokens with references to base tokens.
 *
 * Semantic tokens provide meaningful color and shadow names (background, foreground, shadow-sm, etc.)
 * that automatically switch between light and dark values based on color mode.
 * Uses Chakra's token reference syntax: {colors.light.tokenName} or {shadows.light.tokenName}
 *
 * Includes unified adapter token references when available during transitional state.
 *
 * **Shadow Tokens:** Shadows are created as semantic tokens referencing base shadow values,
 * enabling automatic light/dark mode switching. Example: shadow-sm references
 * {shadows.light.shadow-sm} in light mode, {shadows.dark.shadow-sm} in dark mode.
 */
function createSemanticTokens(theme: Theme) {
    const tokenKeys = Object.keys(theme.light) as Array<keyof ThemeColors>;

    // Shadow token names (for semantic shadow creation)
    const shadowTokens = ["shadow-sm", "shadow-md", "shadow-lg"] as const;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colors: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shadows: Record<string, any> = {};

    // Add legacy ThemeColors semantic tokens
    for (const tokenKey of tokenKeys) {
        colors[tokenKey] = {
            value: {
                base: `{colors.light.${tokenKey}}`, // Light mode reference
                _dark: `{colors.dark.${tokenKey}}`, // Dark mode reference
            },
        };
    }

    // Add unified adapter semantic tokens if available
    if (theme.lightUnified && theme.darkUnified) {
        const unifiedKeys = Object.keys(theme.lightUnified) as Array<
            keyof typeof theme.lightUnified
        >;

        for (const tokenKey of unifiedKeys) {
            // Create semantic shadow tokens
            if (
                shadowTokens.includes(tokenKey as (typeof shadowTokens)[number])
            ) {
                shadows[tokenKey] = {
                    value: {
                        base: `{shadows.light.${tokenKey}}`,
                        _dark: `{shadows.dark.${tokenKey}}`,
                    },
                };
            } else {
                // Create semantic color tokens
                colors[tokenKey] = {
                    value: {
                        base: `{colors.light.${tokenKey}}`,
                        _dark: `{colors.dark.${tokenKey}}`,
                    },
                };
            }
        }
    }

    return { colors, shadows };
}

/**
 * Base theme configuration (fonts, layout foundations, global styles, etc.)
 */
const baseConfig = defineConfig({
    theme: {
        tokens: {
            fonts: {
                heading: {
                    value: `'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                },
                body: {
                    value: `'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                },
                system: {
                    value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
                },
                inter: {
                    value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                },
                sourcesans: {
                    value: `'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                },
            },
            // Layout foundation tokens (base sizes)
            ...layoutFoundations,
            // Z-index scale
            ...zIndexSemanticTokens,
        },
        semanticTokens: {
            // Layout semantic tokens (responsive sizing)
            ...layoutSemanticTokens,
        },
        recipes: {
            // Button recipe (5 finalized variants: solid, secondary, outline, subtle, ghost)
            button: buttonRecipe,
            // Badge recipe (status: success, warning, error, info, neutral)
            badge: badgeRecipe,
        },
        slotRecipes: {
            // Checkbox slot recipe (root, control, indicator, label slots)
            checkbox: checkboxRecipe,
            // Radio Group slot recipe (root, item, itemControl, indicator, label, itemText slots)
            radioGroup: radioRecipe,
            // Select recipe (trigger, content, item slots)
            select: selectRecipe,
            // Alert recipe (root, icon, title, description slots)
            alert: alertRecipe,
            // Switch recipe (control, thumb slots)
            switch: switchRecipe,
        },
    },
    globalCss: {
        body: {
            bg: "background",
            color: "foreground",
        },
    },
});

/**
 * Create a Chakra UI system for a specific theme.
 *
 * This is the core function for dynamic theme switching. It creates a complete
 * Chakra UI system combining the given theme (colors + shadows) with global layout tokens.
 *
 * When the user switches themes, we call this function with the new theme
 * and pass the resulting system to ChakraProvider, triggering a re-render
 * with the new palette and shadow system. Layout tokens remain consistent across all themes.
 *
 * **Shadow System Integration:**
 * Shadows are registered as a separate token category (not colors) following Chakra UI v3
 * conventions. This enables proper token lookup for boxShadow properties (e.g., boxShadow="shadow-sm").
 * Each design system provides its own shadow values:
 * - IBM Carbon: Minimal shadows (prefers layer color changes)
 * - GitHub Primer: Heavy shadows (primary elevation indicator)
 * - GitLab Pajamas: Moderate shadows (balanced approach)
 *
 * @param theme - Theme definition with light/dark palettes (colors + shadows)
 * @returns Chakra UI system configured with color theme + shadow system + layout tokens
 */
export function createThemeSystem(theme: Theme) {
    const baseTokens = createBaseTokens(theme);
    const semanticTokens = createSemanticTokens(theme);

    const themeConfig = defineConfig({
        theme: {
            tokens: {
                colors: baseTokens.colors,
                shadows: baseTokens.shadows,
            },
            semanticTokens: {
                colors: semanticTokens.colors,
                shadows: semanticTokens.shadows,
            },
        },
    });

    return createSystem(defaultConfig, baseConfig, themeConfig);
}

/**
 * Default system using the default theme (IBM Carbon).
 */
export const defaultSystem = createThemeSystem(themeRegistry[defaultThemeName]);

// Default export for Chakra CLI typegen
export default defaultSystem;

// Re-export types for external use
export type { Theme, ThemeColors } from "./types";
