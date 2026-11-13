# Completion: Navigation Shell

**Completed:** 2026-11-12
**Branch:** `technical/navigation-shell`
**Category:** Technical
**Context:** Unify navigation and make film selections describe what they show.

## Summary

CineXplorer uses one responsive top bar and one Films catalog with All films, In theaters and Coming soon release
windows. Pages retain navigation and the footer while loading or showing an error, and their headings identify the
page or current film selection.

## Key Deliverables

- One 65px bar, with direct navigation and search at 1024px and wider, and a drawer and inline search below it.
- Authentication-aware Watchlist and account controls, safe Sign in return links, and keyboard-operable menus and
  search with focus restored when they close.
- A catalog header that names the selected window, sort, language, genres and applicable years, with release-window
  links that preserve applicable filters.
- Page-owned headings, content loading and error boundaries, provider-specific sign-in loading, and navigation that
  clears a page error without remounting the content area.
- Shared theme fixes for focus outlines, select indicators, placeholders and expanded buttons, with contrast coverage
  for the error display and account-menu highlight.
- Component and Chromium smoke coverage for desktop and phone navigation, accessible names, headings, focus recovery,
  catalog navigation and Back to Results. The sidebar and its accessibility exceptions are removed.
- ADR-044 and updated layout, styling, testing and feature documentation describing the shell.

## Implementation Highlights

- Wide and phone bars compose shared navigation, account and search controls. Chakra's Menu and Drawer provide their
  interaction behavior; the phone row handles Escape throughout its open search region.
- Window rules normalize the parameters used by the first request and replace the URL entry. Catalog URLs, saved
  scroll keys and Back to Results retain their contracts.
- Titles share year parsing with request mapping. Unknown sort names use the window fallback, including names that
  coincide with inherited object properties.
- The content error boundary resets on path or query changes through a reset prop. A separate boundary above the
  router handles failures in the shell.
- The sequential browse route and its lazy import are development-only; the production build excludes its chunk.

## Related Documentation

- Design: `draft-navigation-shell.md`
- Requirements: `prd-navigation-shell.md`
- Detailed work and criteria evidence: `tasks-navigation-shell.md`
- Decision: ADR-044, “Navigate through one top bar into one film catalog”

## Follow-Up Work

- Criterion 17 requires the pull request's smoke job, the post-merge staging smoke run and staging's not-found
  response at `/browse/sequential`.
- Separate captured work covers the development sequential page's empty state, remaining Chakra recipe defaults,
  the unused frontend search component and source constants, and migration from `react-router-dom` imports.
