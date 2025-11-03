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

	/** Highlighted elements, callouts, badges, interactive accents, links */
	accent: string;

	/** Text/icon color on accent backgrounds */
	"accent-foreground": string;

	/**
	 * Link hover state (brighter/more saturated than accent).
	 * Used for interactive link hover feedback, creating visual distinction on mouse-over.
	 * Typically a warmer or more vibrant shade of the accent color.
	 */
	"accent-hover": string;

	// ===================================================================
	// DESTRUCTIVE COLORS (Danger/Error States)
	// ===================================================================

	/** Danger/error/destructive actions and states */
	destructive: string;

	/** Text/icon color on destructive backgrounds */
	"destructive-foreground": string;

	// ===================================================================
	// STATUS COLORS (Semantic Feedback States)
	// ===================================================================

	/** Success/positive state (completions, confirmations, positive feedback) */
	success: string;

	/** Text/icon color on success backgrounds */
	"success-foreground": string;

	/** Warning/caution state (alerts, potential issues, careful attention needed) */
	warning: string;

	/** Text/icon color on warning backgrounds */
	"warning-foreground": string;

	/** Info/neutral state (informational messages, tips, helpful guidance) */
	info: string;

	/** Text/icon color on info backgrounds */
	"info-foreground": string;

	// ===================================================================
	// RATING COLORS (Movie-Specific Semantic)
	// ===================================================================

	/**
	 * Rating/score displays (movie ratings, user scores, quality indicators).
	 * Distinct from warning token - ratings have different semantic meaning.
	 * Light mode: #F5C518 (IMDb gold standard), Dark mode: adjusted for contrast.
	 */
	rating: string;

	/** Text/icon color on rating backgrounds */
	"rating-foreground": string;

	// ===================================================================
	// SURFACE ELEVATION (Additional Elevation Layer)
	// ===================================================================

	/**
	 * Elevated surface level (featured sections, emphasized cards, modals).
	 * Third surface level in elevation hierarchy: background < card < surface-elevated < popover.
	 * Uses tonal variation to create depth (lighter in dark mode per Material Design 3 approach).
	 */
	"surface-elevated": string;

	// ===================================================================
	// BADGE COLORS (Neutral Tags & Labels)
	// ===================================================================

	/** Neutral badge backgrounds (genre tags, default labels, non-semantic tags) */
	badge: string;

	/** Text/icon color on badge backgrounds */
	"badge-foreground": string;

	// ===================================================================
	// INTERACTIVE STATES (Drag-and-Drop)
	// ===================================================================

	/**
	 * Element being actively dragged (darker/emphasized appearance).
	 * Indicates item is in dragged state, provides visual feedback during drag operation.
	 */
	"drag-active": string;

	/**
	 * Valid drop target indicator (subtle success/accent tint).
	 * Shows where dragged item can be dropped, provides clear affordance for drop zones.
	 */
	"drop-zone": string;

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
