/**
 * Chakra UI Theme Configuration
 *
 * Implements provider-based theme switching with semantic tokens.
 * Uses Chakra UI v3's `_dark` property for automatic light/dark mode switching.
 *
 * Theme system architecture:
 * - Semantic tokens contain raw RGB values directly (no intermediate palette)
 * - Light/dark mode handled by `default` and `_dark` properties
 * - Provider recreates system when theme changes
 */

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Import all theme definitions
import { githubTheme } from "./definitions/github";
import { ibmCarbonTheme } from "./definitions/ibm-carbon";
import { gitlabPajamasTheme } from "./definitions/gitlab-pajamas";
import { tangereTerminalTheme } from "./definitions/tangere-terminal";
import { sageBoneTheme } from "./definitions/sage-bone";
import { stoneGreigeTheme } from "./definitions/stone-greige";
import { mutedEarthTheme } from "./definitions/muted-earth";
import type { Theme, ThemeColors } from "./types";

/**
 * Theme Registry
 *
 * Maps theme names (kebab-case) to theme definitions.
 * Used by theme selector component for available themes.
 */
export const themeRegistry = {
	github: githubTheme,
	"ibm-carbon": ibmCarbonTheme,
	"gitlab-pajamas": gitlabPajamasTheme,
	"tangere-terminal": tangereTerminalTheme,
	"sage-bone": sageBoneTheme,
	"stone-greige": stoneGreigeTheme,
	"muted-earth": mutedEarthTheme,
} as const;

/**
 * Default theme name.
 * Used on first visit or if saved preference is invalid.
 */
export const defaultThemeName = "github";

/**
 * Type-safe theme names for validation.
 */
export type ThemeName = keyof typeof themeRegistry;

/**
 * Get theme by name with fallback to default.
 */
export function getTheme(name: string): Theme {
	return themeRegistry[name as ThemeName] || themeRegistry[defaultThemeName];
}

/**
 * Create semantic tokens with raw color values.
 *
 * No intermediate palette - just put RGB values directly in semantic tokens.
 * This is simpler and avoids circular reference issues.
 */
function createSemanticTokens(theme: Theme) {
	const tokenKeys = Object.keys(theme.light) as Array<keyof ThemeColors>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const colors: Record<string, any> = {};

	for (const tokenKey of tokenKeys) {
		// Wrap RGB values in rgb() function for valid CSS
		colors[tokenKey] = {
			value: {
				base: `rgb(${theme.light[tokenKey]})`,   // "rgb(255 255 255)" - use 'base' not 'default'
				_dark: `rgb(${theme.dark[tokenKey]})`,   // "rgb(13 17 23)"
			},
		};
	}

	return { colors };
}

/**
 * Base theme configuration (fonts, global styles, etc.)
 *
 * This is the foundation config that all themes extend.
 * Colors are NOT included here - they come from the active theme.
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
 * This is the key function that enables dynamic theme switching.
 * It creates a complete system with semantic tokens from the theme.
 *
 * When the user switches themes, we call this function with the new theme
 * and pass the resulting system to ChakraProvider.
 *
 * @param theme - Theme definition with light/dark color palettes
 * @returns Chakra UI system configured for the theme
 */
export function createThemeSystem(theme: Theme) {
	// Create theme-specific config with semantic tokens
	const themeConfig = defineConfig({
		theme: {
			semanticTokens: createSemanticTokens(theme),
		},
	});

	// Merge base config + theme config + Chakra defaults
	// Order matters: later configs override earlier ones
	return createSystem(defaultConfig, baseConfig, themeConfig);
}

/**
 * Default system using GitHub theme.
 * Used as initial system before user preferences load.
 */
export const defaultSystem = createThemeSystem(githubTheme);

// Re-export types for external use
export type { Theme, ThemeColors } from "./types";
