/**
 * Unified Theme Adapter - Type Definitions
 *
 * Defines the UnifiedTheme interface that provides consistent cross-theme vocabulary
 * for CineXplorer's component layer. This adapter layer sits between official design
 * system tokens (GitHub Primer, IBM Carbon, GitLab Pajamas) and application components.
 *
 * **ARCHITECTURAL DECISION (ADR-005):**
 * This interface uses CANONICAL token names only. Semantic aliases like "card",
 * "surface-elevated", and "surface-highest" are documentation concepts, NOT tokens
 * that components can use. This enforces consistent vocabulary across all themes.
 *
 * **TOKEN NAMING:**
 * - All tokens use flat kebab-case structure (e.g., "layer-01", "border-strong-02")
 * - Components reference tokens directly: `bg="layer-01"` (not `bg="card"`)
 * - TypeScript enforces canonical names - non-canonical names produce compile errors
 *
 * **TOKEN CATEGORIES:**
 * 1. **Official Mappings**: Direct mappings from design system tokens (with corrections)
 * 2. **Derived Tokens**: Unofficial tokens generated for cross-theme consistency
 * 3. **CineXplorer Extensions**: App-specific tokens (ratings, custom semantic colors)
 *
 * Related:
 * - ADR-005: Unified Theme Adapter Layer architecture decision
 * - Task list: .arc/active/incidental/tasks-theme-definition-semantic-corrections.md
 * - Research notes: .arc/active/incidental/notes-theme-definition-semantic-corrections.md
 *
 * @see {@link https://github.com/anthropics/claude-code CineXplorer}
 */

/**
 * Unified theme interface providing ~40 consistent tokens across all design systems.
 *
 * **USAGE IN COMPONENTS:**
 * ```tsx
 * // ✅ CORRECT - Use canonical layer names
 * <Box bg="layer-01" color="foreground">Card content</Box>
 * <Box bg="layer-02" border="1px solid" borderColor="border-strong-02">Modal</Box>
 *
 * // ❌ INCORRECT - Aliases are not in the interface
 * <Box bg="card">  // TypeScript error: "card" doesn't exist
 * <Box bg="surface-elevated">  // TypeScript error
 * ```
 *
 * **SEMANTIC MEANINGS (Documentation Only):**
 * - `layer-01`: Card surfaces, first elevation level (formerly "card")
 * - `layer-02`: Elevated surfaces, modals (formerly "surface-elevated")
 * - `layer-03`: Highest elevation, dropdowns over modals (formerly "surface-highest")
 * - `popover`: Overlay surfaces (tooltips, popovers) - uses layer-02 or layer-03 depending on context
 *
 * **DEPRECATION PATH:**
 * - Old ThemeColors interface (39 tokens) → UnifiedTheme (~47 tokens)
 * - Removed tokens: `card`, `card-foreground`, `surface-elevated` (replaced by layer system)
 * - Phase 3 migration will update all components to use canonical names
 * - After migration, old ThemeColors interface will be removed
 */
export interface UnifiedTheme {
	// ===================================================================
	// CORE STRUCTURE TOKENS (Base Surfaces)
	// ===================================================================

	/**
	 * Default page background color (base canvas).
	 * Lowest elevation level in the visual hierarchy.
	 *
	 * **Usage:** Body backgrounds, main page containers
	 */
	background: string;

	/**
	 * Default text color on background surfaces.
	 *
	 * **Usage:** Primary text, body copy, main headings
	 */
	foreground: string;

	/**
	 * First elevation level (card surfaces).
	 *
	 * **Semantic meaning:** Card containers, content panels, first elevated surface.
	 * This replaces the old `card` token - components should use `layer-01` directly.
	 *
	 * **Usage:**
	 * - Movie cards, content cards
	 * - Panel backgrounds
	 * - First-level elevated containers
	 *
	 * **Text color:** Use `foreground` for text on layer-01 surfaces
	 *
	 * **Design system sources:**
	 * - GitHub Primer: bgColor-muted (with shadow for differentiation)
	 * - IBM Carbon: layer-01
	 * - GitLab Pajamas: background.color.section (neutral-50)
	 */
	"layer-01": string;

	/**
	 * Second elevation level (elevated surfaces, modals).
	 *
	 * **Semantic meaning:** Modals, dialogs, elevated panels.
	 * This replaces the old `surface-elevated` token.
	 *
	 * **Usage:**
	 * - Modal dialogs
	 * - Elevated panels over cards
	 * - Feature highlights
	 *
	 * **Text color:** Use `foreground` for text on layer-02 surfaces
	 *
	 * **Design system sources:**
	 * - GitHub Primer: bgColor-default (with shadow-lg for elevation)
	 * - IBM Carbon: layer-02
	 * - GitLab Pajamas: background.color.default (with shadow)
	 */
	"layer-02": string;

	/**
	 * Third elevation level (highest elevation - dropdowns over modals).
	 *
	 * **Semantic meaning:** Dropdowns appearing over modals, highest z-index surfaces.
	 * This is NEW - no equivalent in old ThemeColors.
	 *
	 * **Usage:**
	 * - Dropdown menus over modal dialogs
	 * - Tooltips over elevated surfaces
	 * - Context menus in complex UIs
	 *
	 * **Text color:** Use `foreground` for text on layer-03 surfaces
	 *
	 * **Design system sources:**
	 * - GitHub Primer: Derived from bgColor-default (with shadow-lg)
	 * - IBM Carbon: layer-03 (official token)
	 * - GitLab Pajamas: Derived from background.color.default (with shadow-lg)
	 */
	"layer-03": string;

	/**
	 * Overlay surfaces (tooltips, popovers, dropdowns).
	 *
	 * **Mapping:** Typically maps to layer-02 or layer-03 depending on elevation context.
	 * Popovers over base content use layer-02; popovers over modals use layer-03.
	 *
	 * **Usage:** Tooltips, dropdown menus, popovers, context menus
	 * **Text color:** Use `popover-foreground`
	 */
	popover: string;

	/**
	 * Text color on popover backgrounds.
	 */
	"popover-foreground": string;

	// ===================================================================
	// BORDER HIERARCHY (Per-Layer Border System)
	// ===================================================================
	// Inspired by IBM Carbon's per-layer border strategy, extended to all themes
	// for consistent visibility across elevation levels.

	/**
	 * Subtle border on background or layer-01 surfaces.
	 *
	 * **Contrast:** May not meet WCAG 3:1 (design system intentional choice)
	 * **Usage:** Aesthetic borders, non-critical dividers on base/card surfaces
	 * **Fallback:** Use border-strong-01 for accessibility-critical contexts
	 *
	 * **Design system sources:**
	 * - GitHub Primer: borderColor-default (#d1d9e0 light, #3d444d dark)
	 * - IBM Carbon: border-subtle-00 (#e0e0e0 light, #393939 dark)
	 * - GitLab Pajamas: Derived from neutral-100 light, neutral-700 dark
	 */
	"border-subtle-00": string;

	/**
	 * Subtle border on layer-02 surfaces.
	 *
	 * **Purpose:** Maintains consistent subtle aesthetic on elevated surfaces
	 * **Usage:** Dividers within modals, panel separators on layer-02
	 * **Note:** Carbon provides this officially; derived for Primer/Pajamas
	 */
	"border-subtle-02": string;

	/**
	 * Accessible border for background/layer-01 surfaces.
	 *
	 * **Contrast:** Meets WCAG 3:1 minimum for non-text elements
	 * **Usage:**
	 * - Accessibility-critical borders
	 * - Card outlines, button borders
	 * - Default border choice for interactive elements
	 *
	 * **Design system sources:**
	 * - GitHub Primer: borderColor-emphasis (#818b98 light, #656c76 dark)
	 * - IBM Carbon: border-strong-01 (#8d8d8d light, #6f6f6f dark)
	 * - GitLab Pajamas: neutral-300 light, neutral-600 dark
	 */
	"border-strong-01": string;

	/**
	 * Accessible border for layer-02 surfaces.
	 *
	 * **Purpose:** Ensures border visibility on elevated surfaces (modals)
	 * **Usage:** Modal borders, panel outlines on layer-02
	 * **Contrast:** Higher contrast than border-strong-01 for layer-02 backgrounds
	 */
	"border-strong-02": string;

	/**
	 * Accessible border for layer-03 surfaces.
	 *
	 * **Purpose:** Ensures border visibility on highest elevation surfaces
	 * **Usage:** Dropdown borders over modals, tooltip borders on layer-03
	 * **Contrast:** Highest contrast for layer-03 backgrounds
	 */
	"border-strong-03": string;

	// ===================================================================
	// SHADOW SYSTEM (Elevation Differentiation)
	// ===================================================================
	// Provides visual depth cues across all themes. Official for Primer/Pajamas,
	// optional/minimal for Carbon (which prefers layer color changes).

	/**
	 * Small shadow for subtle elevation (cards).
	 *
	 * **Usage:** Card containers, subtle hover states
	 * **Value example:** "0 1px 2px rgba(0, 0, 0, 0.12)"
	 */
	"shadow-sm": string;

	/**
	 * Medium shadow for moderate elevation (popovers, dropdowns).
	 *
	 * **Usage:** Dropdown menus, popovers, tooltips
	 * **Value example:** "0 3px 6px rgba(0, 0, 0, 0.15)"
	 */
	"shadow-md": string;

	/**
	 * Large shadow for high elevation (modals).
	 *
	 * **Usage:** Modal dialogs, overlays, drawer panels
	 * **Value example:** "0 8px 24px rgba(0, 0, 0, 0.2)"
	 */
	"shadow-lg": string;

	// ===================================================================
	// INTERACTION STATES (Per-Layer Interactive Feedback)
	// ===================================================================
	// Provides hover, selected, and active states that adapt to layer context.

	/**
	 * Hover state background for layer-01 surfaces.
	 *
	 * **Usage:** Card hover effects, interactive list items on layer-01
	 * **Implementation:** Typically slight darkening/lightening of layer-01
	 */
	"layer-hover-01": string;

	/**
	 * Hover state background for layer-02 surfaces.
	 *
	 * **Usage:** Interactive elements within modals, hover on layer-02
	 */
	"layer-hover-02": string;

	/**
	 * Selected state background for layer-01 surfaces.
	 *
	 * **Usage:** Selected list items, active navigation items on layer-01
	 * **Note:** More pronounced than hover, indicates current selection
	 */
	"layer-selected-01": string;

	/**
	 * Selected state background for layer-02 surfaces.
	 *
	 * **Usage:** Selected items within modals, active tabs on layer-02
	 */
	"layer-selected-02": string;

	/**
	 * Active/pressed state background for layer-01 surfaces.
	 *
	 * **Usage:** Button press feedback, active click state on layer-01
	 * **Note:** Most pronounced interactive state
	 */
	"layer-active-01": string;

	/**
	 * Active/pressed state background for layer-02 surfaces.
	 *
	 * **Usage:** Button press in modals, active state on layer-02
	 */
	"layer-active-02": string;

	// ===================================================================
	// SEMANTIC COLORS (Status, Brand, Interactive)
	// ===================================================================
	// Kept from existing ThemeColors (33-token system). These remain unchanged
	// in the unified adapter architecture.

	// Primary colors (main brand/action)
	primary: string;
	"primary-foreground": string;

	// Secondary colors (supporting actions)
	secondary: string;
	"secondary-foreground": string;

	// Muted colors (deemphasized content)
	muted: string;
	"muted-foreground": string;

	// Accent colors (highlights, links, focus)
	accent: string;
	"accent-foreground": string;
	"accent-hover": string;

	// Destructive colors (danger, errors, delete actions)
	destructive: string;
	"destructive-foreground": string;

	// Status colors (semantic feedback)
	success: string;
	"success-foreground": string;

	warning: string;
	"warning-foreground": string;

	info: string;
	"info-foreground": string;

	// Solid status background text colors
	"on-success": string;
	"on-warning": string;
	"on-destructive": string;
	"on-info": string;

	// ===================================================================
	// CINEXPLORER EXTENSIONS (App-Specific Semantic Tokens)
	// ===================================================================
	// Movie app-specific tokens centralized from palette files.

	/**
	 * Rating display background (TMDB scores, user ratings).
	 *
	 * **Standard:** IMDb gold (#F5C518) in light mode, adjusted for dark mode
	 * **Usage:** Score badges, rating indicators, quality displays
	 */
	rating: string;

	/**
	 * Text color on rating backgrounds.
	 */
	"rating-foreground": string;

	/**
	 * Badge background (genre tags, neutral labels).
	 *
	 * **Usage:** Genre tags, content ratings, non-semantic badges
	 */
	badge: string;

	/**
	 * Text color on badge backgrounds.
	 */
	"badge-foreground": string;

	/**
	 * Active drag state background (item being dragged).
	 *
	 * **Usage:** Watchlist reordering, drag-and-drop interactions
	 */
	"drag-active": string;

	/**
	 * Valid drop zone indicator.
	 *
	 * **Usage:** Drop target highlighting during drag operations
	 */
	"drop-zone": string;

	// ===================================================================
	// UI ELEMENT TOKENS (Borders, Inputs, Focus)
	// ===================================================================

	/**
	 * Standard border color (dividers, separators).
	 *
	 * **Note:** In unified adapter, this typically maps to border-subtle-00
	 * or border-strong-01 depending on theme philosophy. Kept for compatibility.
	 *
	 * **Usage:** General borders, dividers, card outlines
	 */
	border: string;

	/**
	 * Input field border color.
	 *
	 * **Usage:** Text inputs, select boxes, textareas
	 */
	input: string;

	/**
	 * Focus ring color (keyboard navigation indicator).
	 *
	 * **Accessibility:** Must meet WCAG contrast requirements
	 * **Usage:** Focus indicators, keyboard navigation
	 */
	ring: string;
}

/**
 * DEPRECATED - Legacy theme interface from pre-adapter architecture.
 *
 * This type is kept temporarily as a deprecation marker during Phase 3 component
 * migration. The actual ThemeColors interface is still defined in ../types.ts
 * until migration is complete.
 *
 * **Migration Guide:**
 * - `card` → `layer-01` (+ use `foreground` for text)
 * - `card-foreground` → `foreground` (layer-01 doesn't have separate foreground)
 * - `surface-elevated` → `layer-02`
 * - All other tokens: No changes (keep same names)
 *
 * **Timeline:**
 * - Phase 2: Adapters created using UnifiedTheme
 * - Phase 3: Components migrated to canonical names
 * - Phase 4: This type and ../types.ts ThemeColors removed
 *
 * @deprecated Use UnifiedTheme instead. Remove after Phase 3 migration complete.
 */
export type ThemeColors = Record<string, never>;
