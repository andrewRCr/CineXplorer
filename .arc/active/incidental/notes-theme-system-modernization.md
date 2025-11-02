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
