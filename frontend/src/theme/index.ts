/**
 * Chakra UI Theme Configuration
 *
 * Implements provider-based theme switching with semantic tokens.
 * Uses Chakra UI v3 token reference system with hex color values.
 *
 * Theme system architecture:
 * - Base tokens: Hex color values from UnifiedTheme adapters
 * - Semantic tokens: References to base tokens (e.g., {colors.light.background})
 * - Light/dark mode: Handled by `base` and `_dark` properties
 * - Theme switching: Provider recreates system when theme changes
 *
 * All themes use the UnifiedTheme interface (~67 tokens) providing consistent
 * cross-theme vocabulary for layer system, border hierarchy, shadows, and
 * interaction states.
 */

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Import all theme definitions
import {
    marqueeTheme,
    githubTheme,
    ibmCarbonTheme,
    gitlabPajamasTheme,
    materialDesign3Theme,
} from "./color/definitions";
import type { Theme } from "./types";
import { chakraColorRoles, chakraShadowRoles } from "./color/chakra-roles";

// Import layout tokens
import { layoutFoundations } from "./layout/foundations";
import { layoutSemanticTokens } from "./layout/semantic-tokens";
import { zIndexSemanticTokens } from "./layout/z-index";

// Import recipes
import {
    buttonRecipe,
    selectRecipe,
    alertRecipe,
    badgeRecipe,
    checkboxRecipe,
    radioRecipe,
    switchRecipe,
    tooltipRecipe,
    toastRecipe,
    menuRecipe,
    dialogRecipe,
    drawerRecipe,
} from "./recipes";

/**
 * Theme Registry
 *
 * Production themes optimized for accessibility and visual consistency.
 * Marquee is the default. Carbon's layer-based elevation philosophy guides
 * CineXplorer's unified theme system architecture.
 *
 * Material Design 3 added to validate unified adapter pattern across multiple design systems.
 */
export const themeRegistry = {
    marquee: marqueeTheme,
    "ibm-carbon": ibmCarbonTheme,
    "github-primer": githubTheme,
    "gitlab-pajamas": gitlabPajamasTheme,
    "material-design-3": materialDesign3Theme,
} as const;

export const defaultThemeName = "marquee";
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
 * **Shadow Tokens:** Shadow tokens (shadow-sm, shadow-md, shadow-lg) are extracted
 * separately and returned in their own category to align with Chakra UI's token system
 * architecture (colors vs shadows are distinct token types).
 */
function createBaseTokens(theme: Theme) {
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

    // Add unified adapter tokens
    const unifiedKeys = Object.keys(theme.lightUnified) as Array<
        keyof typeof theme.lightUnified
    >;

    for (const tokenKey of unifiedKeys) {
        const isShadow = shadowTokens.includes(
            tokenKey as (typeof shadowTokens)[number],
        );
        const lightTokens = isShadow ? lightShadows : lightColors;
        const darkTokens = isShadow ? darkShadows : darkColors;
        const lightValue = theme.lightUnified[tokenKey];
        const darkValue = theme.darkUnified[tokenKey];

        // Optional roles without a color must not become undefined Chakra tokens.
        if (lightValue !== undefined)
            lightTokens[tokenKey] = { value: lightValue };
        if (darkValue !== undefined)
            darkTokens[tokenKey] = { value: darkValue };
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
 * **Shadow Tokens:** Shadows are created as semantic tokens referencing base shadow values,
 * enabling automatic light/dark mode switching. Example: shadow-sm references
 * {shadows.light.shadow-sm} in light mode, {shadows.dark.shadow-sm} in dark mode.
 */
function createSemanticTokens(theme: Theme) {
    // Shadow token names (for semantic shadow creation)
    const shadowTokens = ["shadow-sm", "shadow-md", "shadow-lg"] as const;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colors: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shadows: Record<string, any> = {};

    // Add unified adapter semantic tokens
    const unifiedKeys = Object.keys(theme.lightUnified) as Array<
        keyof typeof theme.lightUnified
    >;

    for (const tokenKey of unifiedKeys) {
        const hasLight = theme.lightUnified[tokenKey] !== undefined;
        const hasDark = theme.darkUnified[tokenKey] !== undefined;
        if (!hasLight && !hasDark) continue;

        const isShadow = shadowTokens.includes(
            tokenKey as (typeof shadowTokens)[number],
        );
        const category = isShadow ? "shadows" : "colors";
        const tokens = isShadow ? shadows : colors;
        tokens[tokenKey] = {
            value: {
                ...(hasLight
                    ? { base: `{${category}.light.${tokenKey}}` }
                    : {}),
                ...(hasDark ? { _dark: `{${category}.dark.${tokenKey}}` } : {}),
            },
        };
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
            },
            // Layout foundation tokens (base sizes)
            ...layoutFoundations,
            // Z-index scale
            ...zIndexSemanticTokens,
        },
        semanticTokens: {
            // Layout semantic tokens (responsive sizing)
            ...layoutSemanticTokens,
            // Chakra's own color and shadow names, rendered as theme roles
            colors: chakraColorRoles,
            shadows: chakraShadowRoles,
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
            // Tooltip recipe (content, arrow, arrowTip, positioner, trigger slots)
            tooltip: tooltipRecipe,
            // Toast recipe (root, indicator, title, description, actionTrigger, closeTrigger slots)
            toast: toastRecipe,
            // Menu, dialog and drawer: keyboard highlight and backdrops in theme roles
            menu: menuRecipe,
            dialog: dialogRecipe,
            drawer: drawerRecipe,
        },
    },
    globalCss: {
        "*::placeholder": { color: "on-muted" },
        "*::selection": { bg: "tertiary/20", color: "foreground" },
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
 * - Marquee: Carbon's conservative shadows
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
 * Default system using the default theme (Marquee).
 */
export const defaultSystem = createThemeSystem(themeRegistry[defaultThemeName]);

// Default export for Chakra CLI typegen
export default defaultSystem;

// Re-export types for external use
export type { Theme } from "./types";
