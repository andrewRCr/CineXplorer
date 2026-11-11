# Color Token System

**Version:** 1.0 | **Updated:** 2025-11-17 | **Status:** Active

## Purpose

Reference for CineXplorer's color token system: naming conventions, accessibility standards, and quick lookup.
Organized for quick lookups when implementing components or validating token usage.

**Use this when:**

- Understanding token naming conventions (`on-*` prefix, semantic hierarchy)
- Validating WCAG contrast requirements
- Looking up token availability across themes
- Understanding brand vs UI color distinction
- Quick reference for "which token should I use?"

**For component building patterns:**

- **Component styling**: See [Component Styling Strategy](./strategy-component-styling.md)
- **Layout dimensions**: See [Layout Token Strategy](./strategy-layout-tokens.md)
- **Architectural decisions**: See ADRs 005-016 in `.arc/reference/adr/`

**Not covered here:**

- How to build specific components (see Component Styling Strategy)
- Recipe implementation details (see recipe files in `frontend/src/theme/recipes/`)
- Theme implementation (see ADR-005: Unified Theme Adapter Layer)
- Adding new themes (see theme adapter files in `frontend/src/theme/color/adapters/`)

---

## Table of Contents

1. [Token Naming Conventions](#token-naming-conventions)
2. [UnifiedTheme Interface Reference](#unifiedtheme-interface-reference)
3. [Text Color Semantics](#text-color-semantics)
4. [Brand Identity](#brand-identity)
5. [Accessibility Standards](#accessibility-standards)
6. [Developer Quick Reference](#developer-quick-reference)
7. [Related Documentation](#related-documentation)

---

## Token Naming Conventions

CineXplorer uses Material Design 3's `on-*` naming convention for foreground tokens paired with colored backgrounds
(adopted in ADR-011).

### The `on-*` Prefix Pattern

**Core principle:** `on-{color}` indicates "text/content that goes ON a colored background"

```tsx
// ✅ Correct: on-* naming
<Badge bg="success" color="on-success">Active</Badge>
<Button bg="primary" color="on-primary">Save</Button>
<Box bg="destructive" color="on-destructive">Error</Box>

// ❌ Removed: -foreground suffix; use on-success instead
<Badge bg="success" color="success-foreground">Active</Badge>
```

**All foreground tokens follow this pattern:**

- `on-primary` - Text on primary backgrounds
- `on-secondary` - Text on secondary backgrounds
- `on-tertiary` - Text on tertiary backgrounds
- `on-success` - Text on success backgrounds
- `on-warning` - Text on warning backgrounds
- `on-destructive` - Text on destructive/error backgrounds
- `on-info` - Text on info backgrounds
- `on-badge` - Text on neutral badge backgrounds
- `on-muted` - Deemphasized text on standard backgrounds
- `on-popover` - Text on popover/tooltip backgrounds
- `on-brand` / `on-brandSecondary` / `on-brandTertiary` - Text on brand backgrounds

### Removed Aliases

The old names below were removed. They define no runtime tokens; use the canonical role in the second column:

| Removed (Old)          | Canonical (Current)                        | Notes                                                 |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `accent`               | `tertiary`                                 | Hierarchy naming preferred                            |
| `accent-foreground`    | `on-tertiary`                              | on-* prefix pattern                                   |
| `primary-foreground`   | `on-primary`                               | on-* prefix pattern                                   |
| `success-foreground`   | `on-success`                               | on-* prefix pattern                                   |
| `text.secondary`       | `on-muted`                                 | Semantic clarity                                      |
| `border.subtle`        | `border-strong-01` or `border-subtle-01`   | Layer-aware (strong for forms, subtle for dividers)   |
| `background.subItem`   | `layer-hover-01`                           | Explicit interaction state naming                     |
| `tertiary.primary`     | `tertiary` or `ring`                       | Simplified naming                                     |

**Guidance:** Use the canonical roles. Removed aliases do not resolve to theme colors.

### Semantic Hierarchy

Tokens are organized by semantic purpose, not visual appearance:

**Structural tokens:**

- `background` / `foreground` - Base page layer
- `layer-01` / `layer-02` / `layer-03` - Elevation hierarchy
- `popover` / `on-popover` - Overlay content

**Action/emphasis tokens:**

- `primary` / `on-primary` - Highest emphasis actions
- `secondary` / `on-secondary` - Secondary emphasis
- `tertiary` / `on-tertiary` - Interactive text, links, focus

**Status tokens:**

- `success` / `on-success` - Positive feedback
- `warning` / `on-warning` - Caution states
- `destructive` / `on-destructive` - Errors, critical alerts
- `info` / `on-info` - Informational messages

**Helper tokens:**

- `muted` / `on-muted` - Deemphasized content
- `badge` / `on-badge` - Neutral categorization
- `button-*` tokens - Button-specific semantic patterns

**Rationale:** Semantic naming allows visual changes without breaking component contracts. "Primary" can change color
across themes while maintaining its semantic meaning as "highest emphasis action."

---

## UnifiedTheme Interface Reference

**Source of truth:** `frontend/src/theme/color/types.ts`

The `UnifiedTheme` interface defines ~67 canonical tokens that all theme adapters must implement. This interface serves
as the contract between themes and components.

**Interface location:** `frontend/src/theme/color/types.ts`

**Key sections:**

1. **Core Structure** (~7 tokens)
    - `background`, `foreground`
    - `layer-01`, `layer-02`, `layer-03`
    - `popover`, `on-popover`

2. **Border Hierarchy** (~5 tokens)
    - `border-subtle-00`, `border-subtle-02`
    - `border-strong-01`, `border-strong-02`, `border-strong-03`

3. **Shadows** (~3 tokens)
    - `shadow-sm`, `shadow-md`, `shadow-lg`

4. **Layer Interactions** (~6 tokens)
    - `layer-hover-01`, `layer-hover-02`
    - `layer-selected-01`, `layer-selected-02`
    - `layer-active-01`, `layer-active-02`

5. **Semantic Colors** (~8 tokens)
    - `primary`, `on-primary`
    - `secondary`, `on-secondary`
    - `tertiary`, `on-tertiary`
    - `muted`, `on-muted`

6. **Button Patterns** (~8 tokens)
    - `button-outline`, `on-button-outline`
    - `button-outline-primary`, `on-button-outline-primary`
    - `button-subtle`, `on-button-subtle`
    - `button-subtle-selected`, `on-button-subtle-selected`

7. **Status Colors** (~8 tokens)
    - `success`, `on-success`
    - `warning`, `on-warning`
    - `destructive`, `on-destructive`
    - `info`, `on-info`

8. **Brand Colors** (~6 optional tokens)
    - `brand?`, `on-brand?`
    - `brandSecondary?`, `on-brandSecondary?`
    - `brandTertiary?`, `on-brandTertiary?`

9. **Color Interactions** (~6 tokens)
    - `primary-hover`, `primary-active`
    - `secondary-hover`, `secondary-active`
    - `tertiary-hover`, `tertiary-active`

10. **Movie-Specific** (~6 tokens)
    - `rating`, `on-rating`
    - `badge`, `on-badge`
    - `drag-active`, `drop-zone`
    - `imdb-gold`

11. **UI Elements** (~1 token)
    - `ring`

12. **Removed Aliases** (no runtime tokens)
    - Use `tertiary` and the canonical `on-*` roles instead

**Total:** ~67 tokens (including optional brand tokens)

**Adapter implementation:**

The five factories (`createMarqueeAdapter`, `createGithubAdapter`, `createCarbonAdapter`,
`createPajamasAdapter`, `createMaterialAdapter`) map their palettes to CineXplorer's semantic structure.
See `frontend/src/theme/color/adapters/*.ts` for
examples.

**Adding new tokens:**

1. Add to `UnifiedTheme` interface in `types.ts`
2. Implement in all theme adapters
3. Add to Chakra semantic tokens in `createThemeSystem()`
4. Document usage in Component Styling Strategy
5. Update this reference

---

## Text Color Semantics

### Muted/Deemphasized Text

**For secondary information:**

```tsx
<VStack align="start">
  <Text color="foreground">Primary heading</Text>
  <Text color="on-muted" fontSize="sm">
    Last updated 2 hours ago
  </Text>
</VStack>
```

**Token:**

- `on-muted` - Secondary text, labels, captions, timestamps

**Distinction:**

- `foreground` - Primary text on backgrounds
- `on-muted` - Deemphasized, secondary text (not disabled - use opacity for disabled)

### Tertiary vs Accent Naming

**Canonical:** Use `tertiary` (Material Design 3-aligned). The `accent` alias was removed.

```tsx
// ✅ Preferred (canonical naming)
<Link color="tertiary">Learn more</Link>

// ❌ Removed alias; this does not resolve to a theme color
<Link color="accent">Learn more</Link>
```

**Rationale:** "Tertiary" indicates position in hierarchy (Primary > Secondary > Tertiary), while "accent" is ambiguous.
Industry trend is toward Material's naming.

---

## Brand Identity

Brand tokens represent logo/brand identity colors, separate from UI functional colors (see ADR-010).

### When to Use Brand Tokens

**Use brand tokens for:**

- Logo sections (tanuki logo, brand marks)
- Special brand moments (hero sections, marketing pages)
- Company-specific UI elements

**Do NOT use brand tokens for:**

- General component styling (use `primary`/`secondary`/`tertiary`)
- Action buttons (use `primary`)
- Interactive text (use `tertiary`)

### Brand Token System

**Available tokens (all optional):**

```tsx
// Primary brand color (logo, brand identity)
<Box bg="brand" color="on-brand">
  GitLab Logo Section
</Box>

// Secondary brand color (additional brand accents)
<Box bg="brandSecondary" color="on-brandSecondary">
  Secondary Brand Element
</Box>

// Tertiary brand color (for complex multi-color identities like GitLab tanuki)
<Box bg="brandTertiary" color="on-brandTertiary">
  Tertiary Brand Element
</Box>
```

**Tokens:**

- `brand` / `on-brand` - Primary brand identity color
- `brandSecondary` / `on-brandSecondary` - Secondary brand color
- `brandTertiary` / `on-brandTertiary` - Tertiary brand color (rare)

### Brand vs Primary Distinction

**Key principle:** Brand = identity, Primary = UI actions (may be same color)

**Example: IBM Carbon**

- `brand`: Blue (#0f62fe) - IBM identity color
- `primary`: Blue (#0f62fe) - Same color, but semantic meaning differs
- `tertiary`: Blue (#0f62fe) - Same color, used for links

All three tokens have the same visual appearance but different semantic purposes.

**Example: GitLab Pajamas**

- `brand`: Purple (#554488) - GitLab identity
- `brandSecondary`: Orange (#e24329) - Tanuki logo accent
- `primary`: Blue (#1f75cb) - UI action buttons (NOT brand color)
- `tertiary`: Purple (#7759c2) - Links (happens to be brand-aligned but semantically different)

**Example: GitHub Primer**

- `brand`: undefined - No brand color (black/white logo)
- `primary`: Green (#1f883d) - UI actions
- `tertiary`: Blue (#0969da) - Links

### Theme-Specific Availability

| Theme                   | brand             | brandSecondary   | brandTertiary     |
| ----------------------- | ----------------- | ---------------- | ----------------- |
| **Marquee**             | Brass (`primary`) | undefined        | undefined         |
| **GitHub Primer**       | undefined         | undefined        | undefined         |
| **IBM Carbon**          | Blue              | undefined        | undefined         |
| **GitLab Pajamas**      | Purple            | Orange           | Orange (darker)   |
| **Material Design 3**   | Purple            | undefined        | undefined         |

**Note:** Brand tokens are optional - not all themes have brand identity colors separate from UI colors.

---

## Accessibility Standards

All semantic tokens must meet WCAG accessibility guidelines for contrast and visibility.

### Contrast Requirements

**WCAG AA (Required for CineXplorer):**

- **Normal text:** 4.5:1 contrast ratio minimum
    - Body text, labels, descriptions
    - Most common use case

- **Large text & UI components:** 3:1 contrast ratio minimum
    - Text 18pt+ (or 14pt+ bold)
    - Borders, focus indicators, interactive element boundaries
    - Icons and graphical elements

**WCAG AAA (Aspirational):**

- **Normal text:** 7:1 contrast ratio
- **Large text:** 4.5:1 contrast ratio
- Provides better readability for users with low vision

### Testing Contrast

**Before using token combinations:**

1. Test foreground/background pairs with WebAIM Contrast Checker
2. Verify both light and dark mode variants
3. Document any tokens requiring adjustment
4. Prioritize text tokens (foreground, on-muted, `on-*` pairs)

**Common failures:**

- `on-muted` often fails in light mode (insufficient contrast)
- `info` backgrounds with white text in light mode
- `warning` with dark text in dark mode

### Border Contrast Requirements (WCAG SC 1.4.11)

**All border colors must meet minimum contrast:**

- **Interactive element borders:** 3:1 minimum contrast ratio with adjacent backgrounds
- **Recommended:** 4.5:1 for better visibility across all conditions
- **Applies to:** Input fields, buttons, checkboxes, radio buttons, cards with borders

**Testing Example:**

```typescript
// Light mode - checking border on white background
background: '#FFFFFF' (luminance = 1.0)
border: '#D4D4D4' (luminance ≈ 0.75)
contrast = (1.0 + 0.05) / (0.75 + 0.05) = 1.31:1 ❌ FAIL

// Need darker border for compliance
border: '#767676' (luminance ≈ 0.27)
contrast = (1.0 + 0.05) / (0.27 + 0.05) = 3.28:1 ✅ PASS
```

**Tool:** Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) for validation

**Important:** Border width does NOT compensate for poor contrast. A 1px border with 4.5:1 contrast is more
accessible than a 2px border with 2:1 contrast. WCAG has no trade-off mechanism - always prioritize contrast
ratio over thickness.

**Non-interactive boundaries (cards, dividers):**

- 3:1 contrast recommended but not strictly required
- Can be more subtle since not interactive
- Use shadow as alternative if border doesn't meet contrast

### Color Alone Is Not Enough

**Never rely on color as the only means of conveying information.** Always pair color with icons, text labels, patterns,
or layout cues.

**Bad:**

```tsx
❌ <Text color="on-destructive">Error occurred</Text>
```

**Good:**

```tsx
✅ <HStack>
     <Icon name="warning" color="on-destructive" />
     <Text color="on-destructive">Error occurred</Text>
   </HStack>
```

### Focus Indicators

**Required for keyboard navigation:**

- Always visible (never `outline: none`)
- High contrast (use `ring` token)
- Sufficient size (2px minimum, 2px offset)

All interactive components use keyboard-only focus rings via recipes or wrapper components.

**WCAG 2.4.13:** Focus indicators must have ≥3:1 contrast change from unfocused state.

**See also:** [Component Styling Strategy](./strategy-component-styling.md) for focus implementation patterns

### Interactive Element Sizing

**Minimum touch target:** 48×48 pixels (WCAG guideline)

```tsx
// ❌ Too small (24×24px)
<Button size="xs">Click</Button>

// ✅ Minimum size (48×48px)
<Button size="sm">Click</Button>
```

---

## Developer Quick Reference

Fast lookup cheat sheet for common token choices.

### By Use Case

| What are you building?   | Token(s)                                                 | Example                                                                  |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Page background          | `background` / `foreground`                              | `<Box bg="background">`                                                  |
| Card/panel               | `layer-01` + `foreground`                                | `<Card bg="layer-01">`                                                   |
| Modal                    | `layer-02` + `foreground`                                | `<Modal.Content bg="layer-02">`                                          |
| Dropdown over modal      | `layer-03` + `foreground`                                | `<Menu.Content bg="layer-03">`                                           |
| Primary button           | `primary` / `on-primary`                                 | `<Button variant="solid">`                                               |
| Neutral outline button   | `button-outline` / `on-button-outline`                   | `<Button variant="outline">`                                             |
| Branded outline button   | `button-outline-primary` / `on-button-outline-primary`   | `<Button borderColor="button-outline-primary">`                          |
| Subtle button            | `button-subtle` / `on-button-subtle`                     | `<Button variant="subtle">`                                              |
| Ghost button             | `tertiary`                                               | `<Button variant="ghost">`                                               |
| Link/interactive text    | `tertiary` / `tertiary-hover`                            | `<Link color="tertiary" _hover={{ color: "tertiary-hover" }}>`           |
| Success alert            | `success` / `on-success`                                 | `<Alert.Root status="success">`                                          |
| Warning alert            | `warning` / `on-warning`                                 | `<Alert.Root status="warning">`                                          |
| Error alert              | `destructive` / `on-destructive`                         | `<Alert.Root status="error">`                                            |
| Info alert               | `info` / `on-info`                                       | `<Alert.Root status="info">`                                             |
| TMDB score (high)        | `success` dot, `foreground` number                       | `<MovieUserScore score={8.2} voteCount={10} />` (displayed ≥7.5)         |
| TMDB score (medium)      | `foreground` dot and number                              | `<MovieUserScore score={6.5} voteCount={10} />` (displayed 5.0–7.4)      |
| TMDB score (low)         | `destructive` dot, `foreground` number                   | `<MovieUserScore score={4.1} voteCount={10} />` (displayed <5.0)         |
| TMDB score (<10 votes)   | `badge` / `on-badge`                                     | `<Badge variant="neutral">—</Badge>` (fewer than 10 votes)               |
| User rating star icons   | `imdb-gold`                                              | `<Text color="imdb-gold">★★★★☆</Text>`; numeric ratings use the dot chip |
| Genre tag                | `badge` / `on-badge`                                     | `<Badge variant="neutral">Action</Badge>`                                |
| Secondary text           | `on-muted`                                               | `<Text color="on-muted">`                                                |
| Border                   | `border-strong-01`                                       | `<Card borderColor="border-strong-01">`                                  |
| Input field (layer-01)   | `border-strong-01`                                       | `<Input borderColor="border-strong-01">`                                 |
| Input field (layer-02)   | `border-strong-02`                                       | `<Input borderColor="border-strong-02">`                                 |
| Focus ring               | `ring`                                                   | `outlineColor="ring"`                                                    |

### Token Count by Category

**Total canonical tokens:** ~67 (across UnifiedTheme interface)

**Breakdown:**

- **Core structure:** 7 (background, foreground, layer-01/02/03, popover pair)
- **Border hierarchy:** 5 (border-subtle-00/02, border-strong-01/02/03)
- **Shadows:** 3 (shadow-sm/md/lg)
- **Layer interactions:** 6 (layer-hover/selected/active × 2 layers)
- **Semantic colors:** 8 (primary, secondary, tertiary, muted with `on-*` pairs)
- **Button patterns:** 8 (outline/outline-primary/subtle/subtle-selected with `on-*` pairs)
- **Status colors:** 8 (success, warning, destructive, info with `on-*` pairs)
- **Brand colors:** 6 optional (brand/brandSecondary/brandTertiary with `on-*` pairs)
- **Color interactions:** 6 (primary/secondary/tertiary hover/active)
- **Movie-specific:** 6 (rating, badge, drag-active, drop-zone pairs)
- **UI elements:** 2 (border, ring)
- **Removed aliases:** No runtime tokens, including the removed legacy `input` name

**Note:** Recipes centralize many tokens - consult recipe files for implementation details.

### Anti-Patterns to Avoid

**Never hardcode colors:**

```tsx
❌ color="red.600"
❌ bg="#4299e1"
❌ borderColor="blue.200"
❌ style={{ color: "#FF0000" }}
```

**Never use Chakra raw color tokens:**

```tsx
❌ <Text color="red.600">Error</Text>
❌ <Box bg="gray.100">Container</Box>
❌ <Badge colorScheme="blue">Info</Badge>
```

**Never bypass semantic system silently:**

```tsx
❌ // No comment explaining why
    <Box bg="#F5C518">Rating</Box>
```

**Always use semantic tokens:**

```tsx
✅ <Text color="on-destructive">Error</Text>
✅ <Box bg="muted">Container</Box>
✅ <Badge variant="info">New</Badge>
✅ <MovieUserScore score={8.2} voteCount={10} /> {/* Outlined score chip with success dot */}
✅ <Text color="imdb-gold">★★★★☆</Text> {/* Star icons; numeric ratings use the chip */}
```

### Quick Decision Flowchart

```
1. Status/alert? → success/warning/destructive/info + on-*
2. Button? → Check Component Styling Strategy for variant selection
3. Surface? → background/layer-01/layer-02/layer-03
4. Interactive text? → tertiary + tertiary-hover
5. TMDB score? → 10+ votes: Outlined chip with success/foreground/destructive dot by displayed value; fewer: neutral
6. User rating? → Numeric dot chip (8/5 thresholds); star icons alone use imdb-gold
7. Neutral badge? → badge + on-badge
8. Border? → border-strong-01 (or see Border Strategy)
9. Focus? → ring
```

---

## Related Documentation

**For component building patterns:**

- [Component Styling Strategy](./strategy-component-styling.md) - Building surfaces, buttons, forms, interactive elements
- [Layout Token Strategy](./strategy-layout-tokens.md) - Structural dimensions, z-index

**For architectural context:**

- ADR-005: Unified Theme Adapter Layer (adapter architecture)
- ADR-006: Adopt Carbon Layer Elevation Standard (layer system)
- ADR-007: Use Chakra Theme Tokens for Layout Constants (layout tokens)
- ADR-008: Adopt Carbon Light Alternating Layers (light mode pattern)
- ADR-009: Use Material Design Opacity Overlays (interaction states)
- ADR-010: Establish Core Semantic Color Token Architecture (primary/secondary/tertiary hierarchy)
- ADR-011: Standardize on "on-color" Foreground Naming (on-* prefix)
- ADR-012: Separate Button Pattern Semantics (button helper tokens)
- ADR-015: Use Border-Only Focus Indicators for Text Inputs
- ADR-016: Improve Interaction State Contrast (12% hover / 16% selected-active opacity values)

**For implementation:**

- `frontend/src/theme/color/types.ts` - UnifiedTheme interface (source of truth)
- `frontend/src/theme/color/adapters/*.ts` - Theme adapter implementations
- `frontend/src/theme/recipes/*.ts` - Recipe implementations (button, alert, badge, select, checkbox, radio, switch)
- `/theme-debug` page - Visual validation of all themes and tokens

---

**Version History:**

- v1.0 (2025-11-17): Initial split from strategy-semantic-tokens.md v2.2. Focused on color token reference, naming
  conventions, accessibility standards, and developer quick reference. Component building patterns moved to
  strategy-component-styling.md. Added Token Naming Conventions section (synthesized from ADR-011). Added
  UnifiedTheme Interface Reference section pointing to source of truth.
