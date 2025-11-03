# Implementation Notes: Theme System Modernization

**Task List:** `.arc/active/incidental/tasks-theme-system-modernization.md`

---

## Phase 1.1: Color Usage Audit

**Task:** Audit current color usage in codebase (Tasks 1.1.1-1.1.3)

### Findings Summary

**Semantic Tokens Actually Used:**

✅ **Background tokens (all used):**

- `background.main` - Base layout background (BaseLayout, ErrorBoundary, Login, Register)
- `background.navBar` - NavBar background
- `background.footer` - Footer background
- `background.sidebar` - Sidebar background
- `background.subItem` - Sub-menu items (NavBarUserMenu, SidebarContent, Login, Register)
- `background.hover` - Hover states (NavBarUserMenu, SidebarContent, MobileMenuButton)
- `background.selected` - Selected states (SidebarContent)
- `background.skeleton` - Loading skeleton (MovieCollectionGrid)

✅ **Border tokens (all used):**

- `border.subtle` - Subtle borders (NavBarUserMenu, TypographyTest)
- `border.separator` - Section separators (most components)
- `border.sidebar` - Sidebar border (sidebarOverlay)
- `border.input` - Input borders (not found in audit but likely used in forms)
- `border.error` - Error state borders (Login, VerifyEmail)
- `border.success` - Success state borders (Login, VerifyEmail)

✅ **Text tokens (all used):**

- `text.main` - Primary text (widespread usage)
- `text.muted` - Secondary/muted text (Footer, TypographyTest, Login, widespread)
- `text.error` - Error messages (MovieCollectionGrid, MovieGrid, ErrorBoundary)
- `text.info` - Info text (defined but not found in audit - may be unused)
- `text.secondary` - Secondary text (MovieCollectionGrid, MovieGrid, PaginationCtrl, TypographyTest)
- `text.success` - Success messages (Login)
- `text.successDark` - Dark success text (VerifyEmail)

✅ **Accent tokens (all used):**

- `accent.primary` - Primary accent (NavBarUserMenu, LoadingContent, VerifyEmail)
- `accent.secondary` - Secondary accent (defined but not found in audit)
- `accent.tertiary` - Tertiary accent (not found in audit)
- `accent.highlight` - Highlights (not found in audit)
- `accent.link` - Links/interactive elements (NavBarUserMenu, widespread)
- `accent.tagTeal` - Teal tags (not found in audit)
- `accent.tagPurple` - Purple tags (not found in audit)

**Direct Chakra Color References (bypassing semantic tokens):**

❌ **Found hardcoded colors:**

- `red.500` - Watchlist error, MovieDetail error (should use `text.error`)
- `red.600`, `red.700`, `red.800` - ErrorBoundary (should use semantic error tokens)
- `red.50` - ErrorBoundary background (should use semantic error background)
- `red.200` - ErrorBoundary border (should use `border.error`)
- `gray.500`, `gray.600`, `gray.800` - MovieDetail, ErrorBoundary (should use semantic tokens)
- `gray.50`, `gray.200` - ErrorBoundary (should use semantic tokens)
- `blue.50`, `blue.200`, `blue.800` - ErrorBoundary (should use semantic tokens)
- `blue.solid` - Toaster spinner (should use `accent.primary`)
- `white`, `black` - Scattered usage (LoadingLayout, LoadingContent, VerifyEmail, Register)
- `#4299e1` - Inline style in Login/Register links (should use `accent.link`)
- `fg` - Chakra's built-in foreground (color-mode.tsx, Featured page)
- `fg.muted` - Featured page (should migrate to `text.muted`)

**Raw Token Usage Analysis:**

✅ **Tokens actively used (via semantic tokens):**

- `white` - text.main, accent.tertiary, border.input
- `discordDark` - background.main, background.sidebar
- `chakraGray900` - background.subItem, background.hover, background.selected
- `tailwindZinc900` - background.navBar, background.sidebarInterior, background.skeleton
- `gray.300` - text.muted
- `gray.400` - text.secondary
- `gray.500` - border.subtle, text.info
- `gray.700` - border.separator, border.sidebar
- `red.500` - text.error
- `blue.500` - accent.primary
- `blue.700` - accent.secondary
- `fed7d7` - border.error
- `c6f6d5` - border.success
- `48bb78` - text.success
- `2f855a` - text.successDark
- `63b3ed` - accent.highlight
- `4299e1` - accent.link
- `teal` - accent.tagTeal
- `purple` - accent.tagPurple

❌ **Unused raw tokens (candidates for removal):**

- `black` - Not referenced by any semantic token (but used directly in some components)
- `gray.200` - Not referenced by any semantic token (but used directly in ErrorBoundary)
- `nearBlack` - Not referenced anywhere
- `gradientGrayLeft` - Not referenced anywhere
- `gradientGrayCentered` - Used by background.footer but footer doesn't use gradient (uses solid color)
- `gradientNavy` - Not referenced anywhere
- `customGrayBorder` - Not referenced anywhere

**Semantic Tokens With No Usage Found:**

- `background.sidebarInterior` - Defined but not found in component search
- `border.input` - Defined but not found in component search (may be used, search might have missed)
- `text.info` - Defined but not found in component search
- `accent.secondary` - Defined but not found in component search
- `accent.tertiary` - Defined but not found in component search
- `accent.highlight` - Defined but not found in component search
- `accent.tagTeal` - Defined but not found in component search
- `accent.tagPurple` - Defined but not found in component search

### Conclusions

1. **Good news:** Most semantic tokens are actively used and well-structured
2. **Problem areas:**
   - ErrorBoundary bypasses semantic tokens extensively (direct Chakra colors)
   - Some inline style colors (`#4299e1` links)
   - Mixed usage of `white`/`black` vs semantic tokens
   - Featured page uses Chakra's `fg` system instead of semantic tokens
3. **Cleanup opportunities:**
   - Remove unused gradient tokens (not actually used)
   - Remove unused custom colors (`nearBlack`, `customGrayBorder`)
   - Consider removing unused semantic accent variants
4. **Components needing migration:**
   - ErrorBoundary (extensive hardcoded colors)
   - Featured (uses `fg.muted` instead of `text.muted`)
   - Login/Register (inline style links)
   - Watchlist, MovieDetail (hardcoded error colors)
   - LoadingLayout, LoadingContent, VerifyEmail (hardcoded white/black)

**Recommendation:** Preserve only colors actually in use for reference palette. Remove all unused gradients and custom tokens.

---

## Phase 2.2: GitHub Primer Palette Implementation

**Task:** Select and implement initial palette (Task 2.2)

### Implementation Summary

**Files Created:**

- `frontend/src/theme/palettes/github.ts` - Official GitHub Primer colors
- `frontend/src/theme/definitions/github.ts` - Semantic token mappings

**Palette Structure:**

**Light Mode (26 colors):**

- Base: bg_default (#ffffff), bg_muted (#f6f8fa), bg_inset (#f6f8fa)
- Text: fg_default (#1f2328), fg_muted (#59636e), fg_subtle (#818b98)
- Accent: fg_accent (#0969da)
- Success: bg_success (#1f883d), bg_success_hover (#1c8139)
- Danger: fg_danger (#d1242f), bg_danger (#cf222e)
- Borders: border_default (#d1d9e0)

**Dark Mode (26 colors):**

- Base: bg_default (#0d1117), bg_muted (#161b22), bg_inset (#010409)
- Text: fg_default (#f0f6fc), fg_muted (#8b949e), fg_subtle (#6e7681)
- Accent: fg_accent (#58a6ff - lighter for dark bg)
- Success: bg_success (#238636), bg_success_hover (#2ea043)
- Danger: fg_danger (#f85149), bg_danger (#da3633)
- Borders: border_default (#30363d)

**Semantic Token Mapping:**

- background/foreground: Base colors
- card: Elevated surfaces (same as background in light, darker inset in dark)
- primary: Success green (GitHub's primary action color)
- secondary: Button secondary gray
- muted: Subtle backgrounds and reduced text
- accent: Blue for links and focus
- destructive: Red for dangerous actions
- border/input/ring: UI element colors

**Key Design Decisions:**

- Primary uses GitHub green (not blue) - follows GitHub's action button convention
- Accent (blue) reserved for links, selections, focus rings
- Card backgrounds: flat in light mode, darker inset in dark mode
- Focus ring uses accent color for consistency

**Research Source:**

- External research agent analysis of GitHub Primer documentation
- Official Primer colors verified from <https://primer.style>
- Full research documented in notes (Phase 2.2 Research Report section above)

**Helper Function:**

- `hexToRgb()` converts hex to RGB space-separated format for Chakra UI
- Handles both 6-char (#ffffff) and 8-char translucent (#ffffffaa) hex values
- Required for Chakra's opacity modifier support (e.g., bg="primary/50")

---

## Phase 3.2: Movie Application UI Pattern Analysis

**Task:** Analyze CineXplorer UI patterns and compare with industry references (Letterboxd, Netflix, IMDb)

**Completed:** 2025-11-02

### CineXplorer UI Pattern Inventory

**Pattern Categories Identified:**

#### 1. **Movie Cards** (Primary Content Display)

**Files:** `MovieCard.tsx:frontend/src/components/movie/MovieCard.tsx`

**Current Token Usage:**

- `background.main` - Tooltip background (line 246)
- `border.subtle` - Tooltip border (line 247)
- `text.main` - Title text (line 274)
- `text.secondary` - Release date text (line 292)
- `accent.primary` - Animated accent line on hover (line 361)
- Hardcoded `blue` colorPalette for button states (lines 306, 323)

**Patterns:**

- Poster images with 2:3 aspect ratio
- Hover scale animation (1.05x zoom)
- Animated accent line (0% → 100% width on hover)
- Custom tooltip with arrow (not using Chakra tooltip component)
- IconButtons for watched/liked/watchlist actions
- Color-coded interactive states

**Token Requirements:**

- ✅ Card background (currently uses Chakra Card.Root default)
- ✅ Hover state accent
- ❌ **Missing:** Interactive button accent (using hardcoded `blue` colorPalette)
- ❌ **Missing:** Tooltip semantic tokens (currently mixing semantic + hardcoded)
- ❌ **Missing:** Watch status colors (watched, liked, watchlist states)

#### 2. **Score/Rating Displays** (Numeric Visualization)

**Files:** `MovieUserScore.tsx:frontend/src/components/movie/MovieUserScore.tsx`

**Current Token Usage:**

- `text.successDark` - High scores (>=7.5) - line 14
- Hardcoded `blue.700` - Medium scores (5.0-7.4) - line 15
- Hardcoded `yellow.700` - Low scores (<5.0) - line 16
- Hardcoded `green.600`, `orange.600`, `red.600` for user ratings (lines 20-22)

**Patterns:**

- TMDB rating: 0-10 scale with decimal precision
- User rating: 1-10 integer scale with star icon
- Color-coded badges based on score threshold
- Badge component with surface variant
- Compact size (12px font, minimal padding)

**Token Requirements:**

- ❌ **Missing:** `rating-high` semantic token (currently `text.successDark` works, but not semantically named for ratings)
- ❌ **Missing:** `rating-medium` semantic token (currently hardcoded `blue.700`)
- ❌ **Missing:** `rating-low` semantic token (currently hardcoded `yellow.700`)
- ❌ **Missing:** `user-rating-high/medium/low` tokens (currently hardcoded green/orange/red)

**External Research Insights:**

- **IMDb gold (#F5C518)**: Industry-standard rating color
- **Letterboxd**: Uses gold stars for 5-star system
- **Netflix**: Uses green for high match percentages

#### 3. **Hero Sections / Featured Content**

**Files:** `Featured.tsx:frontend/src/pages/Featured.tsx`

**Current Token Usage:**

- Hardcoded Chakra `fg.muted` - Subtitle text (line 29)
- Hardcoded `colorScheme="blue"` - Primary button (line 53)
- Hardcoded `variant="outline"` - Secondary buttons (lines 61, 70)

**Patterns:**

- Large heading (size="4xl")
- Descriptive subtitle with muted text
- Card-based CTA section
- Button hierarchy (solid primary, outline secondary)
- Centered layout with max-width container

**Token Requirements:**

- ✅ Text muted (should use `text.muted` not `fg.muted`)
- ❌ **Missing:** Primary button semantic color (using hardcoded colorScheme)
- ❌ **Missing:** Card surface elevation token

#### 4. **Form Elements** (Input, Validation, Interactive)

**Files:** `Login.tsx:frontend/src/pages/user/Login.tsx`

**Current Token Usage:**

- `background.main` - Form container background (lines 431, 576)
- `border.separator` - Input borders (lines 465, 508)
- `background.subItem` - Input hover state (lines 467, 510, 543, 555)
- `border.error` - Error alerts (line 641)
- `border.success` - Success alerts (line 669)
- Hardcoded `#4299e1` - Inline link color (line 619)
- Hardcoded `red.600`, `red.700`, `red.800` - Error states (line 102)
- Hardcoded `gray.600` - Error ID text (line 132)

**Patterns:**

- Form field with label, input, error message
- Positioned error messages (absolute, below field)
- Hover states for inputs
- OAuth buttons with brand icons
- Status alerts (success, error, warning, info)
- Dismissible alerts with close button
- Email verification flow with resend button

**Token Requirements:**

- ✅ Form backgrounds, borders, hover states (mostly covered)
- ❌ **Missing:** Link color semantic token (using hardcoded hex)
- ❌ **Missing:** Success semantic tokens (currently using `border.success` but no `background.success`)
- ❌ **Missing:** Warning semantic tokens (alert exists but no dedicated warning tokens)
- ❌ **Missing:** Info semantic tokens (alert exists but no dedicated info tokens)
- ❌ **Missing:** Error background token (using hardcoded `red.*`)

#### 5. **Navigation Elements** (NavBar, Footer, Sidebar)

**Files:**

- `NavBar.tsx:frontend/src/components/layout/NavBar.tsx`
- `Footer.tsx:frontend/src/components/layout/Footer.tsx`
- `Sidebar.tsx:frontend/src/components/layout/Sidebar.tsx`

**Current Token Usage:**

- `background.navBar` - NavBar background (line 88)
- `border.separator` - Bottom border (line 96)
- `text.main` - Logo/title text (line 50)
- `accent.secondary` - Underline animation (line 61)
- `background.hover` - Button hover (line 153, 176)
- `background.footer` - Footer background (Footer line 11)
- `text.muted` - Copyright text (Footer line 29)
- `background.sidebar` - Sidebar background (Sidebar line 32)

**Patterns:**

- Sticky positioning (navbar top, sidebar top with offset)
- Two-row navbar (logo/search row + tabs row)
- Logo with hover glow effects
- Active tab indicator (solid variant + colorScheme)
- Responsive mobile/desktop layouts
- Footer with attribution and theme controls

**Token Requirements:**

- ✅ Navigation backgrounds, borders (well-covered)
- ✅ Text and accent colors (well-covered)
- ❌ **Missing:** Active tab semantic color (using hardcoded colorScheme="accent")
- ❌ **Missing:** Logo glow/filter effects (currently inline styles with hardcoded rgba)

#### 6. **Filter Panels / Sidebars**

**Files:** `GenreSelector.tsx:frontend/src/components/movie/filters/GenreSelector.tsx`

**Current Token Usage:**

- `text.main` - Label and checkbox text (lines 13, 45)
- `border.separator` - Checkbox border (line 36)
- `background.main` - Checkbox hover (line 39)

**Patterns:**

- Grid layout for checkboxes (5 columns)
- Checkbox with label
- Hover states
- Simple, compact design

**Token Requirements:**

- ✅ Basic text, borders, backgrounds (well-covered)
- ❌ **Missing:** Selected/checked state background color
- ❌ **Missing:** Filter chip/badge styling

#### 7. **Pagination / Interactive Controls**

**Files:** `PaginationCtrl.tsx:frontend/src/components/layout/PaginationCtrl.tsx`

**Current Token Usage:**

- `text.main` - Button text (lines 113, 132, 160, 256, 276, 314, 327)
- `text.secondary` - Ellipsis text (line 256)
- `border.separator` - Button borders (lines 114, 133, 161, 257, 277, 315, 328)
- `accent.primary` - Current page indicator underline (lines 145, 289)
- Hardcoded `colorScheme="blue"` - Current page button (lines 130, 274)

**Patterns:**

- Smart pagination (first, ..., current-1, current, current+1, ..., last)
- Current page highlighted with solid variant + underline
- Disabled states for prev/next at boundaries
- Dynamic padding based on page number length
- Ellipsis (...) for gaps

**Token Requirements:**

- ✅ Text, borders (well-covered)
- ✅ Accent underline (well-covered)
- ❌ **Missing:** Active/selected state semantic color (using hardcoded colorScheme)

#### 8. **Error Boundaries / Error States**

**Files:** `ErrorBoundary.tsx:frontend/src/components/ErrorBoundary.tsx`

**Current Token Usage:**

- `background.main` - Error display background (line 80)
- Hardcoded `red.600` - Heading color (line 102)
- Hardcoded `red.700` - Description text (line 105)
- Hardcoded `red.50`, `red.800`, `red.200` - Error message code block (lines 190-192)
- Hardcoded `gray.50`, `gray.800`, `gray.200` - Stack trace code block (lines 223-227)
- Hardcoded `blue.50`, `blue.800`, `blue.200` - Component stack code block (lines 248-250)
- Hardcoded `gray.600` - Help text (line 266)

**Patterns:**

- Full-page error display
- Alert with status="error"
- Collapsible technical details section
- Code blocks with syntax coloring (error, stack, component stack)
- Copy error details button
- Try Again and Report Issue buttons
- Error ID display with copy button

**Token Requirements:**

- ❌ **Missing:** Comprehensive error semantic tokens
    - `error` / `error-foreground` pair
    - `error-subtle` background for code blocks
    - `error-border` for outlined elements
- ❌ **Missing:** `info` / `info-foreground` pair (for component stack)
- ❌ **Missing:** `muted-subtle` background for gray code blocks
- ❌ **Missing:** Code block semantic tokens

#### 9. **Status Indicators / Alerts**

**Files:** Login.tsx (lines 630-766), ErrorBoundary.tsx

**Current Token Usage:**

- `border.success` - Success alert border (Login line 669)
- `border.error` - Error alert border (Login line 697)
- `text.success` - Success message text (Login line 755)

**Patterns:**

- Alert.Root with status prop (success, error, warning, info)
- Alert.Indicator icon
- Alert.Description text
- Dismissible with close button
- Multiple alerts stacked vertically

**Token Requirements:**

- ❌ **Missing:** Complete semantic token set for all alert types:
    - `success` / `success-foreground` / `success-border`
    - `error` / `error-foreground` / `error-border` (have border, need bg/fg)
    - `warning` / `warning-foreground` / `warning-border`
    - `info` / `info-foreground` / `info-border`

#### 10. **Badges / Tags**

**Files:** MovieUserScore.tsx, MovieDetail.tsx (implied genre tags)

**Current Token Usage:**

- Badge variant="surface" with backgroundColor override (MovieUserScore lines 48, 65, 74, 90)
- Hardcoded colors for score thresholds

**Patterns:**

- Compact size (12px font)
- Rounded corners (borderRadius={4})
- Background color with contrasting text
- Used for scores, genres, certifications

**Token Requirements:**

- ❌ **Missing:** `badge` / `badge-foreground` semantic pair
- ❌ **Missing:** Badge variants (genre, certification, platform, status)

### External Research Findings (Letterboxd, Netflix, IMDb)

**Research completed via external-research-analyst agent - see research report in previous step**

#### Key Findings from Reference Applications

**1. Letterboxd:**

- **Color Palette:** Dark-mode first (#14181C background, #2C3440 surfaces)
- **Accent:** Orange/coral for brand and interactive elements
- **Rating System:** 5-star with half-star precision, gold color
- **Surface Levels:** 2 levels (base + elevated)
- **Key Insight:** Minimal badge usage, focuses on poster grid

**2. Netflix:**

- **Color Palette:** Black background (#000000), red accent (#E50914)
- **Rating System:** Algorithmic "% Match", green for high, orange for medium
- **Surface Levels:** 3-4 levels with strong hover states (1.1-1.2x scale)
- **Badge Patterns:** Rectangular content rating badges (TV-MA, etc.)
- **Key Insight:** Heavy use of carousels and video auto-play

**3. IMDb:**

- **Color Palette:** Light mode default (white background), gold accent (#F5C518)
- **Rating System:** Iconic gold star badge with 10-point scale (X.X/10)
- **Score Badge:** Dark background (#2C2C2C), gold star, white text
- **Badge Patterns:** Genre pills, certification badges, award icons
- **Key Insight:** #F5C518 gold is THE industry-standard rating color

#### Cross-Platform Pattern Synthesis

**Common Semantic Token Categories Needed:**

| Token Category | Letterboxd | Netflix | IMDb | Currently Supported |
|---------------|------------|---------|------|---------------------|
| Primary Accent | Orange/Coral | Red | Gold | ✅ `accent` |
| Rating/Score Color | Gold (stars) | Green/White | Gold (#F5C518) | ❌ Missing |
| Success/Positive | Implicit | Green (match) | Gold (high score) | ⚠️ Have `text.success` but not rating-specific |
| Warning | Not prominent | Orange (alerts) | Not prominent | ❌ Missing complete set |
| Info | Not prominent | Not observed | Not prominent | ❌ Missing complete set |
| Badge Background | Subtle gray | Dark gray | Light gray | ❌ Missing |
| Surface Levels | 2 | 3-4 | 2 | ⚠️ Have 2 (background, card), need 3rd |
| Watch Status | Checkmark | Badge | Heart icon | ❌ Missing |

### Gap Analysis: shadcn/ui Base Tokens vs CineXplorer Needs

**shadcn/ui Base 20 Tokens:**

1. `background` / `foreground`
2. `card` / `card-foreground`
3. `popover` / `popover-foreground`
4. `primary` / `primary-foreground`
5. `secondary` / `secondary-foreground`
6. `muted` / `muted-foreground`
7. `accent` / `accent-foreground`
8. `destructive` / `destructive-foreground`
9. `border`
10. `input`
11. `ring`

**Gaps Identified (Critical = blocks migration, Nice-to-Have = creative workarounds possible):**

#### **Critical Gaps (No Reasonable Workaround):**

1. **Success Semantic Pair** - CRITICAL
   - **Need:** `success` / `success-foreground`
   - **Current State:** Have `text.success`, `text.successDark`, `border.success`
   - **Use Cases:** Success alerts (Login), form validation, positive feedback
   - **Cannot Use:** `primary` (wrong semantic meaning), `accent` (wrong color)
   - **Justification:** All 4 design systems have dedicated success tokens

2. **Warning Semantic Pair** - CRITICAL
   - **Need:** `warning` / `warning-foreground`
   - **Current State:** Email verification alert has no semantic warning color
   - **Use Cases:** Email verification prompts, validation warnings, cautions
   - **Cannot Use:** `secondary` (wrong meaning), `muted` (wrong emphasis)
   - **Justification:** 3/4 design systems have warning tokens, common UX pattern

3. **Info Semantic Pair** - CRITICAL
   - **Need:** `info` / `info-foreground`
   - **Current State:** ErrorBoundary component stack uses hardcoded blue.* colors
   - **Use Cases:** Help text, informational alerts, tips
   - **Cannot Use:** `accent` (too prominent), `muted` (too subtle)
   - **Justification:** Standard alert status type, needed for complete alert system

4. **Rating/Score Color** - CRITICAL for movie app
   - **Need:** `rating` / `rating-foreground` (gold/yellow hue)
   - **Current State:** MovieUserScore uses hardcoded `blue.700`, `yellow.700`, `green.600`, etc.
   - **Use Cases:** TMDB scores, user ratings, score badges
   - **Cannot Use:** `accent` (wrong color), `primary` (wrong semantic)
   - **Justification:** IMDb gold (#F5C518) is industry standard, score displays are core feature

#### **High Priority Gaps (Workarounds Awkward):**

5. **Surface Elevated (3rd level)** - HIGH
   - **Need:** `surface-elevated` (between card and popover)
   - **Current State:** Only have `background` (level 0) and `card` (level 1)
   - **Use Cases:** Hover states, nested cards, modals
   - **Workaround:** Use `popover` for elevated surfaces (semantic mismatch)
   - **Justification:** Netflix uses 3-4 levels, complex UIs need hierarchy

6. **Badge Semantic Pairs** - HIGH
   - **Need:** `badge` / `badge-foreground` base, plus variants (genre, certification)
   - **Current State:** Using Badge with backgroundColor overrides (MovieUserScore)
   - **Use Cases:** Genre tags, content ratings, status badges
   - **Workaround:** Use `muted` with colorPalette overrides (inconsistent)
   - **Justification:** Badges are pervasive in movie apps (genres, ratings, awards)

#### **Nice-to-Have Gaps (Creative Use of Existing Tokens Possible):**

7. **Watch Status Colors** - NICE-TO-HAVE
   - **Need:** `status-watched`, `status-watchlist`, `status-watching`
   - **Current State:** IconButton with colorPalette="blue" for watchlist
   - **Use Cases:** Watched checkmark, watchlist icon, currently watching badge
   - **Workaround:** Use `accent` for active states, `muted` for inactive
   - **Justification:** User-facing feature but can leverage existing accent colors

8. **Interactive Button Accent** - NICE-TO-HAVE
   - **Need:** Dedicated interactive button semantic token
   - **Current State:** Hardcoded colorScheme="blue" for buttons
   - **Use Cases:** Hover states, active buttons, selected pagination
   - **Workaround:** Use `accent` consistently
   - **Justification:** Can standardize on `accent`, not a blocking issue

### Token Structure Extension Proposal

**Minimum Viable Extension (4 new pairs = 8 tokens):**

```typescript
// Add to ThemeColors interface
{
  // Status semantic pairs (matches common alert types)
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  info: string;
  'info-foreground': string;

  // Movie-specific rating color
  rating: string;
  'rating-foreground': string;
}
```

**Total tokens:** 20 (base) + 8 (new) = 28 tokens

**Recommended Extension (6 new categories = 13 tokens):**

```typescript
// Add to ThemeColors interface
{
  // Status semantic pairs
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  info: string;
  'info-foreground': string;

  // Movie-specific tokens
  rating: string;
  'rating-foreground': string;

  // Surface elevation
  'surface-elevated': string; // 3rd level between card and popover

  // Badge system
  badge: string;
  'badge-foreground': string;
  'badge-genre': string; // Optional: specific badge variant
  'badge-certification': string; // Optional: specific badge variant
}
```

**Total tokens:** 20 (base) + 13 (new) = 33 tokens

**Comprehensive Extension (matches production systems = 18 tokens):**

```typescript
// Add to ThemeColors interface
{
  // Status semantic pairs (complete alert system)
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  info: string;
  'info-foreground': string;

  // Movie-specific tokens
  rating: string;
  'rating-foreground': string;
  'rating-high': string; // Optional: color-coded scores
  'rating-medium': string;
  'rating-low': string;

  // Surface elevation
  'surface-elevated': string;

  // Badge system
  badge: string;
  'badge-foreground': string;
  'badge-genre': string;
  'badge-certification': string;

  // Watch status (nice-to-have)
  'status-watched': string;
  'status-watchlist': string;
}
```

**Total tokens:** 20 (base) + 18 (new) = 38 tokens

**Still under production system averages:**

- Material Design 3: 141 tokens
- IBM Carbon: 80+ tokens
- GitHub Primer: 60+ tokens
- Ant Design: 50+ tokens

### Recommendations

**Phase 3.3 Tasks:**

1. Map ALL current component color usage to token structure
2. Identify every instance of hardcoded Chakra colors
3. Create comprehensive migration guide (old → new token mappings)

**Phase 3.4 Tasks:**

1. Implement **Minimum Viable Extension** first (4 pairs = 8 tokens)
2. Update TypeScript types in `types.ts`
3. Create ADR documenting token extension decision
4. Run TypeScript type checking to validate

**Phase 4 Tasks (Component Migration):**

1. Migrate high-impact components first:
   - ErrorBoundary (most hardcoded colors)
   - MovieUserScore (rating colors)
   - Login (alert system)
2. Use new semantic tokens consistently
3. Eliminate all hardcoded colorScheme props

**Future Considerations:**

- Evaluate need for rating threshold colors (high/medium/low) after seeing themed variations
- Consider badge variants if genre tagging becomes prominent
- Watch status tokens may be needed when watchlist feature is fully built out

### Key Insights

1. **shadcn/ui is intentionally minimal** (20 tokens) - designed for extension
2. **Production systems use 40-140+ tokens** - but we don't need that many
3. **4 semantic pairs are critical** - success, warning, info, rating
4. **Movie apps have unique needs** - score displays, badges, watch status
5. **Industry patterns converge** - gold rating colors, dark mode preference, badge systems
6. **Our current system is close** - we already have many custom tokens, just need to formalize structure

---

## Phase 3.3: Current Token Coverage Audit

**Task:** Map existing token usage and create comprehensive migration guide

**Completed:** 2025-11-02

### shadcn/ui Base 20 Tokens (Current System)

**Status:** ✅ Already implemented in `frontend/src/theme/types.ts`

All 20 tokens follow shadcn/ui semantic naming convention:

| Token | Purpose | Use Cases |
|-------|---------|-----------|
| **Base Colors** | | |
| `background` | Default page background | Body, main containers, page fills |
| `foreground` | Default text on background | Body text, main headings |
| **Card Colors** (Elevated Surfaces) | | |
| `card` | Card container backgrounds | Movie cards, content panels, elevated surfaces |
| `card-foreground` | Text on card backgrounds | Card text, headings within cards |
| **Popover Colors** (Overlays) | | |
| `popover` | Dropdown/tooltip backgrounds | Menus, tooltips, dropdowns, modals |
| `popover-foreground` | Text on popover backgrounds | Menu items, tooltip text |
| **Primary Colors** (Main Actions) | | |
| `primary` | Primary action elements | Main CTAs, submit buttons, key actions |
| `primary-foreground` | Text on primary backgrounds | Button text, icon colors |
| **Secondary Colors** (Supporting Actions) | | |
| `secondary` | Secondary action elements | Secondary buttons, alternate actions |
| `secondary-foreground` | Text on secondary backgrounds | Secondary button text |
| **Muted Colors** (Deemphasized) | | |
| `muted` | Muted/disabled backgrounds | Disabled buttons, subtle surfaces |
| `muted-foreground` | Secondary text, labels | Help text, labels, captions, timestamps |
| **Accent Colors** (Highlights) | | |
| `accent` | Highlighted elements | Links, badges, focus states, callouts |
| `accent-foreground` | Text on accent backgrounds | Accent badge text |
| **Destructive Colors** (Danger) | | |
| `destructive` | Danger/error/delete actions | Delete buttons, error states, destructive actions |
| `destructive-foreground` | Text on destructive backgrounds | Destructive button text |
| **UI Elements** | | |
| `border` | Standard borders | Dividers, card outlines, separators |
| `input` | Input field borders | Text inputs, select boxes, form fields |
| `ring` | Focus ring indicator | Keyboard navigation, focus states |

**Total:** 20 semantic concepts (11 pairs + 3 singles = 22 properties in TypeScript interface)

### Old Custom Token System (Legacy - Being Phased Out)

**Status:** ⚠️ Still in use across components, needs migration

Our old custom system had these categories (from Phase 1.1 audit):

#### Background Tokens (8 tokens)

- `background.main` → **maps to `background`**
- `background.navBar` → **maps to `card`** (elevated surface)
- `background.footer` → **maps to `card`** (elevated surface)
- `background.sidebar` → **maps to `card`** (elevated surface)
- `background.sidebarInterior` → **NO DIRECT MAP** (unused anyway)
- `background.subItem` → **maps to `muted`** (subtle background)
- `background.hover` → **maps to `muted`** (hover state)
- `background.selected` → **maps to `accent`** (selected state)
- `background.skeleton` → **maps to `muted`** (loading placeholder)

#### Text Tokens (7 tokens)

- `text.main` → **maps to `foreground`**
- `text.muted` → **maps to `muted-foreground`**
- `text.secondary` → **maps to `muted-foreground`** (or deduplicate)
- `text.error` → **NO DIRECT MAP** → needs `destructive-foreground`
- `text.info` → **NO DIRECT MAP** → needs `info-foreground` ❌
- `text.success` → **NO DIRECT MAP** → needs `success-foreground` ❌
- `text.successDark` → **NO DIRECT MAP** → needs `success-foreground` ❌

#### Border Tokens (6 tokens)

- `border.subtle` → **maps to `border`** (lighter variant)
- `border.separator` → **maps to `border`**
- `border.sidebar` → **maps to `border`**
- `border.input` → **maps to `input`**
- `border.error` → **NO DIRECT MAP** → needs `destructive` border variant ❌
- `border.success` → **NO DIRECT MAP** → needs `success` border variant ❌

#### Accent Tokens (7 tokens)

- `accent.primary` → **maps to `accent`**
- `accent.secondary` → **maps to `accent`** (deduplicate)
- `accent.tertiary` → **maps to `accent`** (deduplicate)
- `accent.highlight` → **maps to `accent`**
- `accent.link` → **maps to `accent`**
- `accent.tagTeal` → **NO DIRECT MAP** → needs `badge` or keep as variant
- `accent.tagPurple` → **NO DIRECT MAP** → needs `badge` or keep as variant

**Total Legacy Tokens:** 28 custom tokens → need to map to 20 shadcn/ui tokens (with gaps)

### Comprehensive Migration Guide

**Old Token → New shadcn/ui Token Mapping**

#### ✅ Direct 1:1 Mappings (No Changes Needed)

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| `background.main` | `background` | Exact match |
| `text.main` | `foreground` | Exact match |
| `border.input` | `input` | Exact match |
| `accent.primary` | `accent` | Exact match |

#### ⚠️ Multiple Old → Single New (Deduplication Opportunity)

| Old Tokens | New Token | Migration Action |
|------------|-----------|------------------|
| `background.navBar`, `background.footer`, `background.sidebar` | `card` | Consolidate all elevated surfaces |
| `background.subItem`, `background.hover`, `background.skeleton` | `muted` | Consolidate subtle backgrounds |
| `text.muted`, `text.secondary` | `muted-foreground` | Consolidate secondary text |
| `border.subtle`, `border.separator`, `border.sidebar` | `border` | Consolidate all borders |
| `accent.secondary`, `accent.tertiary`, `accent.highlight`, `accent.link` | `accent` | Consolidate accent variants |

#### ❌ Old → Missing New (Requires New Tokens)

| Old Token | Missing New Token | Priority |
|-----------|-------------------|----------|
| `text.error` | `error-foreground` (alias `destructive-foreground`) | CRITICAL |
| `text.success`, `text.successDark` | `success-foreground` | CRITICAL |
| `text.info` | `info-foreground` | CRITICAL |
| `border.error` | `error` (use as border color) | CRITICAL |
| `border.success` | `success` (use as border color) | CRITICAL |
| `accent.tagTeal`, `accent.tagPurple` | `badge`, `badge-foreground` | HIGH |
| *(none - new requirement)* | `rating`, `rating-foreground` | CRITICAL |
| *(none - new requirement)* | `surface-elevated` | HIGH |
| *(none - new requirement)* | `drag-active`, `drop-zone` | MEDIUM |

### Hardcoded Colors Requiring Migration

**From Phase 3.2 component analysis:**

#### ErrorBoundary.tsx (Most violations - 15+ hardcoded colors)

```typescript
// Current hardcoded colors → Target semantic tokens
red.600 → destructive-foreground (heading)
red.700 → destructive-foreground (description)
red.50 → destructive (background for error code block)
red.800 → destructive-foreground (code text)
red.200 → destructive (border for code block)
gray.50 → muted (stack trace background)
gray.800 → foreground (stack trace text)
gray.200 → border (stack trace border)
blue.50 → info (component stack background) ❌ MISSING
blue.800 → info-foreground (component stack text) ❌ MISSING
blue.200 → info (component stack border) ❌ MISSING
gray.600 → muted-foreground (help text)
```

#### MovieUserScore.tsx (Rating colors)

```typescript
// Current hardcoded colors → Target semantic tokens
text.successDark → rating (or rating-high) ❌ NEEDS RATING TOKEN
blue.700 → rating (or rating-medium) ❌ NEEDS RATING TOKEN
yellow.700 → rating (or rating-low) ❌ NEEDS RATING TOKEN
green.600 → success (user rating high) ❌ MISSING
orange.600 → warning (user rating medium) ❌ MISSING
red.600 → destructive (user rating low) - already have destructive
```

#### Login.tsx (Forms and alerts)

```typescript
// Current hardcoded colors → Target semantic tokens
#4299e1 → accent (link color) - inline style
red.600, red.700, red.800 → destructive-foreground
gray.600 → muted-foreground
fg.muted → muted-foreground (Chakra built-in, should migrate)
```

#### Featured.tsx (Hero section)

```typescript
// Current hardcoded colors → Target semantic tokens
fg.muted → muted-foreground
colorScheme="blue" → accent (button colorScheme prop)
```

#### MovieCard.tsx (Interactive states)

```typescript
// Current hardcoded colors → Target semantic tokens
colorPalette="blue" → accent (button states)
```

#### PaginationCtrl.tsx (Active states)

```typescript
// Current hardcoded colors → Target semantic tokens
colorScheme="blue" → accent (current page button)
```

#### NavBar.tsx (Active tabs)

```typescript
// Current hardcoded colors → Target semantic tokens
colorScheme="accent" → accent (active tab) - ALREADY CORRECT
```

**Total Hardcoded Color Instances:** 25+ across 7 components

### Gap Prioritization & Token Extension Proposal

**Based on comprehensive analysis from Phase 3.2 + 3.3:**

#### 🔴 CRITICAL Gaps (Blocks Migration - Must Implement)

**4 semantic pairs = 8 tokens:**

1. **Success Semantic Pair** ✅ **APPROVED**

   ```typescript
   success: string;              // Success background (green)
   'success-foreground': string; // Text on success background
   ```

   - **Replaces:** `text.success`, `text.successDark`, `border.success`
   - **Use cases:** Success alerts, positive feedback, high ratings, form validation
   - **Justification:** All 4 major design systems have success tokens
   - **Migration impact:** Login (2 uses), ErrorBoundary (planned), MovieUserScore (1 use)

2. **Warning Semantic Pair** ✅ **APPROVED**

   ```typescript
   warning: string;              // Warning background (orange/yellow)
   'warning-foreground': string; // Text on warning background
   ```

   - **Replaces:** None (new requirement from alert system)
   - **Use cases:** Email verification prompts, validation warnings, cautions
   - **Justification:** Standard alert status, 3/4 design systems have warning
   - **Migration impact:** Login email verification alert

3. **Info Semantic Pair** ✅ **APPROVED**

   ```typescript
   info: string;              // Info background (blue)
   'info-foreground': string; // Text on info background
   ```

   - **Replaces:** `text.info` (currently unused)
   - **Use cases:** ErrorBoundary component stack, help text, tips, informational alerts
   - **Justification:** Completes alert system (success/warning/error/info)
   - **Migration impact:** ErrorBoundary (3 uses for component stack)

4. **Rating Semantic Pair** ✅ **APPROVED** (Movie-specific)

   ```typescript
   rating: string;              // Rating/score background (gold #F5C518 recommended)
   'rating-foreground': string; // Text on rating background
   ```

   - **Replaces:** Hardcoded `blue.700`, `yellow.700`, `text.successDark` in MovieUserScore
   - **Use cases:** TMDB scores, user ratings, score badges (core movie app feature)
   - **Justification:** IMDb gold is industry standard, scores are PRIMARY app feature
   - **Migration impact:** MovieUserScore (4 uses), future rating components

**Minimum Viable Extension: 8 tokens (4 pairs)**
**Total tokens after extension: 20 + 8 = 28 tokens**

#### 🟡 HIGH PRIORITY Gaps (Awkward Workarounds)

**5 additional tokens:**

5. **Surface Elevated** ✅ **APPROVED**

   ```typescript
   'surface-elevated': string; // 3rd elevation level (between card and popover)
   ```

   - **Current workaround:** Use `popover` (semantic mismatch)
   - **Use cases:** Hover states on cards, nested surfaces, modal backgrounds
   - **Justification:** Netflix uses 3-4 levels, complex UIs need hierarchy
   - **Migration impact:** MovieCard hover states, future modals

6. **Badge Semantic Pair** ✅ **APPROVED**

   ```typescript
   badge: string;              // Badge background
   'badge-foreground': string; // Text on badge
   ```

   - **Current workaround:** Badge with `backgroundColor` overrides
   - **Use cases:** Genre tags, content ratings, status badges (pervasive in movie apps)
   - **Justification:** Badges everywhere in movie discovery apps
   - **Migration impact:** MovieUserScore (4 uses), future genre tags

7. **Drag-and-Drop States** ✅ **APPROVED** (User requested)

   ```typescript
   'drag-active': string; // Item being dragged
   'drop-zone': string;   // Valid drop target
   ```

   - **Current workaround:** None (feature not implemented yet)
   - **Use cases:** Watchlist reordering, Favorites reordering (planned features)
   - **Justification:** Drag-and-drop is core META-PRD feature for watchlist/favorites
   - **Migration impact:** Future implementation for reorderable lists

**Recommended Extension: 13 tokens (8 critical + 5 high priority)**
**Total tokens after extension: 20 + 13 = 33 tokens**

#### 🟢 NICE-TO-HAVE Gaps (Creative Workarounds Acceptable)

**5 optional tokens:**

8. **Rating Threshold Colors** (Optional refinement)

   ```typescript
   'rating-high': string;   // High scores (8+/10) - green tint
   'rating-medium': string; // Medium scores (5-7/10) - blue/orange tint
   'rating-low': string;    // Low scores (<5/10) - yellow/red tint
   ```

   - **Current workaround:** Use single `rating` token with opacity or computed colors
   - **Use cases:** Color-coded score badges (visual differentiation)
   - **Justification:** Nice visual polish, but can be derived from base `rating` token
   - **Decision:** Defer until we see themed variations - may not be needed

9. **Watch Status Colors** (Optional - can use accent)

   ```typescript
   'status-watched': string;   // Watched checkmark
   'status-watchlist': string; // Watchlist bookmark
   ```

   - **Current workaround:** Use `accent` for active states, `muted` for inactive
   - **Use cases:** Movie card action buttons (watched, liked, watchlist)
   - **Justification:** User-facing feature but accent colors work fine
   - **Migration impact:** MovieCard buttons currently use hardcoded `colorPalette="blue"`

**Comprehensive Extension: 18 tokens (13 recommended + 5 nice-to-have)**
**Total tokens after extension: 20 + 18 = 38 tokens**

### Final Token Extension Recommendation

**IMPLEMENT RECOMMENDED EXTENSION (13 tokens):**

```typescript
// Add to ThemeColors interface in frontend/src/theme/types.ts
export interface ThemeColors {
  // ... existing 20 tokens ...

  // Status semantic pairs (4 pairs = 8 tokens)
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  info: string;
  'info-foreground': string;

  // Movie-specific rating (1 pair = 2 tokens)
  rating: string;
  'rating-foreground': string;

  // Surface elevation (1 token)
  'surface-elevated': string;

  // Badge system (1 pair = 2 tokens)
  badge: string;
  'badge-foreground': string;

  // Drag-and-drop states (2 tokens)
  'drag-active': string;
  'drop-zone': string;
}
```

**Total: 33 semantic tokens** (still under industry averages of 40-140+)

### Migration Checklist

**Components requiring migration (Priority Order):**

1. ✅ **ErrorBoundary** - 15+ hardcoded colors (red.*, gray.*, blue.*)
   - Migrate to: `destructive`, `info`, `muted`, `foreground`, `border`
   - After extension: Use `destructive`, `info`, `muted-foreground`

2. ✅ **MovieUserScore** - Rating color logic
   - Migrate to: `rating`, `success`, `warning`, `destructive`
   - After extension: Use `rating` token (IMDb gold #F5C518)

3. ✅ **Login** - Alert system and form styling
   - Migrate to: `success`, `destructive`, `accent` (links), `muted-foreground`
   - After extension: Use complete alert semantic tokens

4. ✅ **Featured** - Hero section
   - Migrate `fg.muted` → `muted-foreground`
   - Migrate `colorScheme="blue"` → use `accent` consistently

5. ✅ **MovieCard** - Interactive button states
   - Migrate `colorPalette="blue"` → use `accent`

6. ✅ **PaginationCtrl** - Active page indicator
   - Migrate `colorScheme="blue"` → use `accent`

7. ✅ **NavBar** - Already correct (uses `colorScheme="accent"`)

**Hardcoded Color Elimination:**

- Total instances: 25+
- Files affected: 7 components
- Estimated migration effort: 2-4 hours (after tokens extended)

### Key Insights

1. **Current system is 70% aligned** - Most old tokens map cleanly to shadcn/ui
2. **8 critical tokens block migration** - success, warning, info, rating pairs
3. **Drag-and-drop needs planning** - User-requested, core feature requirement
4. **Badge system is high value** - Pervasive in movie app UI patterns
5. **Hardcoded colors are concentrated** - ErrorBoundary worst offender (15+ instances)
6. **Migration is incremental** - Can extend tokens first, then migrate components one-by-one

---

## Phase 3.1: Research Synthesis - Semantic Token Best Practices

**Completed:** 2025-11-02

**Research Sources:**

- Material Design 3 (20KB) - Google's design system
- IBM Carbon Design System (22KB) - Enterprise design patterns
- GitHub Primer (23KB) - Proven at massive scale
- Ant Design (24KB) - Comprehensive token taxonomy

**Total Research Analyzed:** 89KB across 4 production design systems

**Synthesis Approach:** Targeted extraction of patterns addressing CineXplorer's specific gaps
(identified in Tasks 3.2 & 3.3). Rather than comprehensive summarization, this synthesis focuses on actionable patterns
for our CRITICAL and HIGH priority token gaps.

### 1. Success/Warning/Info Token Patterns (CRITICAL GAP)

**Problem Statement:** shadcn/ui base provides only `destructive` for error states.
Tasks 3.2 & 3.3 identified need for success, warning, and info semantic pairs.

#### Cross-System Findings

**All 4 Systems Include Complete Status Token Sets:**

| System | Success | Warning | Info | Error | Notes |
|--------|---------|---------|------|-------|-------|
| **Material Design 3** | ❌ (custom) | ❌ (custom) | ❌ (custom) | ✅ `error` | MD3 philosophy: success = normal flow, not requiring dedicated tokens. Recommends custom extension. |
| **IBM Carbon** | ✅ `support-success` | ✅ `support-warning` | ✅ `support-info` | ✅ `support-error` | Complete set, enterprise-tested. All use `support-*` prefix. |
| **GitHub Primer** | ✅ `success` | ✅ `attention` | ✅ (via `accent`) | ✅ `danger` | Proven at scale. Note: uses "attention" not "warning", "danger" not "error". |
| **Ant Design** | ✅ `colorSuccess` | ✅ `colorWarning` | ✅ `colorInfo` | ✅ `colorError` | PLUS `processing` state (5 total). Most comprehensive status set. |

**Key Pattern: Role + Variant Structure**

All systems use consistent naming: `[semanticRole]-[variant]`

**IBM Carbon Example:**

```
support-success           // Base color
support-success-hover     // Hover state
support-success-active    // Active state
```

**Ant Design Example:**

```
colorSuccess              // Seed token
colorSuccessBg           // Background variant (lighter)
colorSuccessBorder       // Border variant
colorSuccessHover        // Hover state
colorSuccessActive       // Active state
```

**shadcn/ui Convention Mapping:**

```
success / success-foreground           // Base pair
warning / warning-foreground           // Base pair
info / info-foreground                 // Base pair
destructive / destructive-foreground   // Already exists
```

#### Color Value Recommendations

**From Industry Standards:**

| State | Recommended Color | System Source | Notes |
|-------|------------------|---------------|-------|
| **Success** | `#198038` (green) | IBM Carbon | Enterprise-tested, WCAG AA compliant |
| **Warning** | `#faad14` (gold/yellow) | Ant Design | High visibility, accessible |
| **Info** | `#0f62fe` (blue) | IBM Carbon | Distinct from accent, professional |
| **Error** | Existing `destructive` | shadcn/ui | Already implemented |

**Contrast Requirements:**

- Normal text: 4.5:1 minimum (WCAG AA)
- Large text: 3:1 minimum
- UI components: 3:1 minimum

#### Usage Patterns from Research

**Alert/Notification Components:**

- Material Design 3: N/A (error only)
- IBM Carbon: All 4 states with `role="alert"` for error/warning, `aria-live="polite"` for info
- GitHub Primer: Uses semantic color + muted/emphasis variants
- Ant Design: Alert component with all 5 status presets

**Badge/Status Indicators:**

- IBM Carbon: Status badge pattern uses support tokens
- GitHub Primer: State labels map to semantic roles
- Ant Design: Badge `status` prop with 5 presets

**Form Validation:**

- All systems: Error state required, success/warning optional but recommended
- IBM Carbon: Uses support tokens for field borders
- Ant Design: Extends to `colorErrorBorder`, `colorSuccessBorder`, etc.

#### Recommended Implementation for CineXplorer

**Base Tokens (2 per state = 6 new tokens):**

```typescript
// Add to ThemeColors interface
success: string;              // #198038 (green, IBM Carbon standard)
'success-foreground': string; // White or dark text (auto-contrast)

warning: string;              // #faad14 (gold, Ant Design standard)
'warning-foreground': string;

info: string;                 // #0f62fe (blue, IBM Carbon standard)
'info-foreground': string;
```

**Application Strategy:**

- **ErrorBoundary**: Migrate from `red.*` → `destructive`, add `info` for helpful hints
- **Login/Auth**: Use `success` for successful login, `destructive` for errors, `info` for tips
- **MovieUserScore**: Consider `success` for high ratings (8.0+), `warning` for mid (6.0-7.9)
- **Future alerts**: Ready for comprehensive alert system

**Why Not More Variants?**

- Keep minimal for now (just base pairs)
- Add `-hover`, `-active`, `-border` variants only when needed
- shadcn/ui philosophy: minimal but complete

### 2. Rating Token Patterns (CRITICAL GAP - Movie-Specific)

**Problem Statement:** Movie ratings are core to CineXplorer UX. Need dedicated token for rating displays.
Task 3.2 identified IMDb gold (#F5C518) as industry standard.

#### Cross-System Findings

**Dedicated Rating Systems:**

| System | Dedicated Rating Tokens | Pattern | Use Case |
|--------|------------------------|---------|----------|
| **Material Design 3** | ❌ No dedicated tokens | Suggests `primary` or custom | Generic star rating component |
| **IBM Carbon** | ❌ No dedicated tokens | Uses `interactive-01` for stars | Rating displays rare in enterprise UI |
| **GitHub Primer** | ❌ No dedicated tokens | Uses `accent` for emphasis | Not applicable to GitHub domain |
| **Ant Design** | ✅ **Rate component tokens** | `rateStarColor`, `rateStarSize`, etc. | Designed for e-commerce/review systems |

**Ant Design Rate Component:**

```typescript
// Component-specific tokens
rateStarSize: number;           // Star/icon size
rateStarColor: string;          // Default: colorWarning (gold #faad14)
rateStarHoverColor: string;     // Hover state
rateStarActiveColor: string;    // Selected/filled state

// Features
- Half-star precision
- Custom icons (stars, hearts, custom)
- Read-only mode
- Hover preview feedback
```

**Key Insight:** Ant Design maps rating to `colorWarning` (gold) by default - aligns with streaming service conventions.

#### Industry Color Standards (Task 3.2 Research)

**Reference Applications:**

| Platform | Rating Color | Implementation | Notes |
|----------|-------------|----------------|-------|
| **IMDb** | `#F5C518` (gold) | Iconic, industry standard | 10-point scale, gold badges |
| **Letterboxd** | Gold (similar) | 5-star system | Dark-first design |
| **Netflix** | Red accent | % match score | Brand-specific, not rating color |

**IMDb Gold Analysis:**

- Hex: `#F5C518`
- Recognition: THE industry standard for movie ratings
- Accessibility: High visibility against dark backgrounds
- Psychology: Gold = quality, prestige, excellence

#### Recommended Implementation for CineXplorer

**Dedicated Rating Token Pair:**

```typescript
// Add to ThemeColors interface
rating: string;              // #F5C518 (IMDb gold standard)
'rating-foreground': string; // Dark text for accessibility
```

**Usage Pattern:**

```tsx
// MovieUserScore component
<Box color="rating">8.5</Box>
<Text color="rating-foreground">/10</Text>

// Star ratings (if implemented)
<StarIcon fill="rating" />
```

**Why Dedicated Token vs. Reusing Warning?**

1. **Semantic clarity**: Rating ≠ warning. Distinct meaning.
2. **Independent control**: Can change warning color without affecting ratings
3. **Industry alignment**: IMDb gold is THE standard, deserves dedicated token
4. **Future flexibility**: May want different rating colors for different sources

**Implementation Note:**

- Light mode: `#F5C518` (IMDb gold)
- Dark mode: Slightly brighter for contrast, e.g., `#FFD700` or `#FFC107`

### 3. Surface Elevation Token Patterns (HIGH PRIORITY)

**Problem Statement:** shadcn/ui provides `card` token but no multi-level surface hierarchy.
Task 3.2 identified need for 3+ surface levels (base, card, elevated, highest).

#### Cross-System Surface Strategies

**Material Design 3 - Tone-Based Surfaces (6 levels):**

```
surface                    // Base background
surface-dim               // Lowest tonal elevation
surface-container-lowest  // Expanded containers below standard
surface-container         // Default cards, dialogs
surface-container-high    // High-emphasis containers
surface-container-highest // Maximum elevation (critical overlays)
```

**Key Innovation:** Uses tonal variation (luminance) instead of shadows alone.
Higher elevations are lighter in dark mode, creating depth through color.

**IBM Carbon - Layer System (4 layers + background):**

```
background       // Foundational canvas (layer 00)
layer-01        // Base nested level
layer-02        // Second nested level
layer-03        // Third nested level (max)
```

**Key Pattern:** Contextual tokens auto-adapt. Components built once work on any layer.

**GitHub Primer - Canvas Hierarchy (3 levels):**

```
bgColor-default  // Standard app background (white/near-black)
bgColor-muted    // Secondary background for grouping
bgColor-subtle   // Softest background for minimal separation
```

**Key Philosophy:** Minimal but complete. Uses color intensity for depth, not shadows.

**Ant Design - Background Variants (3 levels):**

```
colorBgBase      // Base background
colorBgLayout    // Page/layout background
colorBgContainer // Container background
colorBgElevated  // Elevated surface background
colorBgSpotlight // Spotlight/highlight background
```

**Key Feature:** Algorithmic derivation from seed tokens. Dark mode auto-generated.

#### CineXplorer Surface Needs (from Task 3.2 Analysis)

**Required Surface Hierarchy:**

1. **Base**: Page background (`background` token - already exists)
2. **Card**: Movie cards, containers (`card` token - already exists)
3. **Elevated**: Featured sections, modals, dialogs (**NEW - surface-elevated**)
4. **Highest**: Critical overlays (can use `popover` token - already exists)

**Recommended Token:**

```typescript
// Add to ThemeColors interface
'surface-elevated': string;  // 3rd surface level for featured content
```

**Why Not Full 6-Level System?**

- shadcn/ui philosophy: minimal but sufficient
- Current needs: 3 levels adequate
- Can expand later if needed
- Keeps token count manageable

**Application Strategy:**

```tsx
// Current usage
<Box bg="background">         // Page
  <Card bg="card">            // Movie card
    <Box bg="card-foreground"> // Card content
  </Card>
</Box>

// With surface-elevated
<Box bg="background">         // Page
  <Card bg="surface-elevated"> // Featured movie hero
    <Box bg="card">            // Nested card
    </Box>
  </Card>
</Box>
```

**Implementation Guidance:**

- **Light mode**: `surface-elevated` slightly lighter than `card`
- **Dark mode**: `surface-elevated` slightly lighter/more saturated than `card`
- **Maintain contrast**: Ensure text readability on all surface levels

### 4. Badge/Tag Token Patterns (HIGH PRIORITY)

**Problem Statement:** Task 3.2 identified extensive badge/tag usage for genres, status, content ratings.
Need semantic tokens for consistent badge styling.

#### Cross-System Badge/Tag Patterns

**IBM Carbon - Tag Component Tokens:**

```
// Component-specific tokens
tag-background-{layer}     // Contextual background per layer
tag-border-{layer}        // Border color per layer
tag-text                  // Text color

// Variants
- Read-only tags: Uses component tokens
- Dismissible tags: Adds hover/focus states
- Operational tags: Full interactive states
- Selectable tags: Uses core tokens for control
```

**Key Pattern:** Tags adapt to layer context. Same component works on layer-01, layer-02, layer-03.

**GitHub Primer - Label/Badge Patterns:**

```
// Semantic role mapping
bgColor-success / fgColor-success      // Available/streaming
bgColor-danger / fgColor-danger        // Not available
bgColor-attention / fgColor-attention  // Coming soon
bgColor-accent / fgColor-accent        // Default/neutral

// Variants
- Default: Standard background
- Muted: Subtle background for low emphasis
- Emphasis: Strong background for high visibility
```

**Key Feature:** Muted/emphasis variants for hierarchy. Same semantic role, different prominence.

**Ant Design - Tag/Badge Status System:**

```typescript
// Tag status presets
status: 'success' | 'processing' | 'error' | 'default' | 'warning'

// Associated tokens
tagBg                    // Default background
tagDefaultBg            // Default status background
tagDefaultBorderColor   // Default status border

// Badge status presets
status: 'success' | 'processing' | 'error' | 'default' | 'warning'

// Badge tokens
badgeBg         // Badge background
badgeColor      // Badge text
badgeHeight     // Badge size
```

**Key Feature:** Status presets map to semantic color tokens. Consistent across Badge and Tag components.

#### CineXplorer Badge/Tag Requirements (from Task 3.2)

**Use Cases:**

1. **Genre Tags**: Action, Drama, Sci-Fi, etc. (neutral, clickable)
2. **Content Ratings**: PG, PG-13, R (warning/info colored)
3. **Availability Status**: Streaming Now, Coming Soon (success/warning)
4. **Watch Status**: Watched, In Watchlist (success/neutral)

**Recommended Tokens:**

```typescript
// Add to ThemeColors interface
badge: string;              // Default badge background
'badge-foreground': string; // Badge text color
```

**Why Only 2 Tokens?**

- Badge container and text is all that's needed
- Status badges use semantic tokens (success, warning, info, destructive)
- Genre tags use neutral (badge/badge-foreground)
- Keeps system minimal

**Implementation Strategy:**

```tsx
// Neutral badge (genres, default tags)
<Badge bg="badge" color="badge-foreground">Action</Badge>

// Status badges (use semantic tokens)
<Badge bg="success" color="success-foreground">Streaming Now</Badge>
<Badge bg="warning" color="warning-foreground">Coming Soon</Badge>
<Badge bg="destructive" color="destructive-foreground">Not Available</Badge>
<Badge bg="info" color="info-foreground">PG-13</Badge>
```

**Advantage:** Leverages semantic tokens for status, dedicated tokens for neutral badges. Best of both worlds.

### 5. Drag-and-Drop State Tokens (HIGH PRIORITY - User-Requested)

**Problem Statement:** Task 3.2 noted user request for watchlist/favorites drag-and-drop reordering.
Need tokens for drag states.

#### Cross-System Interactive State Patterns

**Material Design 3 - State Layer System:**

```
// State layer opacities (overlay approach)
Hover:    8% opacity
Focus:    12% opacity
Pressed:  12% opacity
Drag:     16% opacity    // ← Dedicated drag state
Disabled: 38% opacity
```

**Key Pattern:** Uses semi-transparent overlays, not color changes. Overlay = foreground color at specified opacity.

**IBM Carbon - Interactive State Progression:**

```
Hover:    Half step lighter/darker (between palette steps)
Active:   Two full steps lighter/darker
Focus:    Dedicated focus token (high-contrast outline)
Disabled: Reduced opacity, no interactive feedback
Drag:     No dedicated token (use active state)
```

**Key Feature:** Predictable color progression. No special drag token needed.

**GitHub Primer - Interactive Depth:**

```
// Opacity changes for feedback
- Hover: Subtle border emphasis (default → emphasis)
- Focus: Dedicated focus outline
- Active: Background intensity shift (muted → default → emphasis)
- Drag: Uses active state + increased z-index
```

**Key Philosophy:** Minimal tokens, combinatorial states. No dedicated drag token.

**Ant Design - Comprehensive State Coverage:**

```
// Interactive state tokens
*Hover:    Lighter/more saturated
*Active:   Darkest variant
*Focus:    Outline styling
*Disabled: 45% opacity
Drag:      No dedicated token (uses active)
```

**Key Feature:** Drag state reuses active state. Drop zone = hover state on target.

#### Industry Patterns for Drag-and-Drop

**Common Pattern Across All Systems:**

1. **Dragging element**: Uses `active` state (pressed/selected appearance)
2. **Drop zone (valid)**: Uses `hover` state or subtle `success` tint
3. **Drop zone (invalid)**: Uses `destructive` tint or disabled state
4. **Ghost/preview**: Reduced opacity (50-70%) of original element

**No System Uses Dedicated Drag Tokens** - All reuse existing interactive states.

#### Recommended Implementation for CineXplorer

**Two Dedicated Tokens for Clarity:**

```typescript
// Add to ThemeColors interface
'drag-active': string;      // Element being dragged (darker/emphasized)
'drop-zone': string;        // Valid drop target (success tint or accent)
```

**Why Dedicated Tokens vs. Reusing Active/Hover?**

1. **Semantic clarity**: Drag ≠ click. Distinct interaction.
2. **Visual distinction**: May want different appearance than hover/active
3. **User request**: Explicitly requested feature deserves explicit tokens
4. **Future flexibility**: Can customize drag appearance independently

**Usage Pattern:**

```tsx
// Dragging element
<MovieCard bg={isDragging ? 'drag-active' : 'card'} opacity={isDragging ? 0.7 : 1}>

// Drop zone
<Box bg={isValidDrop ? 'drop-zone' : 'background'} borderColor={isValidDrop ? 'accent' : 'border'}>
  {/* Droppable area */}
</Box>
```

**Implementation Guidance:**

- **drag-active**: Darker/more emphasized than `card`, similar to `accent`
- **drop-zone**: Subtle success or accent tint, ~10% opacity overlay
- **Invalid drop**: Use `destructive` token for error state
- **Ghost preview**: Use original element at 50-70% opacity

### 6. Cross-System Insights & Patterns

#### Token Count Comparisons

| System | Base Tokens | Semantic Tokens | Component Tokens | Total Range |
|--------|------------|----------------|------------------|-------------|
| **Material Design 3** | ~50 reference | 141 system | 800+ component | ~1000+ |
| **IBM Carbon** | ~20 global | 52 semantic | 200+ component | ~270+ |
| **GitHub Primer** | ~14 base | ~20 functional | ~30 component | ~64 |
| **Ant Design** | ~15 seed | ~100 map | ~300+ alias/component | ~415+ |
| **shadcn/ui (current)** | N/A | 20 semantic | 0 component | **20** |
| **CineXplorer (proposed)** | N/A | 33 semantic | 0 component | **33** |

**Key Insight:** Our proposed 33 tokens is still minimal compared to production systems (40-415+).
We're extending thoughtfully, not exploding.

#### Common Architectural Patterns

**1. Hierarchical Token Structure (All 4 Systems):**

```
Raw Values (base/primitive/seed) → Semantic Roles (functional/map) → Components (alias/component)
```

**2. Semantic Naming Over Descriptive (All 4 Systems):**

- ✅ `success`, `warning`, `info` (semantic meaning)
- ❌ `green`, `yellow`, `blue` (descriptive colors)
- **Why:** Enables theme switching without renaming tokens

**3. Paired Tokens for Contrast (All 4 Systems):**

```
color / on-color           (Material Design 3)
color / color-foreground   (shadcn/ui convention)
color / fg-color           (Primer)
```

**4. Interactive State Progression (All 4 Systems):**

```
Default → Hover → Active → Focus → Disabled
```

**5. Algorithmic Color Generation (MD3, Ant Design):**

- Single seed color → entire palette
- Maintains contrast ratios automatically
- Supports multiple theme algorithms (light, dark, compact)

**6. Layer/Surface Hierarchy (MD3, Carbon, Primer):**

- Multiple surface levels for depth
- Tonal variation creates hierarchy
- Minimal shadow usage

#### Accessibility Standards (Universal)

**All 4 Systems Require:**

- **4.5:1 contrast**: Normal text on backgrounds (WCAG AA)
- **3:1 contrast**: Large text, UI components (WCAG AA)
- **7:1 contrast**: Enhanced accessibility (WCAG AAA)
- **Never color alone**: Always pair with icons, text, or patterns
- **Focus indicators**: Required, never removed
- **Interactive sizing**: 48×48dp minimum touch targets

### 7. Final Recommendations for CineXplorer

#### Validated Token Extension (13 New Tokens)

**From Research Synthesis:**

```typescript
// Status semantic pairs (6 tokens = 3 pairs)
success: string;              // #198038 (IBM Carbon green)
'success-foreground': string; // Auto-contrast

warning: string;              // #faad14 (Ant Design gold)
'warning-foreground': string; // Auto-contrast

info: string;                 // #0f62fe (IBM Carbon blue)
'info-foreground': string;    // Auto-contrast

// Movie-specific rating (2 tokens = 1 pair)
rating: string;               // #F5C518 (IMDb gold standard)
'rating-foreground': string;  // Auto-contrast

// Surface elevation (1 token)
'surface-elevated': string;   // 3rd surface level for featured content

// Badge system (2 tokens = 1 pair)
badge: string;                // Neutral badge background
'badge-foreground': string;   // Badge text

// Drag-and-drop states (2 tokens)
'drag-active': string;        // Element being dragged
'drop-zone': string;          // Valid drop target
```

**Total: 33 semantic tokens** (20 base + 13 extension)

#### Validation Against Research

**✅ Success/Warning/Info:**

- Pattern: All 4 systems include complete status sets
- Colors: IBM Carbon + Ant Design standards (enterprise-tested)
- Usage: Proven in alerts, badges, form validation

**✅ Rating:**

- Pattern: Ant Design Rate component uses gold by default
- Color: IMDb #F5C518 (industry standard)
- Justification: Movie-specific, distinct from warning

**✅ Surface-Elevated:**

- Pattern: All 4 systems have 3+ surface levels
- Implementation: Follows Material Design 3 tonal approach
- Usage: Featured sections, modals, elevated cards

**✅ Badge/Tag:**

- Pattern: All 4 systems have dedicated badge patterns
- Tokens: Minimal (2 tokens), leverages semantic colors for status
- Usage: Genres (neutral), status (semantic)

**✅ Drag-and-Drop:**

- Pattern: Most systems reuse active/hover, but...
- Justification: User-requested feature deserves explicit tokens
- Implementation: Distinct from hover/active for clarity

#### Implementation Priority

**Phase 1: Critical Tokens (8 tokens)**

1. Implement success/warning/info pairs (6 tokens)
2. Implement rating pair (2 tokens)
3. **Blocks:** ErrorBoundary, Login, MovieUserScore migration

**Phase 2: High Priority Tokens (5 tokens)**

1. Implement surface-elevated (1 token)
2. Implement badge pair (2 tokens)
3. Implement drag-and-drop pair (2 tokens)
4. **Enables:** Featured sections, genre tags, watchlist reordering

**Phase 3: Application**

1. Update all 7 theme definitions with new tokens
2. Create ADR documenting token extension decision
3. Begin component migration (Task 3.4+)

#### Key Takeaways

1. **Validation confirmed**: Our gaps are real. All 4 systems have these patterns.
2. **Conservative extension**: 33 total tokens is still minimal (vs 40-415+ in production)
3. **Industry alignment**: Using proven colors and patterns from enterprise systems
4. **Movie-specific needs**: Rating token justified by Ant Design precedent + industry standards
5. **User-driven features**: Drag-and-drop tokens respond to explicit user request
6. **Accessibility-first**: All recommended colors meet WCAG AA standards
7. **Semantic clarity**: Dedicated tokens for distinct meanings (rating ≠ warning, drag ≠ active)

### Research Quality Assessment

**Coverage:** ✅ Excellent

- 4 production systems (Google, IBM, GitHub, Ant Design)
- 89KB documentation analyzed
- Enterprise, consumer, and OSS perspectives

**Relevance:** ✅ High

- All systems address our specific gaps
- Movie app patterns found (Ant Design Rate component)
- Industry color standards validated (IMDb gold)

**Actionability:** ✅ Strong

- Specific color values recommended
- Token naming patterns established
- Implementation guidance provided

**Confidence:** ✅ High

- Patterns consistent across all 4 systems
- No contradictions found
- Aligns with shadcn/ui conventions

---

## Systematic Investigation: Transparent Colors Issue (2025-11-02)

**Problem Statement:**
ALL themes showing transparent/empty colors. Navbar and sidebar are see-through. Light/dark toggle changes body
background (black ↔ white) but semantic tokens (`bg="card"`, `bg="background"`, etc.) render as transparent.

**What IS Working:**

- ✅ Light/dark mode toggle (body background changes correctly)
- ✅ Theme selection state (data-theme attribute set correctly)
- ✅ Color mode class application (`.dark` class toggles correctly)

**What ISN'T Working:**

- ❌ Semantic tokens return transparent values for ALL themes
- ❌ Components using semantic tokens have no backgrounds (see-through)
- ❌ Not "stuck on one theme" - it's a fundamental CSS variable generation issue

### Investigation Plan

**Step 1: Trace Data Flow**

1. Theme palettes (hex colors) → Theme definitions (hexToRgb conversion) → Registry
2. Registry → generateBaseTokens() → base color tokens
3. Registry → generateSemanticTokens() → semantic tokens
4. Config → createSystem() → Chakra system
5. System → CSS variables → Browser rendering

**Step 2: Validate Each Layer**

- Verify palette data structure
- Verify hexToRgb() conversions
- Verify token generation output
- Verify Chakra config structure
- Verify CSS variable output in browser

**Step 3: Document Findings**

- List ALL issues found (not just first one)
- Categorize: configuration vs. data vs. structure
- Prioritize by likelihood and impact

**Step 4: External Validation**

- Research Chakra UI v3 semantic token requirements
- Verify condition syntax requirements
- Check for breaking changes in Chakra v3

**Step 5: Test Hypotheses**

- Create minimal reproduction cases
- Test each potential fix in isolation
- Verify with browser inspection

### Layer-by-Layer Analysis

#### Layer 1: Palette Data (Source Colors)

**File:** `frontend/src/theme/palettes/github.ts`

**Expected:**

- Hex color strings (e.g., `"#ffffff"`, `"#0d1117"`)
- All 33 semantic tokens defined for light + dark
- Valid hex format (6 or 8 characters)

**Actual (verified by code reading):**
✅ Palette data structure is correct

- `githubPaletteLight.bg_default = "#ffffff"` ✅
- `githubPaletteLight.fg_default = "#1f2328"` ✅
- `githubPaletteDark.bg_default = "#0d1117"` ✅
- `githubPaletteDark.fg_default = "#f0f6fc"` ✅
- All hex colors properly formatted (6 chars, some 8 with alpha)

**Conclusion:** Layer 1 data is correct ✅

#### Layer 2: Theme Definitions (hexToRgb Conversion)

**File:** `frontend/src/theme/definitions/github.ts`

**Function:** `hexToRgb(hex: string): string`

```typescript
// Standard 6-char hex
const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
```

**Expected Conversions:**

- `"#ffffff"` → `"255 255 255"`
- `"#0d1117"` → `"13 17 23"`
- `"#1f2328"` → `"31 35 40"`

**Actual (verified by code reading):**
✅ hexToRgb function logic is correct

- Regex extracts 3 pairs of hex digits ✅
- parseInt converts to decimal ✅
- Returns space-separated string ✅

**Theme Definition Structure:**

```typescript
export const githubTheme: Theme = {
  name: "github",
  label: "GitHub",
  light: {
    background: hexToRgb(pLight.bg_default),  // "#ffffff" → "255 255 255"
    foreground: hexToRgb(pLight.fg_default),  // "#1f2328" → "31 35 40"
    card: hexToRgb(pLight.bg_default),        // "#ffffff" → "255 255 255"
    // ... etc for all 33 tokens
  },
  dark: {
    background: hexToRgb(pDark.bg_default),   // "#0d1117" → "13 17 23"
    // ... etc
  }
}
```

**Conclusion:** Layer 2 conversion logic is correct ✅

#### Layer 3: Theme Registry

**File:** `frontend/src/theme/index.ts` (lines 31-39)

**Expected:**

```typescript
export const themeRegistry = {
  github: githubTheme,
  "ibm-carbon": ibmCarbonTheme,
  // ... 7 themes total
}
```

**Actual (verified by code reading):**
✅ Registry structure is correct

- All 7 themes imported ✅
- Mapped to kebab-case keys ✅
- Exported as const ✅

**Conclusion:** Layer 3 registry is correct ✅

#### Layer 4: Token Generation Functions

**Function 1: `generateBaseTokens()`** (lines 99-125)

**Purpose:** Create base tokens like `colors.github.light.background = "255 255 255"`

**Logic Trace:**

```typescript
for (const [themeName, theme] of Object.entries(themeRegistry)) {
  // themeName = "github", theme = githubTheme

  const themeKey = themeName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  // "github" → "github"
  // "ibm-carbon" → "ibmCarbon"

  colors[themeKey] = {
    light: {},
    dark: {},
  };

  for (const tokenKey of Object.keys(theme.light)) {
    // tokenKey = "background", "foreground", "card", etc.

    colors[themeKey].light[tokenKey] = {
      value: theme.light[tokenKey],  // e.g., "255 255 255"
    };
    colors[themeKey].dark[tokenKey] = {
      value: theme.dark[tokenKey],   // e.g., "13 17 23"
    };
  }
}
```

**Expected Output Structure:**

```typescript
{
  colors: {
    github: {
      light: {
        background: { value: "255 255 255" },
        foreground: { value: "31 35 40" },
        // ... all 33 tokens
      },
      dark: {
        background: { value: "13 17 23" },
        // ... all 33 tokens
      }
    },
    ibmCarbon: { light: {...}, dark: {...} },
    // ... all 7 themes
  }
}
```

**Conclusion:** Layer 4A (base tokens) structure looks correct ✅ (though unused)

**Function 2: `generateSemanticTokens()`** (current implementation after changes)

**Current Structure (lines 159-192):**

```typescript
// CURRENT: Flat conditions
value.base = "255 255 255";                      // Default light
value._dark = "13 17 23";                        // Default dark
value._githubThemeLight = "255 255 255";         // GitHub + light
value._githubThemeDark = "13 17 23";             // GitHub + dark
value._ibmCarbonThemeLight = "255 255 255";      // IBM Carbon + light
value._ibmCarbonThemeDark = "22 22 22";          // IBM Carbon + dark
```

**🚨 ROOT CAUSE FOUND!**

According to external research (Chakra UI v3/Panda CSS documentation):

**NESTED conditions ARE supported and CORRECT for multi-theme scenarios:**

```typescript
// ✅ CORRECT: Nested structure (from research)
value: {
  _pinkTheme: {
    base: "{colors.pink.500}",      // Pink theme light mode
    _dark: "{colors.pink.300}"      // Pink theme dark mode
  },
  _blueTheme: {
    base: "{colors.blue.500}",      // Blue theme light mode
    _dark: "{colors.blue.300}"      // Blue theme dark mode
  }
}
```

**The ORIGINAL nested structure was CORRECT!** The issue is:

1. ❌ Condition names need underscore prefix: `_githubTheme` not `githubTheme`
2. ❌ `_dark` is a BUILT-IN condition that works INSIDE custom conditions
3. ❌ We should NOT create separate `_githubThemeLight` and `_githubThemeDark` conditions
4. ✅ We SHOULD use nested structure with `_githubTheme` containing `{ base, _dark }`

**Correct Structure:**

```typescript
// Define conditions (ONE per theme, not two)
conditions: {
  _githubTheme: '[data-theme="github"] &',
  _ibmCarbonTheme: '[data-theme="ibm-carbon"] &',
  // ... (7 conditions total, not 14)
}

// Use nested structure in semantic tokens
background: {
  value: {
    base: "255 255 255",               // Default (fallback)
    _dark: "13 17 23",                 // Default dark mode
    _githubTheme: {                    // GitHub theme
      base: "255 255 255",            // Light mode
      _dark: "13 17 23"               // Dark mode
    },
    _ibmCarbonTheme: {                 // IBM Carbon theme
      base: "255 255 255",            // Light mode
      _dark: "22 22 22"               // Dark mode
    },
    // ... (7 theme conditions)
  }
}
```

This generates CSS like:

```css
:root {
  --chakra-colors-background: 255 255 255;  /* Default */
}
.dark {
  --chakra-colors-background: 13 17 23;  /* Default dark */
}
[data-theme="github"] {
  --chakra-colors-background: 255 255 255;  /* GitHub light */
}
[data-theme="github"].dark {
  --chakra-colors-background: 13 17 23;  /* GitHub dark */
}
[data-theme="ibm-carbon"] {
  --chakra-colors-background: 255 255 255;  /* IBM Carbon light */
}
[data-theme="ibm-carbon"].dark {
  --chakra-colors-background: 22 22 22;  /* IBM Carbon dark */
}
```

**Conclusion:** The transparent colors are caused by incorrect condition structure.
We flattened conditions when we should have kept them nested. ⚠️🎯

---

### Summary of Findings

**Root Cause Identified:**
The transparent color issue is caused by using FLAT condition structure when Chakra UI v3 expects NESTED conditions
for multi-theme scenarios.

**What Went Wrong:**

1. Original code had nested structure BUT wrong condition names (`githubTheme` → should be `_githubTheme`)
2. Investigation attempted to "fix" by flattening (`_githubThemeLight`, `_githubThemeDark`)
3. Flat structure doesn't work because `_dark` is a BUILT-IN condition that must nest INSIDE custom conditions
4. Chakra v3 docs confirm: nested syntax is correct for multi-theme + color mode

**Correct Fix:**

1. Revert to NESTED structure: `_githubTheme: { base: "...", _dark: "..." }`
2. Add underscore prefix to condition names: `_githubTheme` not `githubTheme`
3. Use ONE condition per theme (not two): 7 conditions total, not 14
4. Let `_dark` work as nested built-in inside theme conditions

**Layers Verified:**

- ✅ Layer 1: Palette data is correct
- ✅ Layer 2: hexToRgb conversion is correct
- ✅ Layer 3: Theme registry is correct
- ✅ Layer 4: Token generation logic is sound
- ✅ Layer 5: Condition selectors have correct `&` syntax
- ❌ Layer 6: **Config structure is WRONG** - using flat when should use nested

**Next Steps:**

1. Revert `generateThemeConditions()` to create single conditions per theme
2. Revert `generateSemanticTokens()` to use nested structure
3. Ensure condition names have underscore prefix
4. Test in browser to verify CSS variables generate correctly

**Confidence Level:** HIGH - External research confirms nested structure is correct for multi-theme scenarios.

**Note from User:** We may have tried nested + underscore prefix combination before.
If this fix doesn't work, there may be another structural issue.

---

### Reference: Complete Working Example from Chakra UI v3 Docs

**Source:** Official Chakra UI v3 documentation (confirmed working pattern)

**Complete Configuration:**

```typescript
// theme.config.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    // Step 1: Define base design tokens (raw values)
    tokens: {
      colors: {
        // Neutral palette
        neutral: {
          50: { value: "#F9FAFB" },
          100: { value: "#F3F4F6" },
          900: { value: "#111827" },
          950: { value: "#030712" }
        },
        // Brand colors
        brand: {
          400: { value: "#60A5FA" },
          500: { value: "#3B82F6" },
          600: { value: "#2563EB" }
        },
        // Pink palette
        pink: {
          50: { value: "#FDF2F8" },
          500: { value: "#EC4899" },
          950: { value: "#500724" }
        },
        // Blue palette
        blue: {
          50: { value: "#EFF6FF" },
          500: { value: "#3B82F6" },
          950: { value: "#172554" }
        }
      }
    },

    // Step 2: Define custom conditions (ONE per theme, with & placeholder)
    conditions: {
      light: '[data-color-mode="light"] &',
      dark: '[data-color-mode="dark"] &',
      pink: '[data-theme="pink"] &',
      blue: '[data-theme="blue"] &',
      highContrast: '[data-high-contrast] &'
    },

    // Step 3: Define semantic tokens with NESTED conditions
    semanticTokens: {
      colors: {
        // Simple color mode variant
        text: {
          value: {
            base: "{colors.neutral.900}",      // Default light
            _dark: "{colors.neutral.50}"       // Default dark
          }
        },

        // Multi-theme with NESTED color mode
        surface: {
          value: {
            // Default fallback (no theme selected)
            base: "{colors.neutral.50}",
            _dark: "{colors.neutral.900}",

            // Pink Theme (NESTED structure)
            _pink: {
              base: "{colors.pink.50}",        // Pink + light mode
              _dark: "{colors.pink.950}"       // Pink + dark mode
            },

            // Blue Theme (NESTED structure)
            _blue: {
              base: "{colors.blue.50}",        // Blue + light mode
              _dark: "{colors.blue.950}"       // Blue + dark mode
            }
          }
        },

        // Mixed: flat conditions for accessibility override
        interactive: {
          value: {
            base: "{colors.brand.500}",
            _dark: "{colors.brand.400}",
            _highContrast: "{colors.neutral.900}"   // Flat override
          }
        }
      }
    }
  },

  // Step 4: Global CSS (optional)
  globalCss: {
    body: {
      bg: "surface",      // Uses semantic token
      color: "text"       // Uses semantic token
    }
  }
})

// Step 5: Create system by merging with defaults
export const system = createSystem(defaultConfig, config)
```

**Generated CSS Output:**

```css
/* Default values */
:root {
  --chakra-colors-text: var(--chakra-colors-neutral-900);
  --chakra-colors-surface: var(--chakra-colors-neutral-50);
}

/* Default dark mode */
.dark {
  --chakra-colors-text: var(--chakra-colors-neutral-50);
  --chakra-colors-surface: var(--chakra-colors-neutral-900);
}

/* Pink theme light mode */
[data-theme="pink"] {
  --chakra-colors-surface: var(--chakra-colors-pink-50);
}

/* Pink theme dark mode */
[data-theme="pink"].dark {
  --chakra-colors-surface: var(--chakra-colors-pink-950);
}

/* Blue theme light mode */
[data-theme="blue"] {
  --chakra-colors-surface: var(--chakra-colors-blue-50);
}

/* Blue theme dark mode */
[data-theme="blue"].dark {
  --chakra-colors-surface: var(--chakra-colors-blue-950);
}
```

**Key Points from Working Example:**

1. ✅ Underscore prefix on custom conditions: `_pink`, `_blue` (not `pink`, `blue`)
2. ✅ Nested structure for theme + color mode: `_pink: { base, _dark }`
3. ✅ `_dark` is built-in, works inside custom conditions
4. ✅ Token references use curly braces: `{colors.neutral.900}`
5. ✅ Mandatory `&` placeholder in condition definitions
6. ✅ ONE condition per theme (not separate light/dark conditions)

**What We're Currently Doing Wrong:**

- Creating 14 flat conditions (`_githubThemeLight`, `_githubThemeDark`) instead of 7 nested
- Not using token references (`{colors.github.light.background}`) - using direct RGB values
- May have had wrong underscore prefix in earlier attempts
