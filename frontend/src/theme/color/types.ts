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
 * 1. **Official Mappings**: Direct mappings from design system tokens
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
 * - `layer-01`: Card surfaces, first elevation level
 * - `layer-02`: Elevated surfaces, modals
 * - `layer-03`: Highest elevation, dropdowns over modals
 * - `popover`: Overlay surfaces (tooltips, popovers) - uses layer-02 or layer-03 depending on context
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
     * **Text color:** Use `on-popover`
     */
    popover: string;

    /**
     * Text color on popover backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text in tooltips, dropdown menus, popovers
     * - Any content overlaid on `popover` background
     *
     * **Example:**
     * ```tsx
     * <Tooltip>
     *   <Tooltip.Content bg="popover">
     *     <Text color="on-popover">Tooltip text</Text>
     *   </Tooltip.Content>
     * </Tooltip>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-popover": string;

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
     * - GitLab Pajamas: ORANGE (#fca326) - actions use brand orange (Orange 01p)
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
     * - GitLab Pajamas: PURPLE (#7759c2) - links use purple (UI accent, not brand)
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
     * **Note:** Deprecated alias `accent-hover` maintained for backward compatibility
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
     * - GitLab Pajamas: ORANGE (#fca326) - GitLab brand orange (Orange 01p from tanuki logo)
     *
     * **Example - GitLab:**
     * - Logo: Uses `brand` (orange 01p) + `brandSecondary` (orange 02p) + `brandTertiary` (orange 03p/tanuki red)
     * - Primary button: Uses `primary` (orange 01p, same as brand)
     * - Links: Use `tertiary` (purple, UI accent not brand)
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
     * - GitLab Pajamas: ORANGE (#fc6d26) - medium orange (Orange 02p, middle of tanuki logo gradient)
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
     * - GitLab Pajamas: Maps to `on-primary` (white text on brand orange)
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

    /**
     * Tertiary brand color (optional - for systems with three distinct brand colors).
     *
     * **Purpose:** Tertiary brand identity color (rare - only for multi-color brand identities)
     *
     * **Usage:**
     * - Logo elements with 3+ colors
     * - Tertiary brand accents
     * - Brand gradient endpoints
     *
     * **NOT for general component use** - use semantic tokens (primary/secondary/tertiary) instead.
     *
     * **Design System Mappings:**
     * - GitHub Primer: `undefined`
     * - IBM Carbon: `undefined`
     * - GitLab Pajamas: ORANGE (#e24329) - tanuki red (Orange 03p, darkest in logo gradient)
     * - Material Design 3: `undefined`
     *
     * **Example - GitLab logo gradient:**
     * GitLab's tanuki logo uses 3 oranges: bright (#fca326) → medium (#fc6d26) → red (#e24329)
     *
     * @see ADR-010 for optional brand token usage guidelines
     */
    brandTertiary?: string;

    /**
     * Text color on tertiary brand backgrounds (ADR-011 canonical naming, optional).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text on brandTertiary-colored backgrounds
     * - Tertiary brand moment text content
     *
     * **Design System Mappings (ADR-011):**
     * - GitHub Primer: `undefined` (no brandTertiary token)
     * - IBM Carbon: `undefined` (no brandTertiary token)
     * - GitLab Pajamas: Maps to `on-primary` (white text on tanuki red)
     * - Material Design 3: `undefined` (no brandTertiary token)
     *
     * **Example:**
     * ```tsx
     * <Box bg="brandTertiary" color="on-brandTertiary">Tertiary Brand</Box>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-brandTertiary"?: string;

    // ===================================================================
    // BUTTON PATTERN TOKENS (ADR-012)
    // ===================================================================
    // Separate button pattern semantics from color semantics.
    // These tokens map consistently across all themes to avoid confusion.

    /**
     * Border/text color for neutral outline buttons - DEFAULT (ADR-012).
     *
     * **Pattern:** Transparent background with neutral gray border
     * **Mapping:** Always maps to `border-strong-01` (neutral) across all themes
     *
     * **Usage:**
     * - Utility actions: OAuth buttons, navigation (Back/Cancel), filter toggles
     * - Most common outline button type
     * - Use with Chakra's `variant="outline"`
     *
     * **Hover behavior:** Shifts to tertiary/accent to signal interactivity
     *
     * **Example:**
     * ```tsx
     * <Button
     *   variant="outline"
     *   borderColor="button-outline"
     *   color="on-button-outline"
     *   _hover={{ bg: "tertiary/8", borderColor: "tertiary" }}
     * >
     *   Cancel
     * </Button>
     * ```
     *
     * **Rationale:** Most outline buttons are neutral utility actions, not branded.
     * Default name (`button-outline`) is the most common use case.
     *
     * @see ADR-012 for button pattern semantics and neutral vs primary distinction
     */
    "button-outline": string;

    /**
     * Text color on neutral outline button backgrounds (ADR-012).
     *
     * **Mapping:** Always maps to `foreground` across all themes
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "on-button-outline": string;

    /**
     * Border/text color for primary outline buttons - EXPLICIT (ADR-012).
     *
     * **Pattern:** Transparent background with primary brand color border
     * **Mapping:** Always maps to `primary` across all themes
     *
     * **Usage:**
     * - Branded actions in outline style (less common than neutral)
     * - High emphasis but less visual weight than solid primary
     * - Use with Chakra's `variant="outline"`
     *
     * **Hover behavior:** Stays in primary color family (bg overlay)
     *
     * **Example:**
     * ```tsx
     * <Button
     *   variant="outline"
     *   borderColor="button-outline-primary"
     *   color="on-button-outline-primary"
     *   _hover={{ bg: "primary/8" }}
     * >
     *   Learn More
     * </Button>
     * ```
     *
     * **Rationale:** Explicit name signals special case - when you want brand color
     * in outline style (GitHub green, Carbon blue, GitLab orange, Material purple).
     *
     * @see ADR-012 for button pattern semantics and neutral vs primary distinction
     */
    "button-outline-primary": string;

    /**
     * Text color on primary outline button backgrounds (ADR-012).
     *
     * **Mapping:** Always maps to `on-primary` across all themes
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "on-button-outline-primary": string;

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

    /**
     * Background color for selected state of subtle buttons (ADR-012 extension).
     *
     * **Pattern:** Selected state for subtle filled buttons
     * **Mapping:** Always maps to `layer-selected-02` across all themes
     *
     * **Usage:**
     * - Selected subtle buttons (e.g., theme selector, filter toggles)
     * - Use when subtle button represents a selectable option
     * - Transitions from "filled button" to "selected surface" semantics
     *
     * **Rationale:** When a subtle button is selected, it shifts from button
     * semantics (secondary color) to surface semantics (layer-selected-*).
     * This requires different foreground color for proper contrast across themes.
     *
     * **Example:**
     * ```tsx
     * <Button
     *   bg={isSelected ? "button-subtle-selected" : "button-subtle"}
     *   color={isSelected ? "on-button-subtle-selected" : "on-button-subtle"}
     * >
     *   Theme Option
     * </Button>
     * ```
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "button-subtle-selected": string;

    /**
     * Text color on selected subtle button backgrounds (ADR-012 extension).
     *
     * **Mapping:** Always maps to `foreground` across all themes
     *
     * **Rationale:** Selected subtle buttons use layer-selected-02 which pairs
     * with foreground (not on-secondary), ensuring proper contrast in all themes.
     *
     * @see ADR-012 for button pattern semantics rationale
     */
    "on-button-subtle-selected": string;

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

    // ===================================================================
    // CINEXPLORER EXTENSIONS (App-Specific Semantic Tokens)
    // ===================================================================
    // Movie app-specific tokens centralized from palette files.

    /**
     * IMDb gold color for rating star icons.
     *
     * **Standard:** IMDb gold (#F5C518) in light mode, adjusted for dark mode
     * **Usage:** Star icons (★) for user personal ratings (5-star system)
     *
     * **Pattern:**
     * ```tsx
     * <Text color="imdb-gold" fontSize="xl">★★★★☆</Text>
     * ```
     *
     * **NOT for badge backgrounds:**
     * - TMDB community scores use status colors (success/info/warning) based on thresholds
     * - See CineXplorerExtensionsSection for reference implementation
     * - ≥7.5: success (green), 5.0-7.4: info (blue), <5.0: warning (yellow)
     */
    "imdb-gold": string;

    /**
     * Badge background (genre tags, neutral labels).
     *
     * **Usage:** Genre tags, content ratings, non-semantic badges
     * **Text color:** Use `on-badge`
     */
    badge: string;

    /**
     * Text color on badge backgrounds (ADR-011 canonical naming).
     *
     * **Naming Convention:** Uses industry-standard `on-*` prefix for consistency.
     *
     * **Usage:**
     * - Text in genre tags, content rating badges
     * - Any content overlaid on `badge` background
     *
     * **Example:**
     * ```tsx
     * <Badge bg="badge" color="on-badge">Action</Badge>
     * <Badge bg="badge" color="on-badge">PG-13</Badge>
     * ```
     *
     * @see ADR-011 for on-* naming convention rationale
     */
    "on-badge": string;

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

