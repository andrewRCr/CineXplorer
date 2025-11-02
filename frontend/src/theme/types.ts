/**
 * Theme System Type Definitions
 *
 * Defines type-safe interfaces for CineXplorer's theme system.
 * Based on shadcn/ui semantic color convention, adapted for Chakra UI v3.
 *
 * @see https://ui.shadcn.com/docs/theming
 */

/**
 * Theme color palette following shadcn/ui semantic naming convention.
 *
 * All colors are RGB space-separated values (e.g., "249 245 229") to support
 * Chakra UI's opacity modifiers (e.g., bg="primary/50").
 *
 * Color values must be RGB triplets (no `rgb()` wrapper, no hex values).
 * Example: "255 255 255" for white, "0 0 0" for black.
 *
 * Semantic tokens provide meaning-based color names rather than appearance-based.
 * This allows themes to change colors while maintaining consistent meaning across
 * the application.
 */
export interface ThemeColors {
	// ===================================================================
	// BASE COLORS
	// ===================================================================

	/** Default page background */
	background: string;

	/** Default text color on background */
	foreground: string;

	// ===================================================================
	// CARD COLORS
	// ===================================================================

	/** Card container backgrounds (elevated surfaces) */
	card: string;

	/** Text color on card backgrounds */
	"card-foreground": string;

	// ===================================================================
	// POPOVER COLORS
	// ===================================================================

	/** Popover/dropdown/tooltip backgrounds */
	popover: string;

	/** Text color on popover backgrounds */
	"popover-foreground": string;

	// ===================================================================
	// PRIMARY COLORS (Main Brand/Action)
	// ===================================================================

	/** Primary action elements (main buttons, key CTAs) */
	primary: string;

	/** Text/icon color on primary backgrounds */
	"primary-foreground": string;

	// ===================================================================
	// SECONDARY COLORS (Supporting Actions)
	// ===================================================================

	/** Secondary action elements (secondary buttons, alternate actions) */
	secondary: string;

	/** Text/icon color on secondary backgrounds */
	"secondary-foreground": string;

	// ===================================================================
	// MUTED COLORS (Deemphasized Content)
	// ===================================================================

	/** Muted/disabled backgrounds, subtle surfaces */
	muted: string;

	/** Secondary text, deemphasized content, labels */
	"muted-foreground": string;

	// ===================================================================
	// ACCENT COLORS (Highlights & Callouts)
	// ===================================================================

	/** Highlighted elements, callouts, badges, interactive accents */
	accent: string;

	/** Text/icon color on accent backgrounds */
	"accent-foreground": string;

	// ===================================================================
	// DESTRUCTIVE COLORS (Danger/Error States)
	// ===================================================================

	/** Danger/error/destructive actions and states */
	destructive: string;

	/** Text/icon color on destructive backgrounds */
	"destructive-foreground": string;

	// ===================================================================
	// UI ELEMENT COLORS
	// ===================================================================

	/** Standard borders (dividers, outlines) */
	border: string;

	/** Input field borders (text inputs, selects) */
	input: string;

	/** Focus ring color (keyboard navigation indicator) */
	ring: string;
}

/**
 * Complete theme definition with light and dark color palettes.
 *
 * Each theme provides:
 * - Unique identifier and display name
 * - Light mode color palette (ThemeColors)
 * - Dark mode color palette (ThemeColors)
 *
 * Themes are immutable once defined. To change colors, create a new theme.
 */
export interface Theme {
	/** Unique theme identifier (kebab-case, e.g., "github", "cinexplorer-custom") */
	readonly name: string;

	/** Human-readable theme name for display (e.g., "GitHub", "CineXplorer Custom") */
	readonly label: string;

	/** Light mode color palette */
	readonly light: ThemeColors;

	/** Dark mode color palette */
	readonly dark: ThemeColors;
}

/**
 * Theme registry mapping theme names to theme definitions.
 * All registered themes available for selection.
 *
 * Example:
 * ```typescript
 * const themes: ThemeRegistry = {
 *   "github": githubTheme,
 *   "cinexplorer-custom": cinexplorerTheme,
 * };
 * ```
 */
export type ThemeRegistry = Readonly<Record<string, Theme>>;
