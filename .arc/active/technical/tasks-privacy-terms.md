# Task List: Privacy Policy and Terms of Service Pages

**PRD:** `prd-privacy-terms.md`
**Created:** 2026-11-20
**Branch:** `technical/privacy-terms`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Publish the privacy policy and terms of service as two pages of the app, word for word from the PRD's
Appendices A and B, linked from every page's footer, from signed-out Home with a line on why the app asks for sign-in
data, and where accounts are made; and add the rule that keeps them true, so the Owner can enter the links on Google's
Branding page.

**Design:** `draft-privacy-terms.md`. The PRD's Appendix C maps each sentence of the texts to the code or provider
setting behind it, as read on `main` at `099a75df`; this branch merged that `main` in `bbaa31d3`.

## Scope

### Will Do

- `/privacy` and `/terms` as lazy routes of `AppLayout`, outside `ProtectedRoute`, holding the texts as JSX on
  Chakra's primitives, with section ids, in-page links, a cookie table that scrolls sideways inside itself, and their
  own opening position
- The footer's row of two links, signed-out Home's data-use line, and the sign-up notice on `Register` and `Login`
- Unit tests for each, one smoke spec for the pages, and the smoke documents' count
- The rule in `DEVELOPMENT-RULES.md` and the new ADR
- A re-trace of what `main` changed under Appendix C's paths before verification, and again on the day of merge
  with both effective dates

### Won't Do

- Changing what the code does to make the texts simpler, such as keeping a failed request's contents out of browser
  error reports, which is a separate change
- A cookie banner, the Profile and Settings pages, a per-page document title, a Content Security Policy, or a check
  at tablet width
- Google's console: entering the links, publishing the app and brand verification are the Owner's, after the pages
  are live
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** The privacy policy opens from every page's footer

_Mode:_ `slice` — closes on a visitor following the footer's Privacy Policy link from the bottom of signed-out Home to
the top of the policy, whose headings land below the top bar.

_Exit criterion:_ `legal-pages.spec.ts`'s policy steps pass against the worktree's browsable stack: Home's footer opens
`/privacy` with its title in view and an axe scan passing, the page doesn't scroll sideways at 360×800, and "Who else
handles your data" lands below the top bar from the in-page link and on a direct load of its fragment.

- [x] **1.1 `/privacy` shows the policy's text, word for word — R1, R2, R3, R4, R5, R6, R7, R13**

    **Goal:** A visitor, signed in or not, reads Appendix A's text at `/privacy` in one column under the top bar, with
    every heading carrying its id and every link going where the appendix says.

    - [x] **1.1.a Cover the policy page** (`frontend/src/pages/legal/__tests__/`, and the route in `App.test.tsx`)

        Added five page and route tests for the title, date, anchors, links, table and signed-out app layout. All five
        failed before the page and route were built.

    - [x] **1.1.b Build the document pieces, the route and the page**

        Added the lazy public policy route and shared Chakra document, heading and table-region components. The page
        carries the provisional date and Appendix A as JSX. All 14 focused tests passed.

    - [x] **1.1.c Compare the rendered page with Appendix A**

        Compared the rendered policy paragraph by paragraph against Appendix A, including heading levels, list items,
        table cells, bold and code spans, and link destinations. All matched.

- [ ] **1.2 Every page's footer links both texts — R8, R13**

    **Goal:** The footer under every page of `AppLayout` and `AuthLayout` carries "Privacy Policy" and "Terms of
    Service", each opening its page inside the app.

    - [ ] **1.2.a Cover the footer's links** (`Footer.test.tsx`)
        - Test: the footer shows both links, each opening its route
        - Expect tests to FAIL initially

    - [ ] **1.2.b Add the footer row**
        - One row under the copyright line, in the footer's small muted text, with `TextLink`s to `ROUTES.PRIVACY` and
          `ROUTES.TERMS`; add `ROUTES.TERMS` (`/terms`) here, and its route in Task 2.1
        - Tests should now PASS
        - Run `sign-in.spec.ts` against the worktree's browsable stack; its scans cover the footer

- [ ] **1.3 The policy opens at its top, or at its fragment's heading below the top bar — R1, R3, R5, R14**

    **Goal:** Arriving from any scroll position, the policy shows its title; arriving at or following a section's
    fragment, that heading sits fully below the sticky top bar; at 360px only the cookie table scrolls sideways.

    - [ ] **1.3.a Write the smoke spec's policy steps**
        - New `frontend/e2e/legal-pages.spec.ts`, with `test` and `expect` from `./fixtures` and `scanPage` from
          `./axe`; no account and no data changed, so it runs unchanged against staging
        - Opens signed-out Home, scrolls to its footer, follows Privacy Policy to `/privacy`, checks the title is in
          the viewport, and scans the page; find the link inside the footer (`contentinfo`), since Task 3.1 adds a
          second Privacy Policy link to Home
        - At 360×800 opens `/privacy` and checks the document doesn't scroll sideways; a guard, it passes from the
          start, since Task 1.1 builds the table's wrapper: see it fail once by taking the wrapper's sideways
          scrolling off and stopping the cells from wrapping, for one run (with cells wrapping, the table fits the
          page's padding at 360px)
        - On `/privacy`, follows "Who else handles your data" and checks the heading is in the viewport with its top
          at the top bar's bottom or no more than a few pixels below it (measured from the `banner`'s box); then
          opens `/privacy#who-else-handles-your-data` directly and checks the same
        - Expect the opening-position and landing steps to FAIL initially

    - [ ] **1.3.b Position the pages**
        - In the shared document pieces, so the terms page gets it too: once the page's content has rendered, scroll
          to the top, or to the fragment's heading when the address has one, and again whenever the fragment changes;
          the app sets `history.scrollRestoration` to `manual` and has no route-wide scroll handling, and React
          Router's `Link` doesn't scroll to a fragment by itself
        - Headings keep a scroll margin of the `layout-navbar` size token, so in-page links land below the top bar
        - Spec steps should now PASS

- [ ] **1.4 Check the policy page in the browser**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - Run `legal-pages.spec.ts` against the worktree's browsable stack

### **Phase 2:** The terms open from the footer the same way

_Mode:_ `replication` — closes on the second text published through the policy's pieces.

_Exit criterion:_ `legal-pages.spec.ts` passes in full against the worktree's browsable stack, its terms steps
included.

- [ ] **2.1 `/terms` shows the terms' text, word for word — R1, R2, R3, R4, R6, R7, R13, R14**

    **Goal:** A visitor, signed in or not, reads Appendix B's text at `/terms` from the footer's link, and its Privacy
    Policy link opens `/privacy` inside the app.

    - [ ] **2.1.a Cover the terms page** (beside the policy's tests, and the route in `App.test.tsx`)
        - Test: at `/terms`, signed out, one `h1`, the terms' title, with the effective date beneath it
        - Test: once the title has rendered, no bracketed review marker, `[publication date]` or `{{`; every `h2`
          carries an id made from its text (`1. The service` gives `1-the-service`)
        - Test: the Privacy Policy link opens `/privacy`, and the contact address is a `mailto:` link
        - Spec: from Home's footer, follows Terms of Service to `/terms`, checks the title is in the viewport, and
          scans the page
        - Expect tests to FAIL initially

    - [ ] **2.1.b Add the route and the page**
        - A lazy `TermsOfService` route at `ROUTES.TERMS`, beside the policy's
        - `TermsOfService.tsx` carries Appendix B as JSX on the shared pieces, which open it at its top (Task 1.3),
          its effective date a provisional constant like the policy's
        - Tests should now PASS

    - [ ] **2.1.c Compare the rendered page with Appendix B**
        - Read the page's text against Appendix B paragraph by paragraph and record the result here

- [ ] **2.2 The smoke documents count and describe the new spec — R15**

    **Goal:** Every document that counts the smoke specs counts twelve, and those that describe each spec describe
    `legal-pages.spec.ts`; ADR-050's count stays as it was.

    - `QUICK-REFERENCE.md`, `TECHNICAL-OVERVIEW.md`, `strategy-quality-gates.md` and
      `strategy-testing-methodology.md` (two places); markdown lint passes on each

- [ ] **2.3 Check both pages in the browser**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - Run `legal-pages.spec.ts` in full against the worktree's browsable stack

### **Phase 3:** Visitors meet the texts where they share data, and the repository keeps them true

_Mode:_ `slice` — closes on signed-out Home and both places accounts are made linking the texts, with the rule and the
ADR recorded.

_Exit criterion:_ `sign-up.spec.ts`, `sign-in.spec.ts`, `phone-width.spec.ts` and `background.spec.ts` pass against
the worktree's browsable stack with Home's line and the notices in place.

- [ ] **3.1 Signed-out Home says why the app asks for sign-in data — R9, R13**

    **Goal:** A signed-out visitor reads R9's line under the band's three points, with its Privacy Policy link, and a
    signed-in visitor doesn't see it.

    - [ ] **3.1.a Cover the line** (`HomeBand.test.tsx`, `Home.test.tsx`)
        - Test: the band shows the line, word for word, and its Privacy Policy link opens `/privacy`
        - Test: signed-in Home doesn't show the line; a guard, it passes from the start, since no Home shows the line
          yet: see it fail once by showing the line whether or not the visitor is signed in, for one run
        - Expect the first test to FAIL initially

    - [ ] **3.1.b Add the line to `HomeBand`**
        - Under the band's three points, in its body text, at the width of its container
        - Tests should now PASS

- [ ] **3.2 Accounts are made under a notice of the terms and the policy — R10, R13**

    **Goal:** `Register` under its submit button, and `Login` under the Google and GitHub buttons, show "By creating an
    account, you agree to the Terms of Service and acknowledge the Privacy Policy." with both links.

    - [ ] **3.2.a Cover the notice** (`Register.test.tsx`, `Login.test.tsx`)
        - Test: each page shows the notice, its Terms of Service link opening `/terms` and its Privacy Policy link
          opening `/privacy`
        - Test: on `Login` the notice follows the provider buttons
        - Expect tests to FAIL initially

    - [ ] **3.2.b Add the notice to both pages**
        - One small component the two pages share, beside `AuthFormCard` in `frontend/src/components/auth/`, in small
          muted text centred under the button it follows
        - Tests should now PASS

- [ ] **3.3 `DEVELOPMENT-RULES.md` carries the rule that keeps the texts true — R11**

    **Goal:** A developer whose change touches what the texts describe finds, in Code Quality Principles, what the
    change must update, which areas and provider facts prompt a read, and the hold on new uses of personal data.

    - R11's rule as the PRD states it: the update in the same pull request with new effective dates, Home's line
      kept in agreement, the hold on a new use of personal data, the list of areas and provider facts, and the
      expected additions
    - The document's version header stays as it is

- [ ] **3.4 The new ADR records how the texts live in the app — R12**

    **Goal:** The ADR, reading `Proposed`, records the two routes and why their paths hold, the texts written into
    source, Home's line agreeing with the policy, the rule, and Google's requirements as its context, and names
    Appendix C of `prd-privacy-terms.md` as the map at publication.

    - The next free number on `origin/main` when it's written, from `adr-template.md`, reading `Proposed`;
      verification sets it `Accepted` (Task 4.1), and the records check (`check-adr-records.mjs`), which refuses a new
      ADR reading `Proposed`, runs before merging (`archive-completed.md` § 8)

- [ ] **3.5 Trace again what `main` changed since the map was read — R16**

    **Goal:** Before verification, the texts and Appendix C hold for every change `main` took after `099a75df`, so
    verification can walk Success Criterion 3 on this branch.

    - Merge `origin/main` into the branch, then trace each change merged after `099a75df` that touches a path
      Appendix C names to where its code path ends; record what was traced and the result here
    - A correction amends the PRD's appendices with the Owner (`1_create-prd.md` § Amending a PRD), then lands on the
      pages; a page whose text changes is compared with its appendix again

- [ ] **3.6 Check where visitors meet the texts in the browser**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - Run `sign-up.spec.ts`, `sign-in.spec.ts`, `phone-width.spec.ts` and `background.spec.ts` against the
      worktree's browsable stack

### **Phase 4:** Verification

- [ ] **4.1 Verify the work** (load `archive-completed.md` § 1; the new ADR set `Accepted` before merge; Success
  Criterion 1's CI half and Success Criterion 3 stay open with a note through § 1's criteria walk, and this task is
  checked with them before asking to merge (§ 8); the proven-live criteria are proven after merge, § 9)

    - Success Criterion 1's CI half is marked from the pull request's first green end-to-end smoke run
    - Before asking to merge, in this order: fetch `origin`, then trace anything `main` merged since the last trace
      (Task 3.5's, the first time) that touches a path Appendix C names, recording it here and correcting the texts as
      Task 3.5 does (R16); run § 8's ADR records check; then the pull request's last commit sets both effective dates
      to that day (R7) and carries the trace's record, the two criteria's marks and this task's check
    - After approval, as § 8 refreshes the head's evidence, fetch `origin` again. If `main` has merged a change to a
      path Appendix C names since the last trace, anything needs a commit after the dating commit, or the merge
      slips a day, run the order again from the trace, ending with a new dating commit

- [ ] **4.2 Prove the post-merge criteria** (Proven live 1 and 2; load `archive-completed.md` § 9; the Owner enters
  the links on Google's Branding page, and the console's response is recorded here)

## Implementation Notes

- **Opening position.** `main.tsx` sets `history.scrollRestoration` to `manual`, and no route-wide component scrolls
  to the top, so a page opened from Home's footer keeps Home's scroll position until the page moves itself. The
  browser's own fragment scroll runs before the lazy page renders, so a direct load needs the page to scroll itself.
  R1's position and R3's landing can't be measured in jsdom; the smoke spec proves them (D10).
- **Smoke spec.** `./fixtures`' `test` answers the catalogue requests signed-out Home makes, so the spec needs no
  setup and no account. `scanPage` requires exactly one `h1`. `target.name` tells local from staging.
- **Ids.** The policy's three in-page links use ids R3's rule makes from their headings' text
  (`who-else-handles-your-data`, `your-choices`, `security`); the terms' numbered headings keep their numbers.
- **The texts are fixed.** Appendices A and B are the source; a wording change found while building goes to the
  PRD's appendices first.
- **New links on shared pages.** The footer's two links appear on every page, and the notice adds two to `Register`
  and `Login`: existing unit tests or specs that count links, or find one by a name these share, may need scoping.

## Success Criteria

**Implemented** criteria are checked at verification (`archive-completed.md` § 1), except Success Criterion 1's CI
half and Success Criterion 3, marked before merging (§ 8); **Proven live** after the merge deploys (§ 9).

### Implemented

- [ ] 1. **The smoke spec passes** against a worktree's browsable stack and in CI's smoke job: from the bottom of
  signed-out Home, the footer's links open `/privacy` and `/terms` with each title in view; both pages pass the axe
  scan; `/privacy` at 360×800 doesn't scroll sideways; and its "Who else handles your data" heading lands below the top
  bar from the in-page link and on a direct load of its fragment. (R1, R3, R5, R8, R14)
- [ ] 2. **The texts are the appendices'.** A reviewer comparing each page's rendered text with Appendix A and Appendix
  B finds the same headings, paragraphs, lists, table and links, and unit tests find no review marker, placeholder date
  or `{{` on either page. (R2, R13)
- [ ] 3. **The texts are true at merge.** Every statement in Appendix A and Appendix B about what the site does holds at
  source on the merge commit, by Appendix C's map; any code merged after this PRD that touches a mapped path has been
  traced again. (R2, R16, D6)
- [ ] 4. **The links are in place.** Unit tests show the footer's two links, signed-out Home's line and its link (and
  its absence signed in), and the sign-up notice with both links on `Register` and `Login`. (R8 to R10, R13)
- [ ] 5. **The rule and the ADR are in the repository.** `DEVELOPMENT-RULES.md` carries R11's rule; the new ADR reads
  `Accepted` with its date. (R11, R12)
- [ ] 6. **The smoke documents count the new spec.** (R15)

### Proven live

- [ ] 1. After the merge deploys, staging serves `/privacy` and `/terms` to a signed-out visitor with the merge date as
  both effective dates, and the staging smoke passes over both pages. (R7, R14)
- [ ] 2. The Owner enters the homepage, privacy and terms links on Google's Branding page, and the console accepts them.
