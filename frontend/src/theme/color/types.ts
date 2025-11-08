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
    // Per ADR-010: Primary/Secondary/Tertiary hierarchy with optional brand separation.
    // Per ADR-011: Standardized on `on-*` prefix for ALL foreground tokens.
    // Token types match usage: background tokens for fills, foreground tokens for text.
    // All `-foreground` suffix tokens are deprecated in favor of `on-*` prefix.

    /**
     * Primary action button background color.
     *
     * **Token Type:** BACKGROUND (for filled buttons, large color areas)
     *
     * **Semantic Meaning:** Primary action buttons, submit buttons, key CTAs
     *
     * **Usage:**
     * - Submit buttons, "Save" buttons, primary CTAs
     * - Always use with `primary-foreground` for text
     * - Mandatory for all filled primary buttons
     *
     * **Design System Mappings (ADR-010):**
     * - GitHub Primer: GREEN (bg_success, #1f883d) - actions use green
     * - IBM Carbon: BLUE (fg_accent, #0f62fe used as bg) - unified blue
     * - GitLab Pajamas: BLUE (#1f75cb) - actions use blue
     *
     * **Distinction from `tertiary`:**
     * - Primary: Background token for button fills
     * - Tertiary: Foreground token for links/interactive text
     *
     * @see ADR-010 for full rationale on Primary/Secondary/Tertiary hierarchy
     */
    primary: string;

    /**
     * Text color on primary button backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix to clearly indicate
     * "text that goes ON a primary background" (Material Design 3 pattern).
     *
     * **Usage:**
     * - Text on primary buttons
     * - Icons on primary surfaces
     * - Any content overlaid on `primary` background
     *
     * **Example:**
     * ```tsx
     * <Button bg="primary" color="on-primary">Submit</Button>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-primary": string;

    /**
     * @deprecated Use `on-primary` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `primary-foreground` usage with `on-primary`.
     * This alias will be removed in a future version.
     *
     * @see on-primary for current token documentation
     * @see ADR-011 for migration rationale
     */
    "primary-foreground": string;

    /**
     * Secondary action button background color.
     *
     * **Token Type:** BACKGROUND + BORDER (outline pattern mandatory)
     *
     * **Semantic Meaning:** Secondary actions, less prominent buttons
     *
     * **Usage:**
     * - "Cancel", "Back", "Skip" buttons
     * - REQUIRED: Use with `borderWidth="1px"` + `borderColor="border-strong-01"`
     * - Industry standard: outline style with 1px border
     *
     * **Pattern Example:**
     * ```tsx
     * <Button
     *   bg="secondary"
     *   color="secondary-foreground"
     *   borderWidth="1px"
     *   borderColor="border-strong-01"
     * >
     *   Cancel
     * </Button>
     * ```
     *
     * @see ADR-010 for mandatory outline pattern rationale
     */
    secondary: string;

    /**
     * Text color on secondary button backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text on secondary buttons
     * - Icons on secondary surfaces
     * - Any content overlaid on `secondary` background
     *
     * **Example:**
     * ```tsx
     * <Button bg="secondary" color="on-secondary" borderWidth="1px" borderColor="border-strong-01">
     *   Cancel
     * </Button>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-secondary": string;

    /**
     * @deprecated Use `on-secondary` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `secondary-foreground` usage with `on-secondary`.
     * This alias will be removed in a future version.
     *
     * @see on-secondary for current token documentation
     * @see ADR-011 for migration rationale
     */
    "secondary-foreground": string;

    /**
     * Deemphasized, non-interactive background color.
     *
     * **Token Type:** BACKGROUND (non-interactive)
     *
     * **Semantic Meaning:** Disabled states, subtle backgrounds, deemphasized content
     *
     * **Usage:**
     * - Disabled buttons, inactive states
     * - Subtle backgrounds for non-critical content
     * - Deemphasized surfaces
     *
     * **Distinction from `secondary`:**
     * - Muted: Non-interactive, disabled, deemphasized
     * - Secondary: Interactive, clickable, actionable
     *
     * @see ADR-010 for muted vs secondary distinction
     */
    muted: string;

    /**
     * Text color for deemphasized, secondary text (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Help text, labels, captions
     * - Timestamps, metadata
     * - Secondary information that should be less prominent
     * - Text on `muted` backgrounds
     *
     * **Example:**
     * ```tsx
     * <Text color="on-muted" fontSize="sm">Last updated 2 hours ago</Text>
     * <Box bg="muted"><Text color="on-muted">Disabled content</Text></Box>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-muted": string;

    /**
     * @deprecated Use `on-muted` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `muted-foreground` usage with `on-muted`.
     * This alias will be removed in a future version.
     *
     * @see on-muted for current token documentation
     * @see ADR-011 for migration rationale
     */
    "muted-foreground": string;

    /**
     * Interactive text, links, and accent highlights.
     *
     * **Token Type:** FOREGROUND (for text, links, icons)
     *
     * **Semantic Meaning:** Hyperlinks, interactive text, focus states, highlights
     *
     * **Usage:**
     * - Hyperlinks, clickable text
     * - Focus indicators, active tab highlights
     * - Interactive text elements
     *
     * **Design System Mappings (ADR-010):**
     * - GitHub Primer: BLUE (fg_accent, #0969da) - links use blue
     * - IBM Carbon: BLUE (fg_accent, #0f62fe) - same as primary, semantically distinct
     * - GitLab Pajamas: PURPLE (#7759c2) - links use purple (brand-aligned)
     *
     * **Distinction from `primary`:**
     * - Tertiary: Foreground token for links/text
     * - Primary: Background token for button fills
     *
     * **Replaces:** `accent` (deprecated - use `tertiary` for new code)
     *
     * @see ADR-010 for Primary/Secondary/Tertiary hierarchy rationale
     */
    tertiary: string;

    /**
     * Text color on tertiary backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text on tertiary-colored backgrounds (e.g., tertiary badges)
     * - Rarely used since tertiary is primarily a foreground token for links
     *
     * **Note:** Optional token - most tertiary usage is foreground-only (links)
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-tertiary"?: string;

    /**
     * @deprecated Use `on-tertiary` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `tertiary-foreground` usage with `on-tertiary`.
     * This alias will be removed in a future version.
     *
     * @see on-tertiary for current token documentation
     * @see ADR-011 for migration rationale
     */
    "tertiary-foreground"?: string;

    /**
     * @deprecated Use `tertiary` instead. This is a legacy alias maintained for
     * backward compatibility during component migration (ADR-010 Phase 4).
     *
     * **Migration:** Replace all `accent` usage with `tertiary` in components.
     * This alias will be removed after global accent → tertiary migration completes.
     *
     * @see tertiary for current token documentation
     */
    accent: string;

    /**
     * @deprecated Use `tertiary-foreground` instead. Legacy alias for compatibility.
     *
     * @see tertiary-foreground for current token documentation
     */
    "accent-foreground": string;

    /**
     * Hover state for accent/tertiary interactive elements.
     *
     * **Usage:** Link hover states, focus state brightening
     * **Note:** Will be renamed to `tertiary-hover` after accent deprecation complete
     */
    "accent-hover": string;

    // ===================================================================
    // INTERACTION STATE TOKENS (Color-Based)
    // ===================================================================
    // Per ADR-009: Material Design opacity overlays (8% hover, 12% active)
    // These tokens provide pre-calculated interaction states for semantic colors.

    /**
     * Hover state for primary action buttons (ADR-009).
     *
     * **Implementation:** Primary color + 8% foreground opacity overlay
     * **Usage:** Solid button hover effects
     *
     * **Example:**
     * ```tsx
     * <Button bg="primary" color="on-primary" _hover={{ bg: "primary-hover" }}>
     *   Save
     * </Button>
     * ```
     *
     * @see ADR-009 for Material Design opacity overlay rationale
     */
    "primary-hover": string;

    /**
     * Active/pressed state for primary action buttons (ADR-009).
     *
     * **Implementation:** Primary color + 12% foreground opacity overlay
     * **Usage:** Solid button active/pressed effects
     *
     * **Example:**
     * ```tsx
     * <Button bg="primary" _active={{ bg: "primary-active" }}>Save</Button>
     * ```
     *
     * @see ADR-009 for Material Design opacity overlay rationale
     */
    "primary-active": string;

    /**
     * Hover state for secondary/subtle buttons (ADR-009).
     *
     * **Implementation:** Secondary color + 8% foreground opacity overlay
     * **Usage:** Subtle button hover effects (via button-subtle token)
     *
     * **Example:**
     * ```tsx
     * <Button bg="button-subtle" _hover={{ bg: "secondary-hover" }}>Options</Button>
     * ```
     *
     * @see ADR-009 for Material Design opacity overlay rationale
     * @see ADR-012 for button-subtle usage pattern
     */
    "secondary-hover": string;

    /**
     * Active/pressed state for secondary/subtle buttons (ADR-009).
     *
     * **Implementation:** Secondary color + 12% foreground opacity overlay
     * **Usage:** Subtle button active/pressed effects
     *
     * **Example:**
     * ```tsx
     * <Button bg="button-subtle" _active={{ bg: "secondary-active" }}>Options</Button>
     * ```
     *
     * @see ADR-009 for Material Design opacity overlay rationale
     */
    "secondary-active": string;

    /**
     * Hover state for tertiary/interactive text (ADR-009).
     *
     * **Implementation:** Tertiary color brightened/saturated
     * **Usage:** Link hover states, interactive text
     *
     * **Example:**
     * ```tsx
     * <Link color="tertiary" _hover={{ color: "tertiary-hover" }}>Learn more</Link>
     * ```
     *
     * **Note:** Currently aliased as `accent-hover` during migration
     *
     * @see ADR-009 for interaction state approach
     */
    "tertiary-hover": string;

    /**
     * Active/pressed state for tertiary/interactive text (ADR-009).
     *
     * **Implementation:** Tertiary color darkened/desaturated
     * **Usage:** Link active/pressed states
     *
     * **Example:**
     * ```tsx
     * <Link color="tertiary" _active={{ color: "tertiary-active" }}>Learn more</Link>
     * ```
     *
     * @see ADR-009 for interaction state approach
     */
    "tertiary-active": string;

    /**
     * Logo and brand identity color (optional - not all themes have brand colors).
     *
     * **Token Type:** EITHER (context-dependent - can be background or foreground)
     *
     * **Semantic Meaning:** Brand identity, logo color, special brand moments
     *
     * **Usage:**
     * - Logo sections, brand identity elements
     * - Special brand moments (hero sections, marketing pages)
     * - Company-specific UI elements
     *
     * **NOT for general component use** - Use `primary`/`secondary`/`tertiary` for UI actions
     *
     * **Design System Mappings (ADR-010):**
     * - GitHub Primer: `undefined` (no brand color - black/white logo)
     * - IBM Carbon: BLUE (#0f62fe) - IBM brand blue
     * - GitLab Pajamas: PURPLE (#554488) - GitLab brand purple
     *
     * **Example - GitLab:**
     * - Logo: Uses `brand` (purple) + `brandSecondary` (orange)
     * - Primary button: Uses `primary` (blue), NOT brand
     * - Links: Use `tertiary` (purple, matches brand but semantically different)
     *
     * @see ADR-010 for brand vs primary distinction and usage guidelines
     */
    brand?: string;

    /**
     * Secondary brand color (optional - for systems with multiple brand colors).
     *
     * **Token Type:** EITHER (context-dependent)
     *
     * **Semantic Meaning:** Secondary brand accents, additional brand colors
     *
     * **Usage:**
     * - Additional brand accents (e.g., GitLab orange)
     * - Secondary brand moments
     * - Complementary brand elements
     *
     * **NOT for general component use** - Use functional tokens for UI
     *
     * **Design System Mappings (ADR-010):**
     * - GitHub Primer: `undefined`
     * - IBM Carbon: `undefined`
     * - GitLab Pajamas: ORANGE (#e24329) - tangerine accent
     *
     * @see ADR-010 for optional brand token usage guidelines
     */
    brandSecondary?: string;

    /**
     * Text color on brand backgrounds (ADR-011 canonical naming, optional).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text on brand-colored backgrounds
     * - Logo text overlays
     * - Brand moment text content
     *
     * **Design System Mappings (ADR-011):**
     * - GitHub Primer: `undefined` (no brand token)
     * - IBM Carbon: Maps to `on-primary` (brand IS primary blue)
     * - GitLab Pajamas: Maps to `on-tertiary` (both use purple)
     * - Material Design 3: Maps to `on-primary` (brand IS primary purple)
     *
     * **Example:**
     * ```tsx
     * <Box bg="brand" color="on-brand">Brand Section</Box>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-brand"?: string;

    /**
     * Text color on secondary brand backgrounds (ADR-011 canonical naming, optional).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text on brandSecondary-colored backgrounds
     * - Secondary brand moment text content
     *
     * **Design System Mappings (ADR-011):**
     * - GitHub Primer: `undefined` (no brandSecondary token)
     * - IBM Carbon: `undefined` (no brandSecondary token)
     * - GitLab Pajamas: Maps to `on-primary` (works well on orange)
     * - Material Design 3: `undefined` (no brandSecondary token)
     *
     * **Example:**
     * ```tsx
     * <Box bg="brandSecondary" color="on-brandSecondary">Secondary Brand</Box>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-brandSecondary"?: string;

    // ===================================================================
    // BUTTON PATTERN TOKENS (ADR-012)
    // ===================================================================
    // Separate button pattern semantics from color semantics.
    // These tokens map consistently across all themes to avoid confusion.

    /**
     * Border and text color for outline buttons (ADR-012).
     *
     * **Pattern:** Transparent background with visible border
     * **Mapping:** Always maps to `primary` color across all themes
     *
     * **Usage:**
     * - Cancel, Back, Skip buttons (high-emphasis alternative to filled primary)
     * - Use with Chakra's `variant="outline"`
     *
     * **Example:**
     * ```tsx
     * <Button variant="outline" borderColor="button-outline" color="button-outline">
     *   Cancel
     * </Button>
     * ```
     *
     * **Rationale:** Outline buttons consistently use the primary action color
     * across all design systems (GitHub green, Carbon blue, GitLab orange, Material purple).
     * This token provides self-documenting API and cross-theme consistency.
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "button-outline": string;

    /**
     * Text color on outline button backgrounds (ADR-012).
     *
     * **Mapping:** Always maps to `on-primary` across all themes
     *
     * **Note:** For outline buttons, border and text use the same color (`button-outline`).
     * This token exists for semantic completeness and potential future divergence.
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "on-button-outline": string;

    /**
     * Background color for subtle filled buttons (ADR-012).
     *
     * **Pattern:** Filled background with muted color
     * **Mapping:** Always maps to `secondary` color across all themes
     *
     * **Usage:**
     * - Medium-emphasis actions (between primary and ghost)
     * - Use with Chakra's `variant="subtle"`
     *
     * **Example:**
     * ```tsx
     * <Button variant="subtle" bg="button-subtle" color="on-button-subtle">
     *   Options
     * </Button>
     * ```
     *
     * **Rationale:** Subtle buttons use the secondary (gray-ish) color for
     * medium emphasis without competing with primary action buttons.
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "button-subtle": string;

    /**
     * Text color on subtle button backgrounds (ADR-012).
     *
     * **Mapping:** Always maps to `on-secondary` across all themes
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "on-button-subtle": string;

    // ===================================================================
    // STATUS COLORS (Semantic Feedback)
    // ===================================================================
    // Per ADR-011: All foreground tokens use `on-*` prefix for consistency.
    // The `-foreground` suffix variants are deprecated.

    /**
     * Danger, error, and delete action background color.
     *
     * **Usage:** Delete buttons, error alerts, destructive actions
     */
    destructive: string;

    /**
     * Text color on destructive backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix.
     *
     * **Usage:**
     * - Text on destructive buttons
     * - Text in error alerts
     * - Any content overlaid on `destructive` background
     *
     * **Example:**
     * ```tsx
     * <Button bg="destructive" color="on-destructive">Delete</Button>
     * <Alert bg="destructive/10"><Text color="on-destructive">Error occurred</Text></Alert>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-destructive": string;

    /**
     * @deprecated Use `on-destructive` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `destructive-foreground` usage with `on-destructive`.
     * This alias will be removed in a future version.
     *
     * @see on-destructive for current token documentation
     * @see ADR-011 for migration rationale
     */
    "destructive-foreground": string;

    /**
     * Success, confirmation, and positive feedback background color.
     *
     * **Usage:** Success alerts, confirmation messages, high ratings
     */
    success: string;

    /**
     * Text color on success backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix.
     *
     * **Usage:**
     * - Text in success alerts
     * - Text on success badges
     * - Any content overlaid on `success` background
     *
     * **Example:**
     * ```tsx
     * <Alert bg="success/10"><Text color="on-success">Action completed</Text></Alert>
     * <Badge bg="success" color="on-success">Active</Badge>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-success": string;

    /**
     * @deprecated Use `on-success` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `success-foreground` usage with `on-success`.
     * This alias will be removed in a future version.
     *
     * @see on-success for current token documentation
     * @see ADR-011 for migration rationale
     */
    "success-foreground": string;

    /**
     * Warning, caution, and validation warning background color.
     *
     * **Usage:** Warning alerts, validation messages, caution states
     */
    warning: string;

    /**
     * Text color on warning backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix.
     *
     * **Usage:**
     * - Text in warning alerts
     * - Text on warning badges
     * - Any content overlaid on `warning` background
     *
     * **Example:**
     * ```tsx
     * <Alert bg="warning/10"><Text color="on-warning">Please verify</Text></Alert>
     * <Badge bg="warning" color="on-warning">Pending</Badge>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-warning": string;

    /**
     * @deprecated Use `on-warning` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `warning-foreground` usage with `on-warning`.
     * This alias will be removed in a future version.
     *
     * @see on-warning for current token documentation
     * @see ADR-011 for migration rationale
     */
    "warning-foreground": string;

    /**
     * Informational message background color.
     *
     * **Usage:** Info alerts, help text, neutral information
     */
    info: string;

    /**
     * Text color on info backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix.
     *
     * **Usage:**
     * - Text in info alerts
     * - Text on info badges
     * - Any content overlaid on `info` background
     *
     * **Example:**
     * ```tsx
     * <Alert bg="info/10"><Text color="on-info">Helpful tip</Text></Alert>
     * <Badge bg="info" color="on-info">New</Badge>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-info": string;

    /**
     * @deprecated Use `on-info` instead. This alias is maintained for backward
     * compatibility during component migration (ADR-011).
     *
     * **Migration:** Replace all `info-foreground` usage with `on-info`.
     * This alias will be removed in a future version.
     *
     * @see on-info for current token documentation
     * @see ADR-011 for migration rationale
     */
    "info-foreground": string;

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
