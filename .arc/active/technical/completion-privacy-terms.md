# Completion: Privacy Policy and Terms of Service Pages

**Local verification completed:** 2026-11-20
**Branch:** `technical/privacy-terms`
**Category:** Technical
**Context:** Public legal documents for CineXplorer visitors and Google OAuth branding.

## Summary

CineXplorer's public Privacy Policy and Terms of Service explain how the site handles data and how visitors can use
it. The pages provide the stable legal URLs required for Google OAuth branding.

## Key Deliverables

- `/privacy` and `/terms` in the shared app layout, with stable section anchors and a cookie table that scrolls
  within its own region on narrow screens.
- Shared footer links, Home's data-use explanation, and the account-creation notice on Register and Login.
- A maintenance rule that pairs changes in data handling with updates to the legal text and effective dates.
  It also calls for notice before new uses of personal data and consent where required.
- ADR-052 records the stable URLs, the decision to keep the texts in source, and Appendix C as the source map
  for the published statements.

## Implementation Highlights

- The pages share the app theme and document layout. Each opens at the title or places the selected section below
  the sticky navigation.
- OAuth errors, failed credential renewal, and pending account actions preserve the chosen legal URL.
  In `useAuth`, `logout` opens Login immediately. If a legal document is open when sign-out settles, `logout`
  reloads that URL to refresh the session.
- Unit tests cover the public routes and notices. A Chromium journey follows the footer links from signed-out
  Home, checks axe on Home and both documents, and exercises narrow-screen overflow and section links.

## Verification and Publication

Both rendered pages matched the PRD appendices in the worktree. The full local verification run and the focused
checks for later corrections are recorded in the task list. The merge requires the CI smoke result, a source trace
against current `main`, and the merge date on both pages.

After the merge deploys, verify both signed-out routes and effective dates on staging and run staging smoke.
The Owner then enters the homepage, privacy policy, and terms URLs on Google's Branding page and records the result.

## Related Documentation

- Design in `draft-privacy-terms.md`
- Legal texts and source map in `prd-privacy-terms.md`
- Task outcomes and criterion evidence in `tasks-privacy-terms.md`
- ADR-052, Publish the Privacy Policy and Terms as Pages of the App

## Follow-Up Work

- Redact admin search text from routine request logs.
- Repair the links in account emails.
- Keep failed request contents out of browser error reports.
