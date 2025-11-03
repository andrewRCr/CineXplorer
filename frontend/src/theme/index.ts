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
 */

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Import all theme definitions
import { githubTheme } from "./definitions/github";
import { ibmCarbonTheme } from "./definitions/ibm-carbon";
import { gitlabPajamasTheme } from "./definitions/gitlab-pajamas";
import type { Theme, ThemeColors } from "./types";

/**
 * Theme Registry
 *
 * Production themes optimized for accessibility and visual consistency.
 */
export const themeRegistry = {
	github: githubTheme,
	"ibm-carbon": ibmCarbonTheme,
	"gitlab-pajamas": gitlabPajamasTheme,
} as const;

export const defaultThemeName = "github";
export type ThemeName = keyof typeof themeRegistry;

export function getTheme(name: string): Theme {
	return themeRegistry[name as ThemeName] || themeRegistry[defaultThemeName];
}

/**
 * Create base tokens from theme.
 *
 * Base tokens are the foundation layer containing raw hex color values.
 * Semantic tokens reference these to create meaningful, mode-aware color names.
 */
function createBaseTokens(theme: Theme) {
	const tokenKeys = Object.keys(theme.light) as Array<keyof ThemeColors>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const light: Record<string, any> = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const dark: Record<string, any> = {};

	for (const tokenKey of tokenKeys) {
		light[tokenKey] = { value: theme.light[tokenKey] };
		dark[tokenKey] = { value: theme.dark[tokenKey] };
	}

	return { light, dark };
}

/**
 * Create semantic tokens with references to base tokens.
 *
 * Semantic tokens provide meaningful color names (background, foreground, etc.)
 * that automatically switch between light and dark values based on color mode.
 * Uses Chakra's token reference syntax: {colors.light.tokenName}
 */
function createSemanticTokens(theme: Theme) {
	const tokenKeys = Object.keys(theme.light) as Array<keyof ThemeColors>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const colors: Record<string, any> = {};

	for (const tokenKey of tokenKeys) {
		colors[tokenKey] = {
			value: {
				base: `{colors.light.${tokenKey}}`,   // Light mode reference
				_dark: `{colors.dark.${tokenKey}}`,    // Dark mode reference
			},
		};
	}

	return { colors };
}

/**
 * Base theme configuration (fonts, global styles, etc.)
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
 * Chakra UI system with base tokens and semantic tokens for the given theme.
 *
 * When the user switches themes, we call this function with the new theme
 * and pass the resulting system to ChakraProvider, triggering a re-render
 * with the new color palette.
 *
 * @param theme - Theme definition with light/dark color palettes
 * @returns Chakra UI system configured for the theme
 */
export function createThemeSystem(theme: Theme) {
	const baseTokens = createBaseTokens(theme);

	const themeConfig = defineConfig({
		theme: {
			tokens: {
				colors: baseTokens,
			},
			semanticTokens: createSemanticTokens(theme),
		},
	});

	return createSystem(defaultConfig, baseConfig, themeConfig);
}

/**
 * Default system using GitHub theme.
 */
export const defaultSystem = createThemeSystem(githubTheme);

// Re-export types for external use
export type { Theme, ThemeColors } from "./types";
