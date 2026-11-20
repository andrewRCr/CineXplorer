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

- [x] **1.2 Every page's footer links both texts — R8, R13**

    **Goal:** The footer under every page of `AppLayout` and `AuthLayout` carries "Privacy Policy" and "Terms of
    Service", each opening its page inside the app.

    - [x] **1.2.a Cover the footer's links** (`Footer.test.tsx`)

        Both navigation tests failed before the links were added and passed afterwards.

    - [x] **1.2.b Add the footer row**

        Added the two in-app links below the copyright line and named the terms path in `ROUTES`.
        The 42 footer and layout tests passed, as did all six scenarios in `sign-in.spec.ts`.

- [x] **1.3 The policy opens at its top, or at its fragment's heading below the top bar — R1, R3, R5, R14**

    **Goal:** Arriving from any scroll position, the policy shows its title; arriving at or following a section's
    fragment, that heading sits fully below the sticky top bar; at 360px only the cookie table scrolls sideways.

    - [x] **1.3.a Write the smoke spec's policy steps**

        Added four signed-out Chromium scenarios for footer navigation, phone overflow, in-page links and direct
        fragments. The three opening-position checks failed before the scroll effect. The phone guard failed at
        2,535px with the wrapper's overflow removed and cells set to nowrap, then passed at 360px with the original CSS.

    - [x] **1.3.b Position the pages**

        The shared document scrolls on route or fragment navigation after the content mounts. The heading uses the
        top bar's size token for its scroll margin and takes focus when reached through an anchor.

- [x] **1.4 Check the policy page in the browser**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - All four scenarios in `legal-pages.spec.ts` passed against this worktree's browsable stack, including the
      privacy page's axe scan.

### **Phase 2:** The terms open from the footer the same way

_Mode:_ `replication` — closes on the second text published through the policy's pieces.

_Exit criterion:_ `legal-pages.spec.ts` passes in full against the worktree's browsable stack, its terms steps
included.

- [x] **2.1 `/terms` shows the terms' text, word for word — R1, R2, R3, R4, R6, R7, R13, R14**

    **Goal:** A visitor, signed in or not, reads Appendix B's text at `/terms` from the footer's link, and its Privacy
    Policy link opens `/privacy` inside the app.

    - [x] **2.1.a Cover the terms page**

        Four new unit and route tests and the terms footer scenario failed before the terms were added. They cover
        the title, date, numbered fragments, email links and navigation to the privacy policy.

    - [x] **2.1.b Add the route and the page**

        Added the public lazy route and rendered Appendix B using the shared document and headings. All 18 focused
        app and legal-page tests passed.

    - [x] **2.1.c Compare the rendered page with Appendix B**

        Compared the rendered terms against Appendix B in Chromium, including every paragraph, heading level,
        list item and link destination. All matched.

- [x] **2.2 The smoke documents count and describe the new spec — R15**

    **Goal:** Every document that counts the smoke specs counts twelve, and those that describe each spec describe
    `legal-pages.spec.ts`; ADR-050's count stays as it was.

    - Updated the count and legal smoke coverage in all four named documents. Markdown lint passed.

- [x] **2.3 Check both pages in the browser**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - All five scenarios in `legal-pages.spec.ts` passed on this worktree's browsable stack, including both axe scans.

### **Phase 3:** Visitors meet the texts where they share data, and the repository keeps them true

_Mode:_ `slice` — closes on signed-out Home and both places accounts are made linking the texts, with the rule and the
ADR recorded.

_Exit criterion:_ `sign-up.spec.ts`, `sign-in.spec.ts`, `phone-width.spec.ts` and `background.spec.ts` pass against
the worktree's browsable stack with Home's line and the notices in place.

- [x] **3.1 Signed-out Home says why the app asks for sign-in data — R9, R13**

    **Goal:** A signed-out visitor reads R9's line under the band's three points, with its Privacy Policy link, and a
    signed-in visitor doesn't see it.

    - [x] **3.1.a Cover the line**

        The signed-out band's copy and link test failed before implementation. The signed-in guard failed when the
        band was temporarily added to signed-in Home and passed when it was removed.

    - [x] **3.1.b Add the line to `HomeBand`**

        Added the disclosure and in-app privacy link below the three points. The focused Home tests passed.

- [x] **3.2 Accounts are made under a notice of the terms and the policy — R10, R13**

    **Goal:** `Register` under its submit button, and `Login` under the Google and GitHub buttons, show "By creating an
    account, you agree to the Terms of Service and acknowledge the Privacy Policy." with both links.

    - [x] **3.2.a Cover the notice**

        Both tests failed before the notice appeared. They cover the exact copy, the two route destinations and
        the placement after Register's submit button and Login's provider buttons.

    - [x] **3.2.b Add the notice to both pages**

        Added a shared, centred notice below the relevant buttons. The focused sign-in and registration tests passed.

- [x] **3.3 `DEVELOPMENT-RULES.md` carries the rule that keeps the texts true — R11**

    **Goal:** A developer whose change touches what the texts describe finds, in Code Quality Principles, what the
    change must update, which areas and provider facts prompt a read, and the hold on new uses of personal data.

    - Added the same-pull-request and effective-date rule, the notice and consent requirement, and the code and
      provider changes that require checking the texts. Kept the document's version header.

- [x] **3.4 The new ADR records how the texts live in the app — R12**

    **Goal:** The ADR, reading `Proposed`, records the two routes and why their paths hold, the texts written into
    source, Home's line agreeing with the policy, the rule, and Google's requirements as its context, and names
    Appendix C of `prd-privacy-terms.md` as the map at publication.

    - Added Proposed ADR-052 covering the public routes, why URLs stay stable, JSX text, the signed-out Home
      disclosure, and the rule for keeping the documents current. The status names the map used at publication.

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
