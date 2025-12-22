# Completed Atomic Tasks - 2025 Q4

Permanent record of completed atomic tasks. New entries are added at the top (reverse chronological).

Reference format: "see `completed-atomic-2025-q4.md`" or "see {task name} in `completed-atomic-2025-q4.md`"

---

- [x] Backend: Investigate and fix flaky registration email tests
    - **Root Cause:** Allauth's email verification rate limiting persists in Redis between test runs.
      Rate limit is `1/180s/key` (1 email per 3 minutes per email address). When tests run multiple
      times, the rate limit blocks subsequent email sends, causing `send_verification_email_to_address()`
      to return False and triggering our "Verification email could not be sent" error.
    - **Fix:** Added `ACCOUNT_RATE_LIMITS = {"confirm_email": ""}` to `settings_test.py` to disable
      the confirm_email rate limit in test environment.
    - **Verified:** All 175 authentication tests pass. Ran flaky tests 5x consecutively - all passed.

    - **Branch:** `technical/toast-notification-system`

- [x] Backend: Fix email verification template rendering as plaintext
    - **Outcome:** Root cause was `django-zoho-zeptomail` v0.0.3 bug - it concatenates plaintext+HTML
      into single `htmlbody` field instead of setting `textbody` and `htmlbody` separately.
      Created `FixedZohoZeptoMailEmailBackend` with lazy imports to avoid test side effects.
    - **Files:** `apps/core/email_backend.py` (new), `config/settings.py`
    - **Note:** 3 registration email tests are flaky (pre-existing issue, not caused by this change)

    - **Branch:** `technical/toast-notification-system`

- [x] Backend: Return user email in "email not verified" error response
    - **Outcome:** Added `_mask_email()` static method to AuthenticationService, returns masked email
      (e.g., `t***@example.com`) in 403 response. Updated unit and integration tests.
    - **Files:** `authentication_service.py`, `test_authentication_service_tokens.py`, `test_error_responses.py`

    - **Branch:** `technical/toast-notification-system`

- [x] Evaluate toast positioning strategy (priority-based placement)
    - **Outcome:** Two toaster instances implemented with distinct positions
    - `toaster` (bottom-right): Routine feedback (movie actions, general operations)
    - `priorityToaster` (top-right): Auth success, important confirmations
    - **Documented in:** `strategy-component-styling.md` (Toast positioning section)
    - **Files:** `frontend/src/components/core/chakra/toaster.tsx`

    - **Branch:** `technical/toast-notification-system`

- [x] Auth flow refactor: architecture, error handling patterns, and accessibility
    - **Scope note:** This task expanded well beyond atomic scope (6 phases, 20+ subtasks). In
      retrospect, should have been its own incidental task list with dedicated branch. Lesson
      learned: when an "atomic" task develops multiple phases, extract to proper task list early.
    - **Outcome:** Complete auth flow overhaul with WCAG-compliant error handling, email/password
      reset modals, component extraction (AuthFormCard, FormField, EmailVerificationDialog,
      PasswordResetDialog), and proper toast/alert separation.
    - **Key changes:**
        - Hooks return data only; components control presentation (toast ownership)
        - Auth errors → persistent FloatingAlerts; success → ephemeral toasts
        - Email verification consolidated to `/login?verify=TOKEN` modal pattern
        - Password reset flow added with `/login?reset=KEY` modal pattern
        - Extracted reusable auth components to `components/auth/`
        - Removed redundant button styling (uses default solid variant)
    - **Files:** `useAuth.ts`, `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `useOAuthFlow.ts`,
      `authService.ts`, `adapters.py`, `settings.py`, `toaster.tsx`, `FloatingAlert.tsx`,
      `AuthFormCard.tsx`, `FormField.tsx`, `EmailVerificationDialog.tsx`, `PasswordResetDialog.tsx`,
      `routes.ts`, `App.tsx` (VerifyEmail.tsx deleted)

    - **Branch:** `technical/toast-notification-system`

- [x] Fix email test coverage gaps
    - **Outcome:** Added 8 new tests covering registration email flow, EmailDeliveryError, and template rendering
    - **Tests added:**
        1. Registration sends verification email to outbox (3 tests: basic, link content, username)
        2. EmailDeliveryError raised when send fails (2 tests: failure raises, success passes)
        3. Template rendering smoke tests (3 tests: confirmation templates, subject, password reset templates exist)
    - **Note:** Password reset API endpoint not yet implemented; added template existence test for future
    - **Files:** `apps/authentication/tests/integration/test_email_backend.py`

    - **Branch:** `technical/toast-notification-system`

- [x] Audit mock_paths.py compliance across test codebase
    - **Outcome:** All hardcoded mock paths migrated to centralized mock_paths.py files
    - **Changes:**
        - `authentication/tests/mock_paths.py`: Added `AUTH_SERVICE_SEND_VERIFICATION_EMAIL`,
          `AUTH_SERVICE_TRANSACTION_ATOMIC`; removed stale `AUTH_SERVICE_EMAIL_ADD`
        - `core/tests/mock_paths.py`: Added `WAIT_FOR_DB_CONNECTIONS`
        - `movie/tests/mock_paths.py`: Added `BATCH_LOGGER`
        - Updated 4 test files to use centralized paths
    - **Files:** `backend/apps/*/tests/mock_paths.py`, `test_authentication_service_registration.py`,
      `test_api_coverage.py`, `test_commands.py`, `test_batch_operations.py`

    - **Branch:** `technical/toast-notification-system`

- [x] Restore email template styling (visual regression)
    - **Outcome:** Created custom TXT email template to match HTML branding
    - **Root cause:** TXT template was missing, falling back to allauth default with
      "Hello from {{ site_name }}!" pattern; django-zoho-zeptomail concatenates both bodies
    - **Files:** `backend/templates/account/email/email_confirmation_message.txt` (new)

    - **Branch:** `technical/toast-notification-system`

- [x] DRY browse select trigger and value styling
    - **Outcome:**
        - Extracted shared browse select trigger styles to a helper module.
        - Consolidated ConnectedDropdowns value text styling logic.
        - Dropped redundant Select.Content styling where recipe already applies defaults.
        - Frontend lint passes.
    - **Files:** `frontend/src/components/movie/browse/selectStyles.ts`,
      `frontend/src/components/movie/browse/ConnectedDropdowns.tsx`,
      `frontend/src/components/movie/browse/SortDropdown.tsx`

    - **Branch:** `technical/service-layer-modernization`

- [x] Unify select open-state selection indicators and migrate ConnectedDropdowns styling
    - **Outcome:**
        - Language select now treats "All Languages" as a selectable value for open-menu highlighting while
          keeping closed-state text in foreground when no filter is active.
        - Sort and connected dropdowns rely on Select recipe checked/highlighted states for active item styling.
        - ConnectedDropdowns trigger text styles moved to Select.ValueText to preserve custom disabled/custom displays.
        - Frontend lint passes.
    - **Files:** `frontend/src/components/movie/browse/AdvancedFiltersPanel.tsx`,
      `frontend/src/components/movie/browse/ConnectedDropdowns.tsx`,
      `frontend/src/components/movie/browse/SortDropdown.tsx`

    - **Branch:** `technical/service-layer-modernization`

- [x] Fix language Select placeholder state and align SortDropdown item styling
    - **Outcome:**
        - Language Select now treats empty value as placeholder so "All Languages" renders in foreground.
        - SortDropdown items rely on Select recipe checked/highlighted states (no behavior change).
        - Frontend lint passes.
    - **Files:** `frontend/src/components/movie/browse/AdvancedFiltersPanel.tsx`,
      `frontend/src/components/movie/browse/SortDropdown.tsx`

    - **Branch:** `technical/service-layer-modernization`

- [x] Implement Select recipe/data-attribute styling for AdvancedFiltersPanel
    - **Outcome:**
        - Added `_checked` and `_highlighted` states to Select item recipe for consistent selected/hover styling.
        - Replaced conditional language value styling with `_placeholderShown` trigger state and recipe-driven item styles.
        - Kept indicator color neutral while selected value uses primary.
    - **Files:** `frontend/src/theme/recipes/select.ts`, `frontend/src/components/movie/browse/AdvancedFiltersPanel.tsx`

    - **Branch:** `technical/service-layer-modernization`

- [x] Investigate Chakra v3 Select native styling for selected state
    - **Outcome:**
        - Verified Ark/Chakra Select emits `data-state="checked"` + `data-highlighted` on items and
          `data-placeholder-shown` on the trigger (from `@zag-js/select`).
        - Chakra conditionals map `_checked` → `[data-state=checked]`, `_highlighted` → `[data-highlighted]`,
          `_placeholderShown` → `[data-placeholder-shown]`.
        - Selected/placeholder styling can be recipe-driven (no runtime `isSelected` or manual `css`),
          aligning with component styling strategy. Use `_checked` on `Select.Item` and `_placeholderShown`
          on `Select.Trigger` (or a `data-part="valueText"` selector) when revisiting.
    - **Files:** `.arc/active/ATOMIC-TASKS.md`

    - **Branch:** `technical/service-layer-modernization`

- [x] Add unit tests for API infrastructure modules to meet 80% coverage target
    - **Outcome:**
        - Refactored: Extracted `_safe_headers_dict()` helper to BaseApiClient (DRY - 6 occurrences)
        - Refactored: Created `RATE_LIMIT_HEADER_MAPPING` constant in api_response.py (DRY)
        - Created `mock_paths.py` for core tests (consistency with movie/auth/user_movie_data patterns)
        - Created 123 new unit tests across 3 test files
        - Coverage results:
            - `api_response.py`: 36.84% → 96.84% ✓
            - `base_api_client.py`: 49.04% → 99.04% ✓
            - `tmdb_api_client.py`: 37.65% → 76.51% (remaining gap is DEBUG logging, excluded per scope)
        - Overall project coverage: 85.98% → 92.66%
        - All 788 tests pass
    - **Files:**
        - `backend/apps/core/tests/unit/test_api_response.py` (new)
        - `backend/apps/core/tests/unit/test_base_api_client.py` (new)
        - `backend/apps/core/tests/unit/test_tmdb_api_client.py` (new)
        - `backend/apps/core/tests/mock_paths.py` (new)
        - `backend/apps/core/services/api_response.py` (refactored)
        - `backend/apps/core/services/base_api_client.py` (refactored)
        - `backend/apps/core/services/tmdb_api_client.py` (refactored)

    - **Branch:** `technical/service-layer-modernization`

- [x] Rename frontend console log file for clarity
    - **Outcome:** Moved frontend log capture to `backend/logs/frontend.log`, updated docs/endpoint
      references, removed legacy log file, and regenerated OpenAPI-derived types.
    - **Files:** `backend/apps/core/api.py`, `frontend/src/services/logger.ts`,
      `.arc/reference/QUICK-REFERENCE.md`, `.arc/reference/agent/CLAUDE.md`,
      `frontend/openapi.json`, `frontend/src/types/api.ts`,
      `.arc/active/incidental/temp-notes-console-log-capture.md`,
      `backend/logs/README.md` (ignored path)

    - **Branch:** `technical/service-layer-modernization`

- [x] Investigate console.log capture to frontend log file
    - **Outcome:** Added dev-only console interception to forward raw `console.*` output to
      `/api/dev-logs/write/` with safe serialization and logger prefix guard.
    - **Files:** `frontend/src/services/consoleCapture.ts`, `frontend/src/main.tsx`

    - **Branch:** `technical/service-layer-modernization`

- [x] Refactor Movie Collection URL/State Hooks for Clarity and Separation of Concerns
    - **Outcome:** Extracted utilities, clarified terminology, fixed bugs, simplified structure
    - **New files created:**
        - `frontend/src/utilities/deepEqual.ts` - generic deep equality comparison
        - `frontend/src/utilities/advancedPanelOverride.ts` - sessionStorage panel tracking
    - **Functions moved/created:**
        - `hasAdvancedFilterValues` → `browseParamUtils.ts`
        - `generateBrowseUrl` → `browseUrlSync.ts` (new)
    - **Bugs fixed:**
        - R.7: Language sort reset effect now respects `enableUrlSync` flag
    - **Code size reduction:** ~100 lines extracted from hooks to reusable utilities
    - **Tests:** 722 frontend tests passing

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Auto-generate error codes from backend Pydantic Enum → OpenAPI → TypeScript
    - **Outcome:** Error codes now auto-generated from backend Pydantic StrEnum → OpenAPI → TypeScript
    - **Changes:**
        - Added `ErrorCode` and `ErrorCategory` StrEnums to `backend/apps/core/schemas.py`
        - Added `ApiErrorSchema` Pydantic model to expose enums in OpenAPI
        - Added `/api/error-codes/` endpoint to expose error codes with categories
        - Created `frontend/src/@types/errors.d.ts` with type-safe `ERROR_CODES` constant
        - Updated `Login.tsx` to import from new location (`@/@types/errors`)
        - Deleted `shared/` directory (frontend) and `backend/shared/` directory entirely
    - **Benefits achieved:**
        - Single source of truth: backend Pydantic StrEnum
        - Automatic sync: `npm run generate-types` updates TypeScript types
        - Type-safe: `ERROR_CODES` satisfies `Record<string, ErrorCode>`
        - Zero manual maintenance: shared directory eliminated

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Remove `@shared/api-types.ts` and migrate to OpenAPI-generated types
    - **Outcome:** Migrated 3 files from `@shared` movie types to `@/types/movie` (OpenAPI-generated)
    - **Changes:**
        - `useMovieDetail.ts`: Uses `MovieDetail` type from `@/types/movie`
        - `MovieDetail.tsx`: Uses `MovieDetailType`, `Genre`, etc. from `@/types/movie`; added null
          checks for stricter OpenAPI types (`job`, `vote_average`)
        - `MovieDetail.test.tsx`: Uses `createMockMovieDetail` and `MovieDetailType`
        - Deleted `shared/api-types.ts` (shared/ directory now fully eliminated)

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] DRY refactor: Extract year filter analysis utility
    - **Outcome:** Centralized all year filter logic into `yearFilterAnalysis.ts` utility. Provides:
      `analyzeYearFilter()` for full analysis (isEmpty, isSingleValue, isSameYear, isDecadeRange,
      isInPresets, displayValue, displayLabel), plus convenience helpers `isYearFilterCustom()` and
      `isYearFilterAdvanced()`. Updated ConnectedDropdowns and useMovieCollectionState to use utility.
    - **Files:**
        - New: `frontend/src/utilities/yearFilterAnalysis.ts`
        - Updated: `frontend/src/components/movie/browse/ConnectedDropdowns.tsx`
        - Updated: `frontend/src/hooks/movie/useMovieCollectionState.ts`

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Fix QuickBrowseBar year select state for non-preset year values
    - **Outcome:** Fixed year select showing enabled state for out-of-preset values. Now correctly
      treats: (1) out-of-preset decades (e.g., 1940's), (2) single-value filters (only minYear or
      maxYear set), and (3) arbitrary ranges as custom values - showing actual value (e.g., "1940's")
      in italic/disabled style. Also fixed `hasActiveAdvancedFilters` detection for these cases.
    - **Files:** `frontend/src/components/movie/browse/ConnectedDropdowns.tsx`,
      `frontend/src/hooks/movie/useMovieCollectionState.ts`

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Fix empty state message hidden behind advanced filters drawer
    - **Outcome:** Changed drawer from overlay to push-down behavior. Added 200px extra top padding
      to content container when advanced panel is open, with smooth 220ms CSS transition for open/close.
      Content now pushes down when drawer opens, keeping empty state and grid content visible.
    - **Files:** `frontend/src/components/movie/collection/MovieCollectionLayout.tsx`

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Create `strategy-pagination.md` - Document pagination architecture
    - **Outcome:** Comprehensive strategy doc covering buffer mechanism, deduplication tracker,
      cursor-based pagination, frontend integration, and Content Pool Depletion concept
    - **Files:** `.arc/reference/strategies/project/strategy-pagination.md`, STRATEGY-INDEX.md updated

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Create `strategy-data-quality.md` - Document TMDB data quality mechanisms
    - **Outcome:** Comprehensive strategy doc covering two-pass filtering, 5-stage pipeline,
      VoteCountPolicy, CompletenessPolicy, TMDB quirks, and rejection rate data
    - **Files:** `.arc/reference/strategies/project/strategy-data-quality.md`, STRATEGY-INDEX.md updated

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Redesign AdvancedFiltersPanel as compact drawer
    - **Outcome:** Converted full-height panel to compact drawer attached to sticky CollapsibleSubNav
    - **Key changes:**
        - Part A: QuickBrowseBar cleanup (ClearFilters button inline, bg consistency, placeholder)
        - Part B: Compact 3-row drawer layout with GenrePopover component
        - Toggle button shows primary color when advanced filters active (even if panel closed)
        - Deleted unused GenreCombobox.tsx (superseded by GenrePopover)
    - **Tests:** 23 new GenrePopover tests, 746 frontend tests passing
    - **Files:**
        - New: `GenrePopover.tsx`, `GenrePopover.test.tsx`
        - Updated: `AdvancedFiltersPanel.tsx`, `CertificationFilter.tsx`, `CollapsibleSubNav.tsx`, `BrowseControlsSection.tsx`

    - **Branch:** `incidental/infinite-scroll-migration`

- [x] Search/Browse Architecture Cleanup (3 tasks)
    - **Outcome:** Fixed search backward navigation bug and cleaned up architecture:
        1. **Centralized `CORE_GENRE_IDS`** - Moved to `browseDefaults.ts` with JSDoc, exported
           both array and Set versions, removed duplicates from `browseOptions.ts` and
           `useMovieCollectionState.tsx`
        2. **Refactored `getFetcherAndSource`** - Now accepts optional `search` param from React
           Router (source of truth), falls back to `window.location` for compatibility, fixed
           spread order so URL query wins over `filters.query`
        3. **Created `SearchParams` type** - New `searchTypes.ts`, `searchParamMapper.ts`,
           `searchUrlSync.ts` with 13 tests for URL parsing/generation
    - **Bonus fix:** Removed `@/types` alias override from `vite.config.ts` and `vitest.config.ts`
      that was blocking `tsconfigPaths()` multi-path resolution
    - **Files:**
        - `frontend/src/constants/browseDefaults.ts` (CORE_GENRE_IDS added)
        - `frontend/src/constants/browseOptions.ts` (imports from browseDefaults)
        - `frontend/src/components/movie/collection/useMovieCollectionState.tsx` (uses CORE_GENRE_IDS_SET)
        - `frontend/src/utilities/routeConfigHelper.ts` (new signature, spread order fix)
        - `frontend/src/components/movie/collection/MovieCollectionLayout.tsx` (passes location.search)
        - `frontend/src/types/searchTypes.ts` (new)
        - `frontend/src/utilities/searchParamMapper.ts` (new)
        - `frontend/src/utilities/searchUrlSync.ts` (new)
        - `frontend/src/utilities/__tests__/routeConfigHelper.search.test.ts` (new - 11 tests)
        - `frontend/src/utilities/__tests__/searchUrlSync.test.ts` (new - 13 tests)
        - `frontend/vite.config.ts` (removed @/types alias)
        - `frontend/vitest.config.ts` (removed @/types alias)
    - **Tests:** 573 frontend + 611 backend passing

    - **Branch:** `technical/service-layer-modernization`

- [x] Blacklist 70s/80s adult films that TMDB mislabels as non-adult
    - **Outcome:** Blacklisted 108 movies total:
        - 18 original reported films
        - 52 Emmanuelle series films
        - 1 additional (424140 The Black Peacock)
        - 37 additional Italian/European exploitation films (70s-80s)
    - **Production company analysis:** No companies qualified for 95%+ bulk blacklisting:
        - Rapid Film: ~50% adult (includes "Cross of Iron")
        - Clesi Cinematografica: ~30% adult (includes "Malicious", legitimate films)
        - Dania Film: Mixed (includes horror like "Cannibal Ferox")
    - **Vote threshold analysis:** 76% of flagged films have 10+ votes - raising threshold wouldn't help
    - **Excluded from Emmanuelle blacklist:** 976576 (2024 remake), 842846/846910 (documentaries),
      1093502 (unrelated - about actress Emmanuelle Laborit)

    - **Branch:** `technical/service-layer-modernization`

- [x] Remove browseLayout abstraction and related dead code
    - **Outcome:** Removed `browseLayout` prop from components (only "compact" was ever used),
      removed dead decade handling from browseParamMapper (UI converts decades before storing),
      removed unused collapsible filter state, added user override for auto-expand (sessionStorage-based),
      fixed decade preset auto-expand regression (decade ranges now excluded from "advanced" detection),
      consolidated duplicate hasAdvancedFilters logic
    - **Files:** `useMovieCollectionState.tsx`, `BrowseControlsSection.tsx`, `MovieCollectionLayout.tsx`,
      `browseParamMapper.ts`, `useMovieFetchRouter.ts`, `App.tsx`, `browseParamMapper.test.ts`,
      `useMovieCollectionState.test.tsx`, `useMovieFetchRouter.test.ts`
    - **Tests:** 509 frontend tests passing (6 new tests for decade/genre advanced detection)

    - **Branch:** `technical/service-layer-modernization`

- [x] Add visual indication for active browse filters + fix sort/filter conflation
    - **Outcome:** Sort no longer triggers "Clear Filters" button (sort is user preference). Active filters show
      `color="primary"` on text/icon. TDD with 89 tests for new behavior.
    - **Key changes:**
        - New `hasActiveFilters()` function (excludes sort) for button visibility
        - `clearFilters()` preserves sort when clearing (in QuickBrowseBar, AdvancedFiltersPanel, hook)
        - `countActiveParams()` now excludes sort from count
        - ConnectedDropdowns: genre/year text shows primary when selected, toggle icon shows primary when panel open
        - AdvancedFiltersPanel: language dropdown, year inputs, rating inputs show primary when active
    - **Files modified:**
        - `frontend/src/utilities/browseParamUtils.ts` (new `hasActiveFilters`, updated `countActiveParams`)
        - `frontend/src/utilities/__tests__/browseParamUtils.test.ts` (33 tests)
        - `frontend/src/components/movie/collection/useMovieCollectionState.tsx` (exposes `hasActiveFilters`, preserves sort)
        - `frontend/src/components/movie/collection/__tests__/useMovieCollectionState.test.tsx` (new tests)
        - `frontend/src/components/movie/browse/ClearBrowseParamsButton.tsx` (uses `hasActiveFilters`)
        - `frontend/src/components/movie/browse/__tests__/ClearBrowseParamsButton.test.tsx` (28 tests)
        - `frontend/src/components/movie/browse/QuickBrowseBar.tsx` (clearFilters preserves sort)
        - `frontend/src/components/movie/browse/AdvancedFiltersPanel.tsx` (clearFilters, language color)
        - `frontend/src/components/movie/browse/ConnectedDropdowns.tsx` (genre/year/toggle color indication)
        - `frontend/src/components/movie/browse/YearSelector.tsx` (input color indication)
        - `frontend/src/components/movie/browse/RatingSelector.tsx` (input color indication)

    - **Branch:** `technical/service-layer-modernization`

- [x] Fix naming consistency: filters→browseParams where sort is included
    - **Outcome:** Renamed variables/props that were called "filters" but actually held BrowseParams (includes sort)
    - **Changes:**
        - `SortDropdown.tsx`: prop `filters` → `browseParams` (component uses sortBy AND language)
        - `QuickBrowseBar.tsx`: updated prop usage
        - `SortDropdown.test.tsx`: `createMockFilters()` → `createMockBrowseParams()`, prop updates
        - `useMovieFetchRouter.test.ts`: `createEmptyFilters()` → `createEmptyBrowseParams()`, `mockFilters` → `mockBrowseParams`
        - `browseParamMapper.test.ts`: `const filters` → `const browseParams` variable names
    - **Not changed (correctly named):**
        - `ConnectedDropdowns.tsx`: only uses actual filters (genre, year) - `filters` prop appropriate
        - `hasAdvancedFilterValues()`: only checks filter values - `filters` param appropriate
    - **Quality gates:** Type check ✅, Lint ✅, 34 affected tests pass ✅

    - **Branch:** `technical/service-layer-modernization`

- [x] Fix pre-existing linting issues in freezegun stub
    - **Outcome:** Fixed 2 ruff violations in `backend/stubs/freezegun/__init__.pyi`
    - **Changes:**
        - UP035: `typing.ContextManager` → `contextlib.AbstractContextManager`
        - PIE790: Removed unnecessary `...` after docstring
    - **Quality gates:** Ruff ✅, Pyright ✅, 7 token refresh tests pass ✅

    - **Branch:** `technical/service-layer-modernization`

- [x] Refactor auth domain technical debt
    - **Outcome:** Fixed circular dependencies using useRef pattern, standardized auth return types
      with AuthResult<T> discriminated union, migrated 25 console statements to logger service,
      fixed MovieDetail.tsx architecture violation (direct useAuth import → useAuthContext).
    - **Files:** useAuth.ts, auth-state.d.ts, MovieDetail.tsx, Login.tsx, Register.tsx,
      authService.ts, apiClient.ts
    - **Quality gates:** All passed

    - **Branch:** `technical/service-layer-modernization`

- [x] Standardize TMDB paginated response class naming
    - **Outcome:** Renamed misleading "SearchResponse" classes to "PaginatedResponse" pattern for consistency
    - **Renames performed:**
        - `TMDBMovieSearchResponse` → `TMDBPaginatedMovieResponse` (used for discover, search, browse, now-playing, upcoming)
        - `TMDBKeywordSearchResponse` → `TMDBPaginatedKeywordResponse`
        - `TMDBPersonSearchResponse` → `TMDBPaginatedPersonResponse`
    - **Cleanup:** Deleted unused `backend/shared/api_types.py` (deprecated file with no imports)
    - **Files modified:** 8 code files (definition, exports, imports across service layer and tests)
    - **Quality gates:** 408 tests passing, 0 Ruff violations, 0 Pyright errors in modified files

- [x] Centralize test mock creation with DRY helpers
    - **Outcome:** Eliminated test mock duplication across 8 files (97 `.model_dump()` occurrences)
    - **Changes:**
        - Created `apps/movie/tests/test_helpers.py` with 4 core helpers:
            - `create_mock_paginated_response()` - paginated movie lists
            - `create_mock_movie_detail_response()` - movie detail responses
            - `create_mock_error_response()` - HTTP error scenarios with headers
            - `create_mock_tmdb_error_response()` - TMDB-specific error format (discovered during migration)
        - Migrated 8 test files (97 occurrences total):
            - `test_movie_service.py` (7), `test_batch_operations.py` (15 - 8 movie + 7 TMDB errors)
            - `test_movie_api.py` (35), `test_result_filtering.py` (36 - mixed patterns)
            - `test_endpoint_enrichment_integration.py` (4), `integration/api/test_date_constrained_endpoints.py` (6)
        - Removed duplicate 51-line `mock_tmdb_response_factory` fixture from `integration/conftest.py`
    - **Architecture patterns documented:**
        - **Pattern 1** (89 tests): Use helper for valid data (abstracts `.model_dump()`)
        - **Pattern 2** (8 tests): Use raw builder for data quality tests (bypass Pydantic validation for intentionally invalid data)
        - Module docstrings explain when/why to use each pattern
    - **Type safety:** Pydantic `.model_dump()` boundary documented in helper docstrings with `# type: ignore[arg-type]` per strategy-type-safety.md
    - **Benefits:** DRY (single source of truth), eliminates scattered type ignores, documents type boundaries, distinguishes TMDB vs app errors
    - **Quality gates:** 159 tests passing ✅, 0 Ruff violations ✅, 0 Pyright errors ✅

- [x] Validate test data with Pydantic models (eliminate cast() properly)
    - **Outcome:** Test builders return validated Pydantic models, tests use `.model_dump()` for ApiResponse
    - **Changes:**
        - Updated `tmdb_test_builders.py` functions to return Pydantic models (TMDBMovieBase, TMDBMovieDetail, TMDBMovieSearchResponse)
        - Functions renamed for accuracy: `create_raw_tmdb_movie` → `create_tmdb_movie`, `create_movie_detail_dict` → `create_tmdb_movie_detail`
        - All 10 test files updated to call `.model_dump()` when passing to ApiResponse
        - Removed duplicate TMDBMovieDetail TypedDict (already imported from core)
        - Updated integration conftest fixture to use validated models
    - **Architecture validated:** Tests build validated models → dump to dict for ApiResponse → service validates (follows validation boundary pattern from strategy-type-safety.md)
    - **Benefits:**
        - Invalid test data caught at construction (early failure)
        - No cast() needed (data genuinely validated, not type-asserted)
        - Tests use same validation as production code
        - Clearer validation boundaries
    - **Files modified:** 10 test files total
        - Core: `tmdb_test_builders.py`, `integration/conftest.py`
        - Tests: `test_endpoint_enrichment_integration.py`, `test_movie_api.py`, `test_movie_service.py`, `test_batch_operations.py`, `test_movie_service_buffer_deduplication.py`, `test_result_filtering.py`, `integration/api/test_date_constrained_endpoints.py`
    - **Quality gates:** Tests 159/159 ✅, Ruff ✅, Pyright 25 errors (Pydantic `.model_dump()` returns `dict[str, Any]` - acceptable per strategy as external API boundary)
    - **Follow-up task created:** Centralize test mock creation with DRY helpers (in ATOMIC-TASKS.md)

- [x] Extract BaseTMDBService for all service classes
    - **Outcome:** Created shared base class with DI pattern and error handling helper
    - **Changes:**
        - Created `BaseTMDBService` in `base_service.py` with common `__init__` and `_get_validated_response()` method
        - MovieService, KeywordService, PeopleService now inherit from base
        - KeywordService/PeopleService use `self._get_validated_response()` instead of importing
        - Documented why MovieService uses typed validators (needs Pydantic models directly)
    - **Benefits:** DRY foundation, discoverable error handling, consistent patterns across services
    - **Files:** `backend/apps/movie/services/base_service.py`, `movie_service.py`, `keyword_service.py`, `people_service.py`
    - **Quality gates:** Ruff ✅, Pyright ✅, Tests 159/159 ✅

- [x] Update tests for ServiceParams Pydantic refactor
    - **Outcome:** All 159 movie tests pass after signature updates
    - **Changes:**
        - `test_result_filtering.py`: Updated 17 `discover_movies()` calls to use `params=ServiceParams(...)`
        - `test_endpoint_preset_merge.py`: Updated 2 assertions for underscore notation (`release_date_gte` instead of `release_date.gte`)
    - **Files:** `backend/apps/movie/tests/test_result_filtering.py`, `backend/apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py`
    - **Quality gates:** Ruff ✅, Pyright ✅, Tests 159/159 ✅

- [x] Refactor ServiceParams to Pydantic BaseModel
    - **Outcome:** ServiceParams is now a validated Pydantic model with attribute access
    - **Benefits achieved:**
        - Real runtime validation (extra="forbid" catches typos)
        - Attribute access (`params.year_min`) with IDE type awareness
        - Consistent with Django Ninja patterns
        - No more cast() lies or theatrical type safety
    - **Changes:**
        - Created `ServiceParams(BaseModel)` in filtering.py with `get_tmdb_params()` method
        - Updated `to_service_params()` to return validated model
        - Service methods now take `params: ServiceParams | None`
        - API layer passes model directly (no unpacking)
        - Protected keys and presets use underscore notation
        - Moved `MIN_VOTE_COUNT` to filtering.py (broke import cycle)
    - **Files:** `filtering.py`, `schemas.py`, `movie_service.py`, `api.py`, `helpers.py`, `result_filtering.py`, `pagination.py`
    - **Tests:** 140 pass, 19 need signature updates (separate task)

- [x] Extract service error handling helper
    - **Outcome:** Created `get_validated_response()` helper in schema_factories.py
    - **Changes:** Refactored keyword_service.py and people_service.py to use helper
    - **Removed:** ~40 lines of repetitive error handling code across 4 methods
    - **Files:** `backend/apps/movie/services/schema_factories.py`, `keyword_service.py`, `people_service.py`
    - **Tests:** All 20 keyword/people service tests pass

- [x] Declarative derived params extraction in schemas.py
    - **Outcome:** Created `DERIVED_PARAM_TRANSFORMS` mapping in filtering.py with `cast` for type safety
    - **Changes:** Reduced `_apply_derived_params()` from 10 repetitive lines to 3-line loop over mapping
    - **Removed type ignores:** Used `cast()` instead of `type: ignore` per type safety strategy
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`
    - **Tests:** All 159 movie tests pass

- [x] Consolidate redundant parameter mappings + Rename FILTER_MAPPING + Add TypedDict + Simplify mapping flow
    - **Outcome:** Single source of truth in `filtering.py` with `PARAM_MAPPING`, `HTTP_TO_SERVICE_MAPPING`, and `ServiceParams` TypedDict
    - **Changes:** Schema imports and uses mappings from filtering.py, removed underscore/dot duplication, standardized on dot notation (e.g. `release_year.gte`) for TMDB consistency
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`, `backend/apps/movie/tests/test_movie_service.py`
    - **Note:** `type: ignore[arg-type]` remains for kwargs unpacking - follow-up task created for Unpack refactor

- [x] Research accessibility guidelines for input field focus rings
    - **Outcome:** CSS `:focus-visible` spec always matches on text inputs (by design), not browser bug
    - **Decision:** Use border-only focus indicators for text inputs (matches GitHub/Google/Linear)
    - **Pattern:** Border color change to `tertiary` on focus (no outline ring needed)
    - **Special case:** Select dropdowns get keyboard-only rings (button-like components)
    - **WCAG compliance:** Meets 2.4.7 (Focus Visible) and 2.4.13 (Focus Appearance)
    - **Documentation:** ADR-015, ThemeDebug reference implementations updated
    - **Files updated:** UIElementTokensSection.tsx, FormControlsSection.tsx (Input/Textarea/NumberInput/Select)
