# Design Systems Token Patterns - Reference

**Purpose**: Consolidated reference of token patterns from major design systems (GitHub Primer, IBM Carbon,
Material Design 3, Ant Design). This document extracts proven patterns and architectural approaches useful for
understanding professional token system design.

**Research Date**: November 2025
**Systems Analyzed**: GitHub Primer, IBM Carbon v11, Material Design 3, Ant Design v5

---

## Token Architecture Patterns

### Hierarchical Layer Systems

All analyzed systems use layered token architectures, but with different numbers of layers:

#### Three-Layer Systems

**GitHub Primer:**

1. **Base Tokens** - Raw foundational values (e.g., `color-scale-blue-5`)
   - Should NOT be used directly in code
   - Single source of truth for actual values

2. **Functional Tokens** - Global UI patterns (e.g., `fgColor-accent`, `bgColor-default`)
   - Most commonly used throughout applications
   - Automatically respect color modes
   - Reference base tokens under the hood

3. **Component/Pattern Tokens** - Specific use cases (e.g., `button-primary-bgColor-hover`)
   - Limited use; functional tokens preferred where possible
   - Only for genuinely unique scenarios

**Ant Design:**

1. **Seed Tokens** - Origin values developers directly customize (e.g., `colorPrimary`)
   - Base values that developers modify
   - Algorithmic source for derived tokens

2. **Map Tokens** - Derived contextual values (e.g., `colorPrimaryBg`, `colorPrimaryHover`)
   - Automatically calculated from seed tokens
   - Maintain consistent relationships

3. **Alias Tokens** - Component-specific implementations (e.g., `colorLink`, `colorBgElevated`)
   - Specialized map tokens
   - Enable batch component styling

#### Four-Layer Systems

**Material Design 3:**

1. **Reference Tokens** - Concrete values (hex colors, pixel measurements)
2. **System Tokens** - Design decisions and roles (e.g., `md-sys-color-primary`)
3. **Component Tokens** - UI element attributes derived from system tokens
4. **Alias/Semantic Tokens** - Intermediate layer connecting reference to system

**IBM Carbon:**

1. **Global/Primitive Tokens** - Raw foundational values from IBM Design Language
2. **Alias (Semantic) Tokens** - Map global tokens to UI roles (e.g., `text-01`, `interactive-01`)
3. **Component Tokens** - Applied to specific UI components
4. **Contextual Tokens** - Special tokens without numeric suffixes that adapt to layer context

### Key Architectural Insights

**Foundation-First Approach (All Systems):**

- Changes to foundational tokens cascade through dependent systems
- One change updates 100+ use cases automatically
- Reduces maintenance burden exponentially at scale

**Layer Count Trade-offs:**

- **3 layers**: Simpler mental model, faster to learn
- **4 layers**: More granular control, better for complex enterprise systems

**Algorithmic Derivation (Ant Design, Material Design 3):**

- Single color input generates complete palette
- Removes manual color management burden
- Ensures mathematical consistency
- Automatically supports multiple themes

---

## Semantic Naming Conventions

### Naming Pattern Structures

**GitHub Primer Format:**

```
--[property]Color-[semanticRole]-[variant]

Examples:
--fgColor-accent
--bgColor-success-muted
--borderColor-danger-emphasis
```

**IBM Carbon Format:**

```
{category}-{role}-{layer}

Examples:
text-01 (primary text)
interactive-01 (primary interactive)
field-02 (field on layer-01)
```

**Material Design 3 Format:**

```
md-sys-color-[role]-[variant]

Examples:
md-sys-color-primary
md-sys-color-primary-container
md-sys-color-on-primary
```

**Ant Design Format:**

```
color[Role][State/Context]

Examples:
colorPrimary
colorPrimaryHover
colorPrimaryBg
```

### Semantic vs Descriptive Naming

**All systems favor semantic over descriptive naming:**

✅ Semantic (communicates purpose):

- `bgColor-accent`, `colorPrimary`, `interactive-01`
- Enables theme switching without token name changes
- Developers intuitively understand where to use

❌ Descriptive (describes implementation):

- `color-blue-5`, `hex-ff6b6b`, `dark-gray-400`
- Breaks when themes change colors
- No communication of purpose

---

## Color Role Patterns

### Primary/Secondary/Tertiary Hierarchy

All systems implement accent color hierarchy, but with different depths:

**Material Design 3** (explicit three-accent pattern):

- **Primary**: Prominent buttons, active states, primary navigation
- **Secondary**: Less prominent components, filter chips, secondary buttons
- **Tertiary**: Contrasting accent for visual distinction, alternative CTAs

Each includes: Base color + Container variant + "On" color (guaranteed contrast)

**GitHub Primer** (single accent):

- **Accent**: Primary interactive elements (links, focus states, primary buttons)
- Single accent color simplified for GitHub's specific needs

**IBM Carbon** (multiple interactive tokens):

- **interactive-01**, **interactive-02**, etc.
- Numbered rather than named (primary/secondary/tertiary)
- Follows IBM Design Language color palette

**Ant Design** (single primary with algorithmic derivation):

- **colorPrimary**: Main brand color
- Automatically generates: `colorPrimaryBg`, `colorPrimaryBorder`, `colorPrimaryHover`, `colorPrimaryActive`

### Status/State Color Patterns

**Full Status Set (Ant Design, Material Design 3):**

- **Success**: Green - positive outcomes, confirmations
- **Error**: Red - errors, failures, destructive actions
- **Warning**: Yellow/Orange - cautions, attention-required states
- **Info**: Blue - information, neutral actions, processing

**Partial Status Set (GitHub Primer):**

- **Success**: Positive outcomes
- **Danger**: Destructive actions (replaces "error")
- **Attention**: Warnings requiring notice
- **Sponsors**: Special contextual meaning
- **Open/Closed/Done**: Domain-specific states

**IBM Carbon:**

- **support-success**, **support-error**, **support-warning**, **support-info**
- "Support" prefix distinguishes from interactive colors

**Material Design 3 Note:**

- Only **error** included by default
- Success/warning/info must be added as custom tokens
- Philosophy: Success is normal flow, doesn't need dedicated tokens

### Surface Color Patterns

**GitHub Primer** (canvas and surface tokens):

- `bgColor-default`: Standard application background
- `bgColor-muted`: Secondary background for grouping
- `bgColor-subtle`: Even softer background for low-hierarchy

**Material Design 3** (tone-based surfaces):

- `surface`: Base background for entire application
- `surface-dim`: Lowest tonal elevation for recessed containers
- `surface-container-lowest/default/high/highest`: Progressive elevation hierarchy

**IBM Carbon** (4-layer architecture):

- `background`: Foundational canvas
- `layer-01`, `layer-02`, `layer-03`: Stacked surface levels
- Field tokens (+1 numbering): `field-01` on background, `field-02` on layer-01

**Ant Design:**

- `colorBgBase`: Base background
- `colorBgLayout`: Page/layout background
- `colorBgContainer`: Container background
- `colorBgElevated`: Elevated surface background

---

## Interactive State Patterns

### State Token Types

All systems provide state tokens, but with different levels of explicitness:

**Explicit State Tokens (Ant Design, GitHub Primer):**

```
colorPrimaryHover
colorPrimaryActive
button-primary-bgColor-hover
button-primary-bgColor-active
```

**State Layer Overlays (Material Design 3):**

- Semi-transparent overlays on top of base color
- Uses "on" color at fixed opacity
- Hover: 8%, Focus: 12%, Pressed: 12%, Disabled: 38%
- Only one state layer applied at a time

**Computed State Values (IBM Carbon):**

- Hover: "Half step" between adjacent color palette steps
- Active: Two full steps on color scale
- Focus: Dedicated focus tokens with outline
- Algorithmic calculation ensures consistency

### State Progression Patterns

**Typical Interactive State Progression:**

1. **Default**: Base token value
2. **Hover**: Slightly lighter/more saturated (indicates interactivity)
3. **Active/Pressed**: Noticeably darker/more intense (ongoing interaction)
4. **Focus**: Outline or ring styling (keyboard accessibility)
5. **Disabled**: Reduced opacity or desaturated (unavailability)

**Opacity Values for Disabled States:**

- Ant Design: 45% opacity
- Material Design 3: 38% opacity
- IBM Carbon: Reduced opacity with desaturated color
- GitHub Primer: Muted colors with reduced opacity

---

## Surface & Elevation Systems

### Approaches to Depth

**Shadow-Based Elevation (Material Design 3, Ant Design):**

- Defined elevation levels (0dp, 1dp, 3dp, 6dp, 8dp, 12dp)
- Two-layer shadow system: ambient + key light
- `boxShadow` and `boxShadowSecondary` tokens

**Tone-Based Surfaces (Material Design 3, GitHub Primer):**

- Uses luminance and tonal variation instead of just shadows
- Higher elevations use progressively more prominent tones
- Creates depth through color alone

**Layer Numbering System (IBM Carbon):**

- Explicit 4-layer architecture with numbered tokens
- `background` (base) → `layer-01` → `layer-02` → `layer-03`
- **Critical pattern**: Field on layer uses next set's number
    - Field on `background` → uses `field-01`
    - Field on `layer-01` → uses `field-02`

**Minimal Elevation (GitHub Primer):**

- Color intensity gradation for perceived depth
- Border weight variation (default vs emphasis)
- Opacity layering
- Strategic use of shadows (limited to overlays)

### Scale Inversion for Light/Dark Themes

**GitHub Primer Approach:**

- Light scale starts with white (step 0)
- Dark scale starts with black (step 13)
- Both themes share functional tokens without custom overrides
- Dramatically simplifies theming implementation

**Material Design 3 Approach:**

- Same token names work everywhere
- Tone variation automatically adjusts for light/dark
- `surface` is white in light mode, near-black in dark mode

---

## Component Token Patterns

### Button Patterns

**State Tokens (GitHub Primer, IBM Carbon):**

- Rest: `button-primary-bgColor-rest`
- Hover: `button-primary-bgColor-hover` (typically darker for depth)
- Active/Pressed: `button-primary-bgColor-active` (most emphasis)
- Disabled: Muted colors with reduced opacity
- Focus: Dedicated focus tokens

**Button Types (IBM Carbon, Material Design 3):**

- **Primary**: Background with `interactive-01`/`primary` color, white text
- **Secondary**: Border with interactive color, transparent/layer background
- **Tertiary**: Minimal styling with text color only, hover adds background

### Badge/Tag Patterns

**GitHub Primer:**

- Multiple label components (Counter, State, Circle Badge)
- Uses semantic role colors: `bg-[role]`, `fg-[role]`, `border-[role]`
- Muted variants for secondary status indicators

**Ant Design:**

- Status presets: `success`, `processing`, `error`, `default`, `warning`
- Component tokens: `badgeBg`, `badgeColor`, `badgeHeight`
- Tags support both preset statuses and custom colors

**IBM Carbon:**

- Component-specific tokens organized by variant
- Read-only, dismissible, operational, selectable variants
- High-contrast variants use core tokens for accessibility

**Material Design 3:**

- Container: Typically `error` color for count badges
- Content: `on-error` for text
- Alternative: Can use `secondary` or `tertiary` depending on context

### Card Patterns

**Surface Tokens:**

- **Material Design 3**: Elevated, Filled, Outlined variants
- **Ant Design**: `cardBg`, `cardShadow`, `cardBorderRadius`
- **IBM Carbon**: Use layer tokens based on placement depth
- **GitHub Primer**: Use surface tokens (`bgColor-default`, `bgColor-muted`)

**Elevation:**

- Cards typically use surface-container level or layer-01 equivalent
- Featured/selected cards use higher elevation
- Shadows optional but common for visual hierarchy

---

## Accessibility Patterns

### Contrast Requirements

**All systems enforce WCAG standards:**

- **Normal text** (<14pt): 4.5:1 contrast minimum
- **Large text** (≥14pt bold or ≥18pt): 3:1 contrast
- **UI components** (buttons, icons, borders): 3:1 contrast
- **Enhanced (AAA)**: 7:1 for normal text, 4.5:1 for large text

**Implementation Approaches:**

- **Material Design 3**: "On" tokens (e.g., `on-primary`) calculated to meet 4.5:1 on base color
- **GitHub Primer**: Automated contrast validation script checks all combinations
- **IBM Carbon**: Core tokens guarantee WCAG AA contrast; disabled states exempt
- **Ant Design**: Algorithmic color generation ensures contrast across palettes

### Focus State Management

**Universal Pattern - Never Remove Focus States:**

- **GitHub Primer**: `focus-outlineColor`, `focus-outlineWidth`, `focus-outlineOffset`
- **IBM Carbon**: Dedicated `focus` and `inverse-focus-ui` tokens
- **Material Design 3**: 12% opacity state layer + visible focus ring
- **Ant Design**: 3px outline width (adjusted from 4px)

**Applied universally across:**

- Buttons, inputs, links
- Interactive components
- Keyboard navigation elements

### State Indication Beyond Color

**Best Practice (All Systems): Never rely on color alone**

✅ Combine multiple cues:

- Color + icon + text label
- Color + pattern/texture
- Color + border/outline style

**Examples:**

- GitHub: "Available" = green check icon + green text
- Carbon: Status + role attribute (e.g., `role="alert"`)
- Material Design 3: Semantic HTML + ARIA attributes
- Ant Design: Status colors paired with icons

### Interactive Element Sizing

**Minimum Touch Target (Material Design 3, consistent across systems):**

- 48x48dp minimum touch target size
- 8dp minimum spacing between targets
- Adequate padding for icons within components
- Clear visual distinction for clickable elements

---

## Theme Management

### Multi-Theme Support Patterns

**Single Token Set for All Themes (Primer, Material Design 3):**

- Same token names work across light, dark, high-contrast
- Scale inversion handles light/dark differences
- CSS variables + `prefers-color-scheme` manage switching
- Eliminates duplicate token definitions

**Algorithm-Based Themes (Ant Design):**

- `defaultAlgorithm`: Light theme (standard)
- `darkAlgorithm`: Dark theme with automatic color inversion
- `compactAlgorithm`: Compact layout with reduced spacing
- Multiple algorithms can be chained together

**Multiple Theme Variants (IBM Carbon):**

- White, G10, G90, G100 themes
- 52 universal color variables per theme
- CSS Custom Properties for runtime theming
- Compatibility mode for gradual migration

**Dynamic Color (Material Design 3 - Material You):**

- Users can set brand colors based on device wallpaper
- System automatically generates all token values maintaining harmony
- Accessibility standards maintained across user-selected colors

### CSS Variable Export

**Modern Approach (Supported by all systems):**

- Ant Design v6+: `var(--ant-color-primary)`
- Material Design 3: `var(--md-sys-color-primary)`
- IBM Carbon v11: `var(--cds-text-01)`
- GitHub Primer: CSS variables in primer/css package

**Benefits:**

- Enables usage in vanilla CSS/HTML
- Simplifies cross-framework integration
- Runtime theme switching without JavaScript
- Better browser performance

---

## Token Purpose Categories & Common Misuses

### Three Fundamental Token Purposes

All analyzed design systems distinguish between three fundamental token purposes. Understanding these distinctions
is critical for correct implementation:

#### 1. Structure Tokens (Elevation & Hierarchy)

**Purpose:** Define visual hierarchy through z-index depth and layering. Used for static surface backgrounds that
create spatial organization.

**Common Names:**

- GitHub Primer: `bgColor-default`, `bgColor-muted`, `bgColor-inset`
- IBM Carbon: `background`, `layer-01`, `layer-02`, `layer-03`
- Material Design 3: `surface`, `surface-container`, `surface-container-high`
- Ant Design: `colorBgBase`, `colorBgLayout`, `colorBgContainer`

**Usage:** Page backgrounds, card surfaces, panel backgrounds, modal dialogs, dropdown surfaces

**Key Principle:** Structure tokens create foundational visual hierarchy. They change with elevation level but NOT with
user interaction states.

#### 2. State Tokens (Selection & Interaction)

**Purpose:** Indicate selected, active, or interactive element states.
These are user-driven (respond to clicks, hovers, selections).

**Common Names:**

- GitHub Primer: `bgColor-accent-emphasis` (selected items)
- IBM Carbon: `layer-selected-01/02/03`, `layer-hover-01/02/03`
- Material Design 3: State layer overlays (8% hover, 12% pressed)
- Ant Design: `colorPrimaryActive`, `colorPrimaryHover`

**Usage:** Selected navigation items, active tabs, hover states, selected table rows

**Key Principle:** State tokens respond to user interaction. Should NEVER be used for general surface backgrounds or elevation.

#### 3. Emphasis Tokens (Attention & Highlighting)

**Purpose:** Draw attention to important content through pronounced visual contrast. These are designer-driven
(intentionally highlight specific elements).

**Common Names:**

- GitHub Primer: `bg_emphasis` (high-contrast inverted backgrounds)
- IBM Carbon: `layer-accent-01/02/03`
- Material Design 3: Surface emphasis variants
- Ant Design: `colorBgElevated`, `colorBgSpotlight`

**Usage:** Alert banners (info, warning, error), call-to-action highlights, badge backgrounds, important status indicators

**Key Principle:** Emphasis tokens are for deliberate highlighting, NOT for creating elevation hierarchy.

### Common Misuse Patterns

#### ❌ Wrong: Using Emphasis Tokens for Elevation

**Example:**

```typescript
// INCORRECT
'surface-elevated': bg_emphasis  // Accent blue color
```

**Problem:** Emphasis tokens are designed for high-contrast inverted backgrounds (dark buttons on light pages),
NOT for elevated surfaces like modals or popovers.

**Correct approach:**

```typescript
// CORRECT
'surface-elevated': bgColor-default  // Same as background + shadow
```

#### ❌ Wrong: Using State Tokens for Structure

**Example:**

```typescript
// INCORRECT
card: layer_selected_01  // Selected state color
```

**Problem:** Selected state tokens indicate interactive selection, not general card surfaces.

**Correct approach:**

```typescript
// CORRECT
card: layer_01  // Structure token for card elevation
```

### Elevation Philosophy Comparison

Different systems use fundamentally different approaches to elevation:

#### Shadow-Based Elevation (GitHub Primer, GitLab Pajamas)

**Philosophy:** Use the same background color for all elevation levels, differentiate with shadows only.

**Implementation:**

- Base canvas: `bgColor-default`
- Cards: `bgColor-muted` (subtle differentiation)
- Elevated surfaces: `bgColor-default` + shadow
- No color change for elevation

**Benefits:**

- Simpler token structure
- Cleaner visual aesthetic
- Consistent backgrounds across elevations

#### Layer Progression (IBM Carbon)

**Philosophy:** Use explicit layer color progression to create elevation hierarchy.

**Implementation:**

- Background: `#161616` (gray-100)
- Layer-01: `#262626` (gray-90) - Cards, panels
- Layer-02: `#393939` (gray-80) - Modals, dialogs
- Layer-03: `#525252` (gray-70) - Dropdowns over modals

**Critical Pattern - Field Numbering:**

- Field on `background` → uses `field-01`
- Field on `layer-01` → uses `field-02`
- Field on `layer-02` → uses `field-03`

**Benefits:**

- Clear visual hierarchy through color alone
- Works without shadows
- Explicit elevation communication

#### Tone-Based Surfaces (Material Design 3)

**Philosophy:** Use luminance and tonal variation instead of shadows alone. Progressive tone prominence creates depth.

**Implementation:**

- Surface levels: dim, lowest, default, high, highest
- Higher elevations use progressively more prominent tones
- Light themes: higher = lighter
- Dark themes: higher = lighter (more saturated)

**Benefits:**

- Maintains accessibility in extreme brightness
- Reduces visual noise from shadows
- Better for small screens

#### Hybrid Approach (Ant Design)

**Philosophy:** No explicit layer system, relies on elevation shadows with algorithmic color derivation.

**Implementation:**

- Background colors from seed tokens
- Shadows define elevation
- Algorithmic variations for surfaces

### Border Token Hierarchy & Per-Layer Strategies

#### Per-Layer Border System (IBM Carbon)

**Pattern:** Different border colors for different layers to maintain visibility.

**Dark Mode Example:**

| Layer Context | Subtle Border | Strong Border |
|---------------|---------------|---------------|
| background/layer-01 | `#393939` | `#6f6f6f` (3.67:1 contrast) |
| layer-02 | `#525252` | `#8d8d8d` |
| layer-03 | `#6f6f6f` | `#a8a8a8` |

**Rationale:** Border must have sufficient contrast against both current layer and adjacent layers.

**Critical Issue Example:**

- If `border` (#393939) matches `surface-elevated` (#393939) = **1:1 invisible borders**
- Must use `border-strong` (#6f6f6f) for visibility

#### Border Hierarchy Pattern (All Systems)

**All systems provide graduated border options:**

- **Default/Subtle:** Aesthetic borders (~1.5-2.5:1 contrast)
- **Strong/Emphasis:** Accessible borders (≥3:1 contrast)
- **Muted:** Extremely subtle separation (<1.5:1 contrast)

### WCAG Compliance Philosophies

#### Non-Text Contrast Requirement

**WCAG 2.1 Level AA:** Graphical objects and UI components must have **3:1 minimum contrast** against adjacent colors.

**Applies to:** Borders, focus indicators, interactive controls

#### Design System Approaches to Border Contrast

**GitHub Primer Philosophy:**

- Uses intentionally subtle borders for aesthetics
- Relies on **compensating cues**: shadows, spacing, color grouping
- Provides `borderColor-emphasis` for accessibility-critical contexts
- Trade-off: Visual elegance vs strict WCAG compliance

**IBM Carbon Philosophy:**

- Provides explicit border hierarchy per elevation layer
- `border-strong` variants meet WCAG requirements
- Expects context-appropriate border selection
- Clear accessibility guidance in documentation

**GitLab Pajamas Philosophy:**

- Acknowledges "partial support" for non-text contrast
- Uses subtle borders aesthetically
- Provides stronger variants for critical elements
- Documents limitations transparently

**Material Design 3 Philosophy:**

- Tone-based surfaces reduce reliance on borders
- Provides contrast through luminance variation
- Borders supplementary, not primary differentiator

#### Compensating Cues Strategy

**When borders don't meet 3:1 contrast, systems compensate with:**

- Shadows for depth perception
- Spacing/padding for visual grouping
- Color/tone variation for differentiation
- Combined cues (shadow + spacing + subtle border)

**Rationale:** All major design systems accept subtle borders when compensated by other visual cues.
Perfect WCAG compliance requires trade-offs that upstream systems have evaluated and documented.

---

## Key Comparative Insights

### Token Count Philosophy

**Minimal Token Sets:**

- **GitHub Primer**: ~20 functional color tokens per mode
    - Philosophy: Constraints encourage consistency
    - Component tokens only for genuinely unique scenarios
    - Prevents token explosion at scale

**Moderate Token Sets:**

- **IBM Carbon**: 52 universal color variables per theme
    - Balances flexibility with maintainability
    - Comprehensive but not overwhelming

**Algorithmic Efficiency:**

- **Ant Design**: 141 system tokens vs 800+ hardcoded values
    - Massive reduction through algorithmic derivation
    - One seed token generates complete palette

**Comprehensive Coverage:**

- **Material Design 3**: Four-level hierarchy
    - More granular control for complex systems
    - Trade-off: Higher learning curve

### When to Use Component Tokens

**All Systems Agree:**

Use component tokens only when:

- Pattern is genuinely unique
- Cannot be composed from functional/system tokens
- Used across multiple components
- Default behavior is insufficient

**Avoid:**

- Modifying component tokens for one-off styling
- Redundant customization (both seed and component tokens)
- Creating tokens that duplicate functional tokens

### Layering and Nesting Limits

**Maximum Nesting Depths:**

- **IBM Carbon**: 3 levels (layer-01, layer-02, layer-03)
- **Material Design 3**: Effectively unlimited with tone-based surfaces
- **GitHub Primer**: No hard limit, relies on surface token hierarchy
- **Ant Design**: No explicit layer system, uses elevation shadows

**Best Practice:**

- Keep nesting shallow (3 levels maximum)
- Use tone/color variation for depth
- Reserve deep nesting for modals and overlays

---

## Application to Movie Discovery (CineXplorer Context)

### Recommended Token Architecture

Based on analyzed patterns, recommended structure:

**Foundation Layer:**

- Primary/secondary/tertiary accent colors
- Success/error/warning/info status colors
- Neutral grayscale (8-10 steps)
- Surface hierarchy (background, container, elevated)

**Functional Layer:**

- Text tokens: default, secondary, muted, on-accent
- Interactive tokens: default, hover, active, focus, disabled
- Border tokens: default, muted, emphasis
- Surface tokens: background, surface, surface-elevated

**Component Layer (minimal):**

- Button state tokens (if functional tokens insufficient)
- Card overlay tokens (for poster images)
- Rating display tokens (star colors, backgrounds)
- Badge/tag tokens (genre labels, status indicators)

### Semantic Color Roles for Movie Context

**Adapt from analyzed systems:**

- **Primary/Secondary/Tertiary**: Standard accent hierarchy
- **Success**: Available/streaming, high ratings, watched status
- **Error**: Not available, age restrictions, playback errors
- **Warning**: Leaving soon, content warnings, expiring access
- **Info**: Coming soon, new releases, recommendations
- **Custom roles** (extend as needed):
    - `watched`: User watch status
    - `premium`: Premium features (HD, ad-free)
    - `featured`: Highlighted content

### Interactive Patterns for Movie UI

**Movie Card Hover:**

- Use 8% overlay (Material Design 3 pattern)
- Or shift to `surface-elevated` (Primer pattern)
- Add subtle border emphasis

**Rating Interaction:**

- Star color: Warning/gold (Ant Design pattern)
- Hover preview: Show rating before selection
- Half-star support: For granular precision

**Genre Tags:**

- Default: `bgColor-muted` or `surface-container`
- Selected: `primary-container` with emphasis
- Interactive: Hover state with subtle shift

**Status Badges:**

- Map availability states to status tokens
- Always pair color with icon/text
- Maintain contrast requirements

---

## Sources

### GitHub Primer

- Main site: <https://primer.style>
- Color system: <https://primer.style/design/foundations/color>
- Primitives repo: <https://github.com/primer/primitives>
- Blog post: <https://github.blog/engineering/user-experience/unlocking-inclusive-design-how-primers-color-system-is-making-github-com-more-inclusive/>

### IBM Carbon Design System

- Main site: <https://carbondesignsystem.com/>
- v11 Color: <https://v11.carbondesignsystem.com/guidelines/color/implementation>
- GitHub: <https://github.com/carbon-design-system/carbon>
- Discussions: Color Token Layering Models, Context-Aware Tokens

### Material Design 3

- Design tokens: <https://m3.material.io/foundations/design-tokens/overview>
- Color roles: <https://m3.material.io/styles/color/roles>
- Elevation: <https://m3.material.io/styles/elevation/applying-elevation>
- States: <https://m3.material.io/foundations/interaction/states/applying-states>
- Tone-based surfaces: <https://m3.material.io/blog/tone-based-surface-color-m3/>

### Ant Design

- Customize theme: <https://ant.design/docs/react/customize-theme/>
- Theme editor: <https://ant.design/theme-editor/>
- Token previewer: <https://ant-design.github.io/antd-token-previewer/>
- GitHub: <https://github.com/ant-design/ant-design>

---

**Document Version**: 1.1
**Last Updated**: 2025-11-08
**Consolidated From**:

- 4 external research documents (github-primer, ibm-carbon, material-design-3, ant-design)
- Token Guide & WCAG patterns from semantic-corrections research notes

**Maintenance Note**: This is a reference document. Update when new patterns emerge from new research.
