/**
 * Chakra UI Theme Configuration
 *
 * Implements shadcn/ui-style semantic tokens with Chakra UI v3 conditional color mode support.
 * Uses `_light` and `_dark` properties for automatic light/dark mode switching.
 *
 * Theme system architecture:
 * - Palettes: Raw color values (hex) for light + dark modes
 * - Definitions: Semantic token mappings (background, foreground, primary, etc.)
 * - This file: Chakra UI integration with all available themes
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
import type { Theme } from "./types";

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
 * Auto-generate theme conditions from registry.
 *
 * Creates Chakra UI conditions for each theme in the registry.
 * Example: `githubTheme: '[data-theme="github"] &'`
 *
 * These conditions allow semantic tokens to respond to the `data-theme` attribute.
 */
function generateThemeConditions() {
	const conditions: Record<string, string> = {};

	for (const themeName of Object.keys(themeRegistry)) {
		// Convert kebab-case to camelCase and append "Theme"
		// Example: "ibm-carbon" → "ibmCarbonTheme"
		const conditionName = themeName.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + "Theme";
		conditions[conditionName] = `[data-theme="${themeName}"] &`;
	}

	return conditions;
}

/**
 * Programmatically generate semantic tokens from all themes in registry.
 *
 * For each semantic token (background, foreground, primary, etc.):
 * - Creates a condition for each theme with light and dark variants
 * - Example structure:
 *   ```
 *   background: {
 *     value: {
 *       _githubTheme: { base: "rgb(255 255 255)", _dark: "rgb(13 17 23)" },
 *       _ibmCarbonTheme: { base: "rgb(244 244 244)", _dark: "rgb(22 22 22)" },
 *       ...
 *     }
 *   }
 *   ```
 *
 * This enables "just add a file" workflow: new themes auto-generate without config changes.
 */
function generateSemanticTokens() {
	// Get all semantic token keys from first theme (all themes have same structure)
	const tokenKeys = Object.keys(githubTheme.light) as Array<
		keyof typeof githubTheme.light
	>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const colors: Record<string, any> = {};

	// For each semantic token...
	for (const tokenKey of tokenKeys) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const value: Record<string, any> = {};

		// For each theme in registry...
		for (const [themeName, theme] of Object.entries(themeRegistry)) {
			// Generate condition name (same logic as generateThemeConditions)
			const conditionName = "_" + themeName.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + "Theme";

			// Add theme-specific light and dark values
			value[conditionName] = {
				base: `rgb(${theme.light[tokenKey]})`,
				_dark: `rgb(${theme.dark[tokenKey]})`,
			};
		}

		colors[tokenKey] = { value };
	}

	return { colors };
}

const config = defineConfig({
	// Auto-generated theme conditions
	conditions: generateThemeConditions(),

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
		// Auto-generated semantic tokens for all themes
		semanticTokens: generateSemanticTokens(),
	},
});

export const system = createSystem(defaultConfig, {
	...config,
	globalCss: {
		body: {
			bg: "background",
			color: "foreground",
		},
	},
});

// Re-export types for external use
export type { Theme, ThemeColors } from "./types";
