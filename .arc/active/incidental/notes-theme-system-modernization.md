# Implementation Notes: Theme System Modernization

**Task List:** `.arc/active/incidental/tasks-theme-system-modernization.md`

---

## Document Status

**Phase 1-3 Complete:** All research, audits, and implementation for Phases 1-3 are complete. Findings have been:

- Consolidated into ADRs (ADR-009, ADR-010, ADR-011, ADR-012)
- Documented in strategy files (strategy-semantic-tokens.md, strategy-button-patterns.md)
- Archived in research reference (design-systems-token-patterns.md)

**Phase 4-9 Status:** Phases 4-9 work is documented in task list. This notes file serves as scratchpad for active work only.

**Current Active Work:** Research consolidation and PR preparation (Chunk 1-3 cleanup)

---

## Phase 7: Component Inventory & Audit Findings

### Component Catalog by Domain

**Total Components:** 60 (excluding tests, hooks, ThemeDebug sections, entry points, Chakra wrappers)

---

#### Domain 1: Layout & Navigation (15 components)

**Navigation:**

- `components/layout/NavBar.tsx`
- `components/layout/NavBarSearch.tsx`
- `components/layout/NavBarUserMenu.tsx`
- `components/layout/MobileMenuButton.tsx`

**Layout Containers:**

- `components/layout/BaseLayout.tsx`
- `components/layout/AppLayout.tsx`
- `components/layout/AuthLayout.tsx`
- `components/layout/LoadingLayout.tsx`

**Sidebar:**

- `components/layout/Sidebar.tsx`
- `components/layout/SidebarContent.tsx`
- `components/layout/SidebarDrawer.tsx`
- `components/layout/sidebarOverlay.tsx`

**Utilities:**

- `components/layout/Footer.tsx`
- `components/layout/LoadingContent.tsx`
- `components/layout/PaginationCtrl.tsx`

---

#### Domain 2: Movie Discovery (16 components)

**Movie Cards:**

- `components/movie/MovieCard.tsx`
- `components/movie/MovieCardContainer.tsx`
- `components/movie/MovieUserScore.tsx`

**Collection Views:**

- `components/movie/collection/MovieCollectionLayout.tsx`
- `components/movie/collection/MovieCollectionGrid.tsx`
- `components/movie/collection/MovieGrid.tsx`
- `components/movie/collection/PageHeader.tsx`
- `components/movie/collection/FilterSection.tsx`

**Movie Pages:**

- `pages/movie/MovieDetail.tsx`
- `pages/movie/Featured.tsx`
- `pages/movie/Popular.tsx`
- `pages/movie/TopRated.tsx`
- `pages/movie/NowPlaying.tsx`
- `pages/movie/Upcoming.tsx`
- `pages/movie/SearchResults.tsx`

**Person Pages:**

- `pages/person/PersonDetail.tsx`

---

#### Domain 3: Movie Filters (11 components)

**Filter Components:**

- `components/movie/filters/AdvancedMovieFilters.tsx`
- `components/movie/filters/SearchBar.tsx`
- `components/movie/filters/ConnectedDropdowns.tsx`
- `components/movie/filters/SortDropdownMinimal.tsx`
- `components/movie/filters/SortSelector.tsx`
- `components/movie/filters/GenreSelector.tsx`
- `components/movie/filters/YearSelector.tsx`
- `components/movie/filters/RatingSelector.tsx`
- `components/movie/filters/ClearFiltersButton.tsx`
- `components/movie/filters/CollapsibleSearchBox.tsx`
- `components/movie/filters/LetterboxdStyleFilters.tsx`

---

#### Domain 4: Shared/Common (18 components)

**Error Handling:**

- `components/ErrorBoundary.tsx`

**Theme:**

- `components/ThemeSelector.tsx`

**Authentication:**

- `components/auth/ProtectedRoute.tsx`
- `components/auth/AuthContextProvider.tsx`

**User Components:**

- `components/user/UserProfile.tsx`

**User Pages:**

- `pages/user/Login.tsx`
- `pages/user/Register.tsx`
- `pages/user/Profile.tsx`
- `pages/user/Settings.tsx`
- `pages/user/VerifyEmail.tsx`
- `pages/user/TestLogin.tsx`
- `pages/user/Watchlist.tsx`

**Dev Tools:**

- `pages/dev/LayoutDebug.tsx`
- `pages/dev/TypographyDebug.tsx`

**Assets:**

- `assets/GoogleLogo.tsx`
- `assets/GitHubLogo.tsx`

---

#### Excluded from Audit

**Test Files:** All `__tests__/` directories (29 test files)

**ThemeDebug:** `pages/dev/theme-debug/ThemeDebug.tsx` + 10 section components (already verified compliant)

**Hooks:** `useMovieCollectionUrl.tsx`, `useMovieCollectionState.tsx` (logic only, no UI)

**Entry Points:** `main.tsx`, `App.tsx` (initialization, not domain-specific UI)

**Chakra Wrappers:** `components/chakra/` (4 files - theme-provider, provider, toaster, tooltip, color-mode)

---

### Per-Domain Audit Checklist

**13 Patterns × 4 Domains = 52 Total Checks**

#### Domain 1: Layout & Navigation (Task 7.1.b)

- [ ] Pattern 1: Buttons
- [ ] Pattern 2: Form controls
- [ ] Pattern 3: Links
- [ ] Pattern 4: Surfaces/containers
- [ ] Pattern 5: Borders
- [ ] Pattern 6: Status/feedback
- [ ] Pattern 7: Text hierarchy
- [ ] Pattern 8: Z-index
- [ ] Pattern 9: Layout structure
- [ ] Pattern 10: Hard-coded colors
- [ ] Pattern 11: Deprecated aliases
- [ ] Pattern 12: Responsive patterns
- [ ] Pattern 13: Gap analysis

#### Domain 2: Movie Discovery (Task 7.1.c)

- [ ] Pattern 1: Buttons
- [ ] Pattern 2: Form controls
- [ ] Pattern 3: Links
- [ ] Pattern 4: Surfaces/containers
- [ ] Pattern 5: Borders
- [ ] Pattern 6: Status/feedback
- [ ] Pattern 7: Text hierarchy
- [ ] Pattern 8: Z-index
- [ ] Pattern 9: Layout structure
- [ ] Pattern 10: Hard-coded colors
- [ ] Pattern 11: Deprecated aliases
- [ ] Pattern 12: Responsive patterns
- [ ] Pattern 13: Gap analysis

#### Domain 3: Movie Filters (Task 7.1.d)

- [ ] Pattern 1: Buttons
- [ ] Pattern 2: Form controls
- [ ] Pattern 3: Links
- [ ] Pattern 4: Surfaces/containers
- [ ] Pattern 5: Borders
- [ ] Pattern 6: Status/feedback
- [ ] Pattern 7: Text hierarchy
- [ ] Pattern 8: Z-index
- [ ] Pattern 9: Layout structure
- [ ] Pattern 10: Hard-coded colors
- [ ] Pattern 11: Deprecated aliases
- [ ] Pattern 12: Responsive patterns
- [ ] Pattern 13: Gap analysis

#### Domain 4: Shared/Common (Task 7.1.e)

- [ ] Pattern 1: Buttons
- [ ] Pattern 2: Form controls
- [ ] Pattern 3: Links
- [ ] Pattern 4: Surfaces/containers
- [ ] Pattern 5: Borders
- [ ] Pattern 6: Status/feedback
- [ ] Pattern 7: Text hierarchy
- [ ] Pattern 8: Z-index
- [ ] Pattern 9: Layout structure
- [ ] Pattern 10: Hard-coded colors
- [ ] Pattern 11: Deprecated aliases
- [ ] Pattern 12: Responsive patterns
- [ ] Pattern 13: Gap analysis

---

### Audit Findings by Domain

**Instructions:** During Tasks 7.1.b-e, document violations found for each domain under these headers.

#### Layout & Navigation Domain Audit (Task 7.1.b)

{ Violations and notes will be added here }

#### Movie Discovery Domain Audit (Task 7.1.c)

{ Violations and notes will be added here }

#### Movie Filters Domain Audit (Task 7.1.d)

{ Violations and notes will be added here }

#### Shared/Common Domain Audit (Task 7.1.e)

{ Violations and notes will be added here }

#### Cross-Domain Gap Analysis (Task 7.1.f)

{ Systemic gaps and token addition proposals will be added here }
