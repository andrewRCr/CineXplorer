/**
 * WCAG Contrast Validation Script
 *
 * Validates that all semantic token combinations meet WCAG AA contrast standards
 * across all theme variants (4 themes × 2 modes = 8 variants).
 *
 * **Purpose:** Automated verification of accessible color contrast ratios
 * **Standard:** WCAG AA (4.5:1 for text, 3:1 for UI components)
 * **Scope:** ~80 token pairs across 8 categories
 */

import { hex as getContrast } from "wcag-contrast";
import {
	githubTheme,
	ibmCarbonTheme,
	gitlabPajamasTheme,
	materialDesign3Theme,
} from "../src/theme/color/definitions";
import type { UnifiedTheme } from "../src/theme/color/types";

// ============================================================================
// TYPES
// ============================================================================

interface TokenPair {
	fg: string;
	bg: string;
	optional?: boolean; // Skip if token undefined
	threshold?: "text" | "ui"; // Default: 'text'
}

interface ValidationResult {
	themeName: string;
	mode: "light" | "dark";
	pair: TokenPair;
	fgValue: string | undefined;
	bgValue: string | undefined;
	ratio: number | null;
	passed: boolean;
	reason?: string;
}

// ============================================================================
// WCAG THRESHOLDS
// ============================================================================

const THRESHOLDS = {
	text: 4.5, // Normal text minimum
	ui: 3.0, // UI components (borders, focus rings)
} as const;

// ============================================================================
// WHITELIST: Valid Token Combinations
// ============================================================================

/**
 * Category 1: Semantic Pairs (on-* Convention)
 *
 * Pattern: on-{color} text on {color} background
 * Source: Color Token System strategy, UnifiedTheme interface
 */
const semanticPairs: TokenPair[] = [
	// Action colors
	{ fg: "on-primary", bg: "primary" },
	{ fg: "on-secondary", bg: "secondary" },
	{ fg: "on-tertiary", bg: "tertiary" },

	// Status colors
	{ fg: "on-success", bg: "success" },
	{ fg: "on-warning", bg: "warning" },
	{ fg: "on-destructive", bg: "destructive" },
	{ fg: "on-info", bg: "info" },

	// Helper colors
	{ fg: "on-badge", bg: "badge" },
	{ fg: "on-muted", bg: "muted" },
	{ fg: "on-popover", bg: "popover" },

	// Button pattern tokens
	{ fg: "on-button-subtle", bg: "button-subtle" },
	{ fg: "on-button-subtle-selected", bg: "button-subtle-selected" },

	// Brand (optional - may be undefined in some themes)
	{ fg: "on-brand", bg: "brand", optional: true },
	{ fg: "on-brandSecondary", bg: "brandSecondary", optional: true },
	{ fg: "on-brandTertiary", bg: "brandTertiary", optional: true },
];

/**
 * Category 2: Text on Structural Surfaces
 *
 * Pattern: Primary/secondary text on layer backgrounds
 * Source: Component Styling Strategy - Building Surfaces section
 */
const textOnSurfaces: TokenPair[] = [
	// Primary text on all surfaces
	{ fg: "foreground", bg: "background" },
	{ fg: "foreground", bg: "layer-01" },
	{ fg: "foreground", bg: "layer-02" },
	{ fg: "foreground", bg: "layer-03" },
	{ fg: "foreground", bg: "popover" },

	// Secondary/muted text on surfaces
	{ fg: "on-muted", bg: "background" },
	{ fg: "on-muted", bg: "layer-01" },
	{ fg: "on-muted", bg: "layer-02" },
];

/**
 * Category 3: Interactive Text on Surfaces
 *
 * Pattern: Links, tertiary buttons, ghost buttons, outline buttons on surfaces
 * Source: Component Styling Strategy - Interactive Elements, Button patterns
 */
const interactiveOnSurfaces: TokenPair[] = [
	// Default interactive text
	{ fg: "tertiary", bg: "background" },
	{ fg: "tertiary", bg: "layer-01" },
	{ fg: "tertiary", bg: "layer-02" },

	// Hover states
	{ fg: "tertiary-hover", bg: "background" },
	{ fg: "tertiary-hover", bg: "layer-01" },
	{ fg: "tertiary-hover", bg: "layer-02" },

	// Active/pressed states
	{ fg: "tertiary-active", bg: "background" },
	{ fg: "tertiary-active", bg: "layer-01" },
	{ fg: "tertiary-active", bg: "layer-02" },

	// Outline buttons (transparent background - text on actual surface)
	{ fg: "on-button-outline", bg: "background" },
	{ fg: "on-button-outline", bg: "layer-01" },
	{ fg: "on-button-outline-primary", bg: "background" },
	{ fg: "on-button-outline-primary", bg: "layer-01" },
];

/**
 * Category 4: Borders on Surfaces (Layer-Aware)
 *
 * Pattern: Form controls and structural borders
 * Source: Component Styling Strategy - Layer-Aware Border Tokens, Form Inputs
 */
const bordersOnSurfaces: TokenPair[] = [
	// Layer-aware borders (form controls, structural containers)
	{ fg: "border-strong-01", bg: "layer-01", threshold: "ui" },
	{ fg: "border-strong-02", bg: "layer-02", threshold: "ui" },
	{ fg: "border-strong-03", bg: "layer-03", threshold: "ui" },

	// Subtle borders
	{ fg: "border-subtle-00", bg: "background", threshold: "ui" },
	{ fg: "border-subtle-02", bg: "layer-02", threshold: "ui" },

	// Generic border (decorative only)
	{ fg: "border", bg: "background", threshold: "ui" },
	{ fg: "border", bg: "layer-01", threshold: "ui" },
];

/**
 * Category 5: Interaction States on Surfaces
 *
 * Pattern: Hover, selected, active states on interactive surfaces
 * Source: Component Styling Strategy - Interaction State Philosophy
 */
const interactionStates: TokenPair[] = [
	// Hover states
	{ fg: "foreground", bg: "layer-hover-01" },
	{ fg: "foreground", bg: "layer-hover-02" },
	{ fg: "on-muted", bg: "layer-hover-01" },

	// Selected states
	{ fg: "foreground", bg: "layer-selected-01" },
	{ fg: "foreground", bg: "layer-selected-02" },
	{ fg: "on-button-subtle-selected", bg: "button-subtle-selected" },

	// Active/pressed states
	{ fg: "foreground", bg: "layer-active-01" },
	{ fg: "foreground", bg: "layer-active-02" },
];

/**
 * Category 6: Focus Indicators
 *
 * Pattern: Focus rings and focused borders
 * Source: Component Styling Strategy - Focus Indicators (ADR-015)
 */
const focusIndicators: TokenPair[] = [
	// Focus rings on surfaces (outline with offset, not direct contact)
	{ fg: "ring", bg: "background", threshold: "ui" },
	{ fg: "ring", bg: "layer-01", threshold: "ui" },
	{ fg: "ring", bg: "layer-02", threshold: "ui" },

	// Focus border on inputs (tertiary border color change)
	{ fg: "tertiary", bg: "background", threshold: "ui" },
	{ fg: "tertiary", bg: "layer-01", threshold: "ui" },
	{ fg: "tertiary", bg: "layer-02", threshold: "ui" },
];

/**
 * Category 7: Alert/Status Descriptions
 *
 * Pattern: Alert description text on subtle status backgrounds
 * Source: Alert recipe implementation, Component Styling Strategy
 *
 * NOTE: These use 10% opacity backgrounds that need special handling.
 * The validation script resolves opacity tokens before checking contrast.
 */
const alertDescriptions: TokenPair[] = [
	{ fg: "foreground", bg: "success/10" },
	{ fg: "foreground", bg: "warning/10" },
	{ fg: "foreground", bg: "destructive/10" },
	{ fg: "foreground", bg: "info/10" },
];

/**
 * Category 8: Movie-Specific UI Elements
 *
 * Pattern: Rating stars and drag-drop interactions
 * Source: ThemeDebug CineXplorerExtensionsSection, Component Styling Strategy
 */
const movieSpecific: TokenPair[] = [
	// IMDb-gold rating stars on surfaces
	{ fg: "imdb-gold", bg: "background" },
	{ fg: "imdb-gold", bg: "layer-01" },
	{ fg: "imdb-gold", bg: "layer-02" },

	// Drag-and-drop states
	{ fg: "on-secondary", bg: "drag-active" },
	{ fg: "foreground", bg: "drop-zone" },
];

// Combine all categories
const ALL_TOKEN_PAIRS: TokenPair[] = [
	...semanticPairs,
	...textOnSurfaces,
	...interactiveOnSurfaces,
	...bordersOnSurfaces,
	...interactionStates,
	...focusIndicators,
	...alertDescriptions,
	...movieSpecific,
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve token value from theme, handling special cases
 *
 * NOTE: Uses unknown intermediate cast per TypeScript best practices for
 * dynamic property access. All UnifiedTheme properties are string colors.
 */
function resolveToken(
	tokenName: string,
	theme: UnifiedTheme,
): string | undefined {
	// Type-safe dynamic token access pattern (TypeScript recommended approach)
	// UnifiedTheme has no index signature, so we use unknown intermediate
	const themeRecord = theme as unknown as Record<string, string | undefined>;

	// Handle opacity tokens (e.g., "success/10")
	if (tokenName.includes("/")) {
		const [baseToken, opacityStr] = tokenName.split("/");
		const opacity = parseInt(opacityStr, 10) / 100;

		const baseColor = themeRecord[baseToken];
		const layerColor = theme.background; // Blend with base layer

		if (!baseColor) return undefined;

		return blendColors(baseColor, layerColor, opacity);
	}

	// Standard token lookup
	return themeRecord[tokenName];
}

/**
 * Blend foreground color with background at given opacity
 *
 * @param fg - Foreground color (hex)
 * @param bg - Background color (hex)
 * @param opacity - Alpha value (0-1)
 * @returns Blended color (hex)
 */
function blendColors(fg: string, bg: string, opacity: number): string {
	const fgRgb = hexToRgb(fg);
	const bgRgb = hexToRgb(bg);

	if (!fgRgb || !bgRgb) return fg;

	const r = Math.round(fgRgb.r * opacity + bgRgb.r * (1 - opacity));
	const g = Math.round(fgRgb.g * opacity + bgRgb.g * (1 - opacity));
	const b = Math.round(fgRgb.b * opacity + bgRgb.b * (1 - opacity));

	return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Validate a single token pair
 */
function validatePair(
	pair: TokenPair,
	theme: UnifiedTheme,
	themeName: string,
	mode: "light" | "dark",
): ValidationResult {
	const fgValue = resolveToken(pair.fg, theme);
	const bgValue = resolveToken(pair.bg, theme);

	// Handle optional tokens
	if (pair.optional && (!fgValue || !bgValue)) {
		return {
			themeName,
			mode,
			pair,
			fgValue,
			bgValue,
			ratio: null,
			passed: true,
			reason: "Optional token undefined (skipped)",
		};
	}

	// Handle missing required tokens
	if (!fgValue || !bgValue) {
		return {
			themeName,
			mode,
			pair,
			fgValue,
			bgValue,
			ratio: null,
			passed: false,
			reason: `Missing token: ${!fgValue ? pair.fg : pair.bg}`,
		};
	}

	// Calculate contrast ratio
	const ratio = getContrast(fgValue, bgValue);
	const threshold = pair.threshold === "ui" ? THRESHOLDS.ui : THRESHOLDS.text;
	const passed = ratio >= threshold;

	return {
		themeName,
		mode,
		pair,
		fgValue,
		bgValue,
		ratio,
		passed,
	};
}

// ============================================================================
// MAIN VALIDATION
// ============================================================================

function runValidation() {
	const themes = [
		{ name: "GitHub Primer", def: githubTheme },
		{ name: "IBM Carbon", def: ibmCarbonTheme },
		{ name: "GitLab Pajamas", def: gitlabPajamasTheme },
		{ name: "Material Design 3", def: materialDesign3Theme },
	];

	const allResults: ValidationResult[] = [];
	let totalTests = 0;
	let totalPassed = 0;
	let totalFailed = 0;
	let totalSkipped = 0;

	console.log("=".repeat(80));
	console.log("WCAG CONTRAST VALIDATION - Theme System");
	console.log("=".repeat(80));
	console.log();
	console.log(`Testing ${themes.length} themes × 2 modes = ${themes.length * 2} variants`);
	console.log(`Token pairs per variant: ${ALL_TOKEN_PAIRS.length}`);
	console.log(`Total tests: ${themes.length * 2 * ALL_TOKEN_PAIRS.length}`);
	console.log();

	// Run validation for each theme variant
	for (const { name, def } of themes) {
		for (const mode of ["light", "dark"] as const) {
			const themeColors = mode === "light" ? def.lightUnified : def.darkUnified;

			for (const pair of ALL_TOKEN_PAIRS) {
				const result = validatePair(pair, themeColors, name, mode);
				allResults.push(result);
				totalTests++;

				if (result.reason?.includes("skipped")) {
					totalSkipped++;
				} else if (result.passed) {
					totalPassed++;
				} else {
					totalFailed++;
				}
			}
		}
	}

	// ========================================================================
	// REPORT: Failures Only
	// ========================================================================

	const failures = allResults.filter((r) => !r.passed && !r.reason?.includes("skipped"));

	if (failures.length > 0) {
		console.log("❌ FAILURES DETECTED");
		console.log("=".repeat(80));
		console.log();

		// Group failures by theme
		const failuresByTheme = failures.reduce(
			(acc, failure) => {
				const key = `${failure.themeName} (${failure.mode})`;
				if (!acc[key]) acc[key] = [];
				acc[key].push(failure);
				return acc;
			},
			{} as Record<string, ValidationResult[]>,
		);

		for (const [themeKey, themeFailures] of Object.entries(failuresByTheme)) {
			console.log(`\n${themeKey}:`);
			console.log("-".repeat(80));

			for (const failure of themeFailures) {
				const threshold =
					failure.pair.threshold === "ui" ? THRESHOLDS.ui : THRESHOLDS.text;
				const thresholdLabel = failure.pair.threshold === "ui" ? "UI" : "TEXT";

				console.log(`  ${failure.pair.fg} on ${failure.pair.bg}`);
				console.log(`    FG: ${failure.fgValue}`);
				console.log(`    BG: ${failure.bgValue}`);
				console.log(
					`    Ratio: ${failure.ratio?.toFixed(2)} (need ${threshold}:1 for ${thresholdLabel})`,
				);

				if (failure.reason) {
					console.log(`    Reason: ${failure.reason}`);
				}

				console.log();
			}
		}
	}

	// ========================================================================
	// SUMMARY
	// ========================================================================

	console.log();
	console.log("=".repeat(80));
	console.log("SUMMARY");
	console.log("=".repeat(80));
	console.log(`Total tests:   ${totalTests}`);
	console.log(`✅ Passed:      ${totalPassed}`);
	console.log(`❌ Failed:      ${totalFailed}`);
	console.log(`⊘  Skipped:     ${totalSkipped} (optional tokens)`);
	console.log();

	if (failures.length === 0) {
		console.log("✅ ALL TESTS PASSED - Theme system meets WCAG AA standards!");
		process.exit(0);
	} else {
		console.log(`❌ ${failures.length} FAILURES - See details above`);
		process.exit(1);
	}
}

// Run validation
runValidation();
