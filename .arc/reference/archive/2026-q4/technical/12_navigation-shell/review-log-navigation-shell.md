# Review Log: navigation-shell

## 2026-11-11 — Design draft — Design review — pass 1

- **Runner:** independent, a fresh general-purpose subagent, read-only.
- **Rubric:** assess-draft-readiness (criterion 1's divergence test, criterion 4's ADR dispositions),
  assess-design-proportionality, design-audit, source-grounding at artifact scope, and the design-draft stage's draft
  rules. Readiness criterion 3 was not examined by the runner; the draft has no Inbound Buffer section, so it holds.
- **Counts (verified):** 7 major, 4 minor. All eleven confirmed at source; part of F5 (the `/featured` alias as a dead
  link) not supported, its recording folded into F6.
- **Dispositions (all approved as fixes):**
  - F1 title composition: new design. A `{films}` slot, filled only when a language or genre is set; the approved
    titles stand with no filters. Genre wording, order and inclusive year bounds settled.
  - F2 loading after the first visit: new design. Keep React Router's transitions; reset the page's error on location
    change without remounting.
  - F3 OAuth preload overlay: local correction. Added to the states to keep.
  - F4 empty and failed windows: new design. The header and window tabs stay visible; the rating range still carries.
  - F5 development routes: new design. `/browse/sequential` limited to development builds.
  - F6 ADR-002 disposition: local correction. The superseded part covers the landing routing entries; `/featured`
    recorded as an alias.
  - F7 accessibility mechanisms: new design. The wordmark is not a heading; Chakra Menu and Drawer; window tabs as
    links with `aria-current`; phone-width and keyboard smoke checks.
  - F8 phone drawer contents: new design. The drawer holds the bar's links (Films, Library).
  - F9 decision 12's ADR disposition: local correction.
  - F10 behavior claims: local correction.
  - F11 planning history in a public draft: local correction.
- **Shared causes:**
  - Edge states left open beyond the default view (filters in titles, loading after the first visit, empty results,
    keyboard and phone accessibility): F1, F2, F4, F7.
  - Upstream records read in part (the roadmap item's development-routes clause, ADR-002's routing entries): F5, F6.
- **Stop reason:** fixes approved; fix check round 1 approved with them. Pass 2 (the Class Heavy cap) undecided.
- **Elapsed:** pass about 17 minutes; verification and disposition about 30 minutes.

## 2026-11-11 — Design draft — Design review — fix check, round 1 since pass 1

- **Runner:** separation-failure, a fresh general-purpose subagent, read-only. The brief's account of repairs carried
  one author verification conclusion (that the `/featured` alias was not a dead link), so the round does not count as
  independent. The Owner chose a clean rerun covering pass 1's and this round's repairs together.
- **Rubric:** the pass-one rubric at fold scope: closure, grounding, propagation and new failure of the approved
  repairs.
- **Counts (verified):** 1 major, 8 minor (one minor taken from the runner's withstood notes).
- **Dispositions (all approved as fixes):**
  - F1 pages left without an `h1` once the wordmark stops being one: new design. The movie detail and watchlist
    titles become `h1`; the sign-in, registration and password-reset pages gain a visually hidden one; the success
    signal names one `h1` per page.
  - F2 title-rule residues (three or more genres, Highest rated on Coming soon from a URL, genre order, the A to Z
    actor): local correction.
  - F3 the vote-floor sentence and its bearing on the titles: local correction.
  - F4 ADR-002's Frontend Implementation items left standing: local correction.
  - F5 decision 3's `none` without a category: local correction.
  - F6 the sign-out item's role change on a menu: local correction.
  - F7 an Alternatives rationale contradicting decision 7: local correction.
  - F8 a line over the markdown lint's length: local correction.
  - F9 decision 11's remount rationale overstated: local correction.
- **Shared causes:** none new. F1 is a repair (pass one's F7) grounded on a page property that holds only for some
  pages.
- **Stop reason:** fixes approved; clean rerun approved with them. Pass 2 recommended after it, not yet approved.
- **Elapsed:** check about 18 minutes; verification and disposition about 20 minutes.

## 2026-11-11 — Design draft — Design review — fix check, round 1 since pass 1 (clean rerun)

- **Runner:** independent, a fresh general-purpose subagent, read-only, briefed with the approved repairs only.
- **Rubric:** the pass-one rubric at fold scope, over both repair sets (pass one's and the uncounted round's).
- **Counts (verified):** 6 minor. No critical or major finding.
- **Dispositions (all approved as fixes, each a local correction):**
  - F1 the `h1` rule extended to page states and the content area's error display.
  - F2 the password-reset page's visible titles become its `h1`; the hidden `h1` only on sign-in and registration.
  - F3 the success signal names the top bar as the only site navigation, beside the catalog's own regions.
  - F4 decision 2 records why the phone links sit in a drawer.
  - F5 decision 12 names `CollapsibleSubNav` and its fixed position.
  - F6 the Problem section notes the 3-vote minimum the windows still send TMDB on rating sorts.
- **Shared causes:** none.
- **Stop reason:** fixes approved. A second round declined on the fixes' merits (minor local corrections only, checked
  at source by the author). Pass 2 approved.
- **Elapsed:** check about 19 minutes; verification and disposition about 10 minutes.

## 2026-11-11 — Design draft — Design review — pass 2 (limit reached)

- **Runner:** independent, a fresh general-purpose subagent, read-only. Prior looks given as context only.
- **Rubric:** the pass-one rubric at artifact scope.
- **Counts (verified):** 1 major, 7 minor.
- **Dispositions (all approved as fixes):**
  - F1 a phone-width check added to the browser smoke tier against ADR-039's scope, with no disposition: new design.
    The new ADR supersedes ADR-039 in part with one phone-width spec of the shell, the testing strategy follows, and
    the keyboard checks move to component tests.
  - F2 URL years still narrowing the windows: local correction, fixed at the rule (a window ignores what it fixes
    however the visitor arrives), covering the earlier sort-only case too.
  - F3 "Newest films" leading with unreleased films: local correction, recorded as accepted; an inbox errand checks
    live data and the possible cap at today.
  - F4 the phone search field's close, Escape and focus: local correction.
  - F5 loading states under the `h1` rule: local correction (exempted).
  - F6 the sign-in pages' loading and errors, and Sign in's return path there: local correction.
  - F7 old window names in the filter bar and on the home page: local correction.
  - F8 "sticky" left in Boundary fit: local correction.
- **Shared causes:**
  - Arrival by URL handled per filter rather than by rule: F2, a sibling of the first repair check's Highest rated
    case.
  - Earlier repairs not carried to every passage: F5, F8.
- **Re-entry valve:** offered, since F1 originates in pass one's new-design accessibility fold and its fix is new
  design again; declined by the Owner as a single finding on test scope rather than design running deeper than the
  stage.
- **Stop reason:** the Class Heavy cap reached; fixes approved, fix check round 1 since pass 2 approved with them.
- **Elapsed:** pass about 18 minutes; verification and disposition about 15 minutes.

## 2026-11-11 — Design draft — Design review — fix check, round 1 since pass 2

- **Runner:** independent, a fresh general-purpose subagent, read-only, briefed with the approved repairs only.
- **Rubric:** the pass-one rubric at fold scope over pass two's repairs.
- **Counts (verified):** 4 minor. No critical or major finding; pass two's major (the smoke tier's scope) closed.
- **Dispositions (all approved as fixes, each a local correction):**
  - F1 the windows remove the year range from their URL, rewritten in place; the backend's unprotected derived year
    bounds routed to the inbox as an errand, outside this work.
  - F2 the Newest-order claim names `addReleaseDateRange` and `VoteCountPolicy`.
  - F3 Sign in keeps `next` on the sign-in page only; the other two sign-in pages carry none.
  - F4 ADR-039's superseded part named, and the quality-gates strategy and the technical overview added to what
    changes.
- **Shared causes:** none.
- **Stop reason:** fixes approved; a second round declined on the fixes' merits (minor local corrections, checked at
  source by the author). The review settles: the Class Heavy cap is reached and the last look found no material
  finding.
- **Elapsed:** check about 15 minutes; verification and disposition about 10 minutes.

## 2026-11-11 — PRD — PRD review — pass 1

- **Runner:** independent, a fresh general-purpose subagent, read-only; no session files loaded.
- **Rubric:** assess-design-proportionality, design-audit at its spec point, spec-review at the detailed form (with
  source-grounding at artifact scope and the ADR question), the PRD stage's rules, and fidelity to the draft.
- **Counts (verified):** 3 major, 7 minor. All ten confirmed at source; none refuted.
- **Dispositions (all approved as fixes):**
  - F1 a `ring` focus rule for every indicator, against ADR-015 and ADR-017's border-only focus for inputs and select
    triggers: local correction. Focus takes the two forms the ADRs set; decision 13 cites them.
  - F2 requirements without a success criterion (R16, R17, R1, R6, R19, R22, R27): local correction, at the cause.
  - F3 the phone bar's fit: new design. Avatar-only trigger below 1024px, the username cut off past 12rem above it,
    a smaller wordmark name on phones, fit from 360px, and the phone spec at 360×800.
  - F4 the outline-shorthand claim false for the radio recipe: local correction.
  - F5 the error display's heading level unrecorded and unchecked: local correction.
  - F6 "what this work builds or touches" ambiguous across R29, R30 and the non-goals: local correction.
  - F7 no title rule for URL values outside the table: local correction.
  - F8 no landmark for the smoke specs to find the bar by: local correction (the bar is the banner landmark).
  - F9 the README's feature line outside the documentation sweep: local correction.
  - F10 process vocabulary in a decision, and two wording slips: local correction.
- **Shared causes:**
  - Success criteria written by area rather than walked requirement by requirement: F2, F5.
  - R29's rule worded past what was grounded: F1, F4, F6.
- **Stop reason:** fixes approved; fix check round 1 since pass 1 approved with them. Pass 2 (the Class Heavy cap)
  recommended after it.
- **Elapsed:** pass about 25 minutes; verification and disposition about 20 minutes.

## 2026-11-12 — PRD — PRD review — fix check, round 1 since pass 1

- **Runner:** independent, a fresh general-purpose subagent, read-only, briefed with the approved repairs (C1–C10)
  and the reviewed version; no session notes or working memory loaded.
- **Rubric:** the pass-one rubric at fold scope over pass one's repairs.
- **Counts (verified):** 1 major, 5 minor. All six confirmed at source; none refuted. C4, C5, C8, C9 and C10 closed
  clean; C2, C3, C6 and C7 closed with minor residue; C1 produced the major.
- **Dispositions (all approved as fixes):**
  - F1 menu items never take keyboard focus in Chakra's `Menu`, so R29's ring rule for them never fires and Chakra's
    `bg.emphasized/60` highlight would show: new design. The account menu's panel takes `popover`; its highlighted
    item, from keyboard or pointer, takes a `tertiary/12` tint and an inset `ring` outline, set on its own items;
    `verify-contrast` gains the `popover` pairs (all pass today). R29's focus forms are now listed control by
    control. The select options, highlighted the same way, keep their tint: decision 13's 3:1 names what it covers,
    § 5 records the options, and the inbox's Chakra-recipe audit entry gained the finding (Owner's choice, as
    recommended).
  - F2 the advanced-filters toggle's border focus: local correction (listed in the border form with its select group).
  - F3 the 360px check unable to fail for long usernames: local correction (whole-box bounds, no username text at
    360px, a component test for the 12rem cut; the phone controls' names joined criterion 15).
  - F4 § 5's "doesn't build or touch" and R30's baseline label: local correction.
  - F5 unreadable years, unlabelled genres in the count and range order: local correction (the title matches the
    request).
  - F6 criterion 14 without `/testlogin`'s loading fallback: local correction.
- **Shared causes:**
  - R29's rule worded past what was grounded: F1 (major), F2. Its second look with a material finding (pass 1 F1 was
    the first); fixed at the rule by listing each control's form.
- **Stop reason:** fixes approved; pass 2 (the Class Heavy cap) approved by the Owner.
- **Elapsed:** check about 18 minutes; verification and disposition about 10 minutes.

## 2026-11-12 — PRD — PRD review — pass 2 (limit reached)

- **Runner:** independent, a fresh general-purpose subagent, read-only on the checkout; no session notes or working
  memory loaded. It wrote one contrast probe script to the session's scratchpad despite the no-files instruction; the
  checkout was unchanged.
- **Rubric:** the pass-one rubric over the whole PRD, with pass one's and fix check round 1's findings and repairs as
  context.
- **Counts (verified):** 1 major, 5 minor. All six confirmed at source; none refuted.
- **Dispositions (all approved as fixes; F1–F3 folded into R29's re-derivation):**
  - F1 decision 13 claims ADR-015 and ADR-017 cover two R29 choices they contradict (the advanced-filters toggle in
    the border form; a `ring` on the menu's highlighted item, which shows on pointer hover): new design. The toggle
    takes the button ring; the highlighted menu item takes a solid `tertiary` fill with `on-tertiary` text.
  - F2 the theme-picker precedent draws no border and leaves item text in `fg`: local correction.
  - F3 Chakra defaults R29's rule governs but its lists never reach (selection, the trigger's avatar, the drawer's
    backdrop, the button recipe's `_expanded` fills): new design, settled by the inventory.
  - F4 R12's loading exemption narrower than the draft's: local correction.
  - F5 the phone search's covered controls: new design. The open search replaces the bar's row.
  - F6 two strategy statements the shell makes false: local correction.
- **Shared causes:**
  - R29's rule worded past what was grounded: F1 (major), F2, F3. Its third look with a material finding (pass 1
    F1, fix check round 1 F1, pass 2 F1).
- **Trend:** sustained non-convergence on that cause; pass 2's major also originates in round 1's new-design fold.
- **Stop reason:** re-entered. The Owner chose to re-derive R29 and decision 13 from a full inventory of the Chakra
  components and global styles the listed pieces render (route a, over narrowing R29 to the shell's new pieces or
  fixing in place and stopping at the cap), then spec-review over the section and a fresh review loop with a fresh
  cap. This loop ends here; its findings join the new loop's first pass as context.
- **Elapsed:** pass about 28 minutes; verification and disposition about 35 minutes.

## 2026-11-12 — PRD — PRD review — pass 1 (fresh loop after re-entry)

- **Before the pass:** R29 and decision 13 re-derived from an inventory of every Chakra component and global style the
  shell's pieces render, pass 2's six fixes folded in, and the section's readiness checked by the author (not
  independent). The Owner approved the role picks, among them the avatar in `layer-02` with a `foreground` initial and
  Chakra's global text-selection color kept as a recorded exception. `main` merged (#178) before the pass.
- **Runner:** independent, a fresh general-purpose subagent, read-only; no session notes or working memory loaded;
  wrote no files. The earlier loop's three reports supplied as context only.
- **Rubric:** the pass-one rubric over the whole PRD.
- **Counts (verified):** 6 minor. No critical or major finding. All six confirmed at source; none refuted.
- **Dispositions (all approved as fixes, each a local correction):**
  - F1 the advanced-filters toggle unnamed and stateless, and § 5's exceptions without a reason: R22 names it
    "Advanced filters" with `aria-expanded`; § 5 gives both entries' reasons.
  - F2 the error display's rings on the alert's `destructive/10` tint: R29 names it and adds the pair (4.2:1 at least).
  - F3 criterion 10 without `navbar-height-mobile`: R28 removes both foundation tokens; criterion 10 checks both.
  - F4 the menu-recipe reason undercut by the shared button fix: restated (a recipe would make the theme picker's
    highlighted and chosen items look alike); § 5 notes the button fix reaches the picker's trigger.
  - F5 R31 missing the styling strategy's second statement of the menu hover pattern: both named; the search covers it.
  - F6 staging's sign-up skip, and the search field's focus trigger: worded; criterion 11 checks the field's border
    stays unchanged while its Search button has focus.
- **Shared causes:** none new. R29's cause produced no material finding in this loop.
- **Stop reason:** settled. The pass met the bar (no critical or major finding), and the Owner approved stopping after
  the fixes; the post-settle coherence re-read covers their residue.
- **Elapsed:** pass about 26 minutes; verification and disposition about 15 minutes.

## 2026-11-12 — Task list — Task-list review — pass 1

- **Before the pass:** the task list generated at the `high` path (skeleton, fill, grounding at full depth), with a
  jsdom probe of focus rings, `:has()` and the select recipe's slot merge. One PRD amendment landed first, on the
  Owner's approval: R29 names the select indicator's roles (`foreground`, `on-muted` disabled), wording only, with its
  author spec-review and readiness check; no independent amendment pass (the task list's review reads the PRD).
- **Runner:** independent, a fresh general-purpose subagent, read-only; read only its brief under the workspace; wrote
  no files.
- **Rubric:** task-audit at full depth (grounding floor and the eight categories), executability, fidelity to the PRD,
  and the stage's task-list rules, over the PRD and the task list.
- **Counts (verified):** 2 major, 6 minor. All eight confirmed at source; none refuted.
- **Dispositions (all approved as fixes, each a local correction):**
  - F1 the ghost button's expanded block copying `_active` keeps Chakra's fill under the deep config merge: each
    `_expanded` block sets every property Chakra's sets; ghost takes a transparent fill; the test checks background
    and text.
  - F2 task 2.3 breaks the sign-in spec until 2.4.c: a new 2.3.c moves the spec's account steps with the control.
  - F3 the focus-outline test can't discriminate ghost and secondary, whose text equals `ring` in Marquee light: the
    test sets a text color unlike `ring`.
  - F4 the error display's separator renders only with `showErrorDetails`: tested on `ErrorBoundary` directly, and
    `BaseLayout`'s boundary takes `App`'s setting.
  - F5 shared pieces lacked the props later tasks need: `SearchField`, `MainNavLinks` and `Wordmark` props named
    where each is built.
  - F6 the dev-only sequential page shares the `browse` list: a `catalogWindow(pathname)` helper keys Films' marking,
    the title, the window rule and the tabs; `GridHeader`'s `visible` still hides the count and pagination controls.
  - F7 "keyed by" read as a remount: "a reset key", not a React `key`.
  - F8 criteria 1 and 5 lacked a case each: the drawer while resolving; `maxRating` on the tab switch.
- **Shared causes:** none across findings.
- **Stop reason:** fixes approved; the fix check (round 1) and pass 2 (the Class Heavy cap) await the Owner's approval.
- **Elapsed:** pass about 28 minutes; verification and disposition about 10 minutes.

## 2026-11-12 — Task list — Task-list review — fix check, round 1 since pass 1

- **Runner:** independent, a fresh general-purpose subagent, read-only, briefed with the approved repairs (F1–F8)
  and the reviewed version; loaded under the workspace only its prompt and `tasks-pass1.md`; wrote no files.
- **Rubric:** the pass-one rubric at fold scope over pass one's repairs.
- **Counts (verified):** 5 minor. All five confirmed at source; none refuted. F1, F3, F4, F7 and F8 closed clean;
  F2, F5 and F6 closed with minor residue.
- **Dispositions (all approved as fixes):**
  - F1 2.3.b still breaks the sign-in spec until the separate 2.3.c: local correction (the spec's account steps and
    the five-spec run fold into 2.3.b; 2.3.c removed).
  - F2 2.3's title without R30: local correction.
  - F3 `SearchField`'s `autoFocus` and `onEscape` and `MainNavLinks`' `onNavigate` untested where they land: local
    correction (cases in 2.2.a and 2.4.a).
  - F4 `catalogWindow`'s URL matching unsettled against the router and `getFetcherAndSource`: new design.
    `catalogWindow` lives in `src/utilities/catalogWindow.ts`, matches as the router does (ignoring letter case and a
    trailing slash), and `getFetcherAndSource` picks its three lists through it; unit cases in 2.4.a.
  - F5 no case pins the sequential page's kept title and hidden pagination controls: local correction (cases in
    5.3.a; the Implementation Notes' pass-first examples name them).
- **Shared causes:** pass 1's F6 repair carries two of the five (F4, F5); no cause repeats from the pass.
- **Stop reason:** fixes approved; the Owner skipped round 2 (minor-only fixes, as recommended) and approved pass 2
  (the Class Heavy cap).
- **Elapsed:** check about 18 minutes; verification and disposition about 10 minutes.

## 2026-11-12 — Task list — Task-list review — pass 2 (limit reached)

- **Runner:** independent, a fresh reviewer subagent (read-only tools); loaded under the workspace only its prompt;
  wrote no files.
- **Rubric:** the pass-one rubric over the whole task list and PRD, with pass one's and fix check round 1's findings
  and repairs as context.
- **Counts (verified):** 5 minor. All five confirmed at source; none refuted.
- **Dispositions (all approved as fixes, each a local correction):**
  - F1 2.4.c's "search field by label" collides after 3.2.b with the phone row's hidden "Search films" button
    (Playwright's `getByLabel` matches `aria-label` on any element, hidden ones included): 2.4.c and 3.4.a find it by
    role; the Implementation Notes say why.
  - F2 4.1.b's two cases pass today through `LoadingLayout`, and "no banner" can't tell the last-resort display from
    a content-area catch: case one also checks no footer; both join the pass-first list.
  - F3 the note that jsdom applies no breakpoint: jsdom 31 evaluates media queries at 1024px, where `lg` applies;
    the note and 3.2.a corrected, the row switch kept on `NavBar`'s row wrappers.
  - F4 4.1.a tied kept state to clearing an error: split into two cases.
  - F5 1.2.a's transparent ghost background against `expectResolvedColor`: asserted directly as zero alpha.
- **Post-settle coherence re-read:** 4.1.a's kept-state case also passes today and joined the pass-first list; the
  breakpoint note names the switch between the rows, since `AccountControl`'s username has its own `lg` rule.
  a full read against the PRD then gave 2.4 R21 (its resolver change), named 2.4.a's other test files, named a
  narrow break for each of 4.1.b's cases, and found the resolver change safe against the existing resolver and
  routing tests (all use the full catalog paths). Success Criteria still identical to the PRD's; markdownlint clean.
  Criterion 1's "a CSS breakpoint that jsdom doesn't apply" was amended in the PRD and its copy, on the Owner's
  approval (wording only). Task list and PRD committed as `070cbdfd`.
- **Shared causes:** none across findings.
- **Stop reason:** settled. The pass met the bar (no critical or major finding) at the Class Heavy cap, and the
  Owner skipped the fix check on its minor-only fixes; the post-settle coherence re-read covered their residue.
- **Elapsed:** pass about 29 minutes; verification and disposition about 15 minutes.


## 2026-11-12 — Implementation — Author verification walk

- **Scope:** `Success Criteria > Implemented > 1–16` and `Success Criteria > Proven after merge > 17` in
  `tasks-navigation-shell.md`; complete diff from `main`'s merge base `2c2cd288a04ba610c67897b3c735124a0b956935`
  through `573856dccc6cf81cf904cca9508bea19fde3ae54`, plus the working-tree verification documentation; resulting tree.
  The older local base also includes authentication and logger changes merged into this branch before implementation.
- **Preconditions:** all implementation tasks are complete; PRD Open Questions is None. The work remains Class Heavy.
- **Criteria:** 1–16 met, with source/check evidence beside each unchanged criterion in the task list. Criterion 17
  remains open for the PR smoke job, post-merge staging smoke and production sequential-route rejection; none of
  those has been claimed or run here.
- **Checks:** 1,294 backend tests; 2,867 frontend tests in 90 files; all six Chromium specs (seven cases); backend
  Ruff lint and format; frontend ESLint, Prettier, Chakra typegen and TypeScript; pinned Pyright (zero errors and
  warnings); markdownlint; production build; contrast (1,398 passed, 272 scoped out, zero failed); API artifact
  regeneration with no drift. Removed-source-token and current-documentation searches passed.
- **Environment corrections:** the runner wrapper's sandbox temporary-file writes were refused; each affected
  command was retried with escalation and executed under the registered local policy. Initial Prettier ran from the
  repository root without the frontend ignore file and inspected generator-owned artifacts; the correct frontend
  invocation passed. Initial Pyright still selected the shared older Django stubs; the corrected venv selector uses
  an isolated django-types 0.24.0 overlay, with the shared environment preserved, and passes. A rejected combination
  of Python-path and venv-path flags did not run a check.
- **ADR:** inspected ADR-044's decision/body against the PRD's dispositions and reader-independence requirement;
  accepted it in the working tree on the local calendar date. ADR-002 and ADR-039 already name its supersession.
  The optional HEAD-only ADR-record check reports the committed Proposed status, as expected before this edit is
  committed; it needs a rerun after the documentation commit. The same checker's status parser confirms the working
  file reads Accepted (2026-11-12). No commit has been authorized.
- **Execution records:** frontend tests `902f736aa4a04bdab20d9288c91867ed`; browser smoke
  `e7e172f0149f4cc9ac93736d34b0c375`; build `84fef4ef26d740e0a0a4d418084a7d80`; corrected Pyright
  `a56e0c618235463caf62b22387f0cc11`. Backend checks ran in this worktree's isolated container. Other command logs
  are retained with this work unit's verification run.
- **Findings:** no unmet implemented criterion found in the author walk. This is not an independent pass or a code
  review.
- **Next:** recommend one fresh-context independent verification pass, pass 1 of the Heavy cap of 2. Await the
  Owner's decision before invoking it. Task 6.1 and the task/PRD completion statuses remain open until that decision
  and any findings settle. No push, PR, merge or staging operation was requested.


## 2026-11-12 — Implementation — Criteria verification — pass 1

- **Runner:** fresh read-only reviewer subagent `/root/criteria_verification`, with no inherited author context.
  The Owner explicitly approved this pass. Class Heavy; this is pass 1 of the cap of 2.
- **Rubric and scope:** the unchanged success criteria and governing PRD over the complete author-walk scope:
  baseline `2c2cd288a04ba610c67897b3c735124a0b956935`, target
  `573856dccc6cf81cf904cca9508bea19fde3ae54`, and the working-tree ADR acceptance edit. The neutral task artifact
  carries the pre-implementation plans and exact current criterion text without marks or author evidence; its text
  was checked against all 17 live criteria. The retained diff substitutes that artifact for the task-list diff.
- **Coverage:** the reviewer considered every criterion and the supplied aggregate change, including the historical
  authentication/logger merges. It inspected implementation and test assertions and independently ran contrast and
  targeted probes. It did not rerun component suites, build or the browser tier, and did not attest their execution.
  The earlier full-run execution evidence remains the primary's evidence. Criterion 17 stays a later obligation.
- **Verified counts:** 1 major, 1 minor; both source-supported, none refuted.
- **Proposed dispositions, awaiting approval:**
  - F1 (reviewer finding 1), major, FIX (local correction), fails criterion 4: ordinary-object lookup admits inherited
    sort keys. Actual parser/formatter calls reproduced the crash for `toString`, `constructor` and `__proto__`, while
    `unexpected` returns All films. Restrict pattern lookup to declared sort keys and add fallback regressions.
  - F2 (reviewer finding 2), minor, FIX (local correction), fails criterion 2/R9: Escape is handled on the input alone.
    The primary also reproduced this at 360px in the live worktree: Tab reaches Search, Escape leaves search open;
    Escape on Close search also leaves it open. Handle Escape throughout the open search region and test keyboard
    focus on both buttons, including return to the opener.
- **Verification scope of both proposed fixes:** full (behavioral interaction/contract changes), with related
  regression tests, frontend lint/format/types and affected browser checks. No commit or push is part of the proposal.
- **Shared causes:** none: one is prototype lookup at an unchecked URL boundary; the other is keyboard-event handling
  attached to only one control. Their narrow tests missed different input states, rather than sharing a code cause.
- **Effect on the author account:** these verified failures supersede the earlier met conclusions for criteria 2 and
  4. Task 6.1 remains open; no finding-driven implementation or task-list edit has been applied pending approval.
- **Continuation:** no loop termination yet; awaiting the complete disposition decision. If the fixes are approved,
  offer a fresh fix check after they land, then recommend a separately approved complete pass 2 once repairs settle,
  because this complete pass found a major failure. Neither look is authorized by approval of fixes alone.
- **Elapsed:** about 9.1 minutes through source verification and disposition preparation.
- **Kept artifacts:**
  - `prompt-verification-pass1.md` (prompt), SHA-256 `1c15d35605b214bf6ba5a4221bd56ccbe8b853f617a0930452adb36c78348d6b`.
  - `tasks-verification-pass1.md` (neutral task artifact), SHA-256 `41f884e87b584bb2206539991b87797388dec42dbde22354d3f80fb33ec7b442`.
  - `diff-verification-pass1.patch` (aggregate diff), SHA-256 `6f67cac3f8c83d9ee0402586d18a0074ea02b9108d54daa7d2c506eb7e6da6cb`.
  - `report-verification-pass1.md` (exact reviewer report), SHA-256 `b8a12cfa32a95e30c161277be014152d3dff26a3d2381b0529381b664393448f`.
- **Primary browser probe:** routed run `de9dd27210bf4ed09ddc8df39950e435`; no source changes or authentication writes.


## 2026-11-12 — Criteria pass 1 — Approved repairs applied

- **Approval:** the Owner approved F1 and F2 as proposed, both FIX (local correction), with full behavioral
  verification. The approval covered the repairs and their checks, not an independent fix check, successor pass,
  commit or push. Their execution is recorded as Tasks 6.2 and 6.3; Task 6.1 remains open.
- **F1:** `catalogTitle` now looks up only own sort-pattern keys. Nine new cases (three inherited names across three
  windows) failed with the exact formatter TypeError before implementation, then all 85 title cases passed. Plain
  and labelled-filter fallback variants share the same lookup, so these coupled cases were batched before that one
  implementation change.
- **F2:** the phone row owns Escape for the whole search region; the input-only callback and its former isolated
  wiring assertion were removed. The input's existing Escape coverage stays in the phone tests; the new Search and
  Close search cases verify closure and opener focus after keyboard navigation. Both new component cases and the
  browser spec failed before implementation. These coupled focus states were batched before the one row handler.
- **Checks after repairs:** 146 related tests across eight files; five affected Chromium specs, six cases, with
  both new browser Escape paths; frontend ESLint, Prettier and TypeScript; documentation lint and whitespace checks.
  All passed. A new component query used Playwright's unsupported `exact` option in Testing Library; removing it
  resolved the mechanical type error, and the corrected type check passed.
- **Not repeated:** full frontend/backend suites and registration smoke, which passed in the earlier verification
  run. These fixes touch only frontend title/search behavior; the related tests and affected browser cases were
  rerun. No generated types, backend or theme recipes changed.
- **Criteria:** author evidence for 2 and 4 now includes the verified regressions and repairs. All criterion text
  remains unchanged. This does not turn the material-finding pass into a converged result.
- **Independent continuation:** recommend fix check round 1 since pass 1, then complete pass 2 once repairs settle.
  No further independent look has run. The next offer may seek explicit conditional approval for pass 2 if the fix
  check returns no findings. Session pointers identify this review boundary.
- **Execution records:**
  - title RED: `6e21cdaacdc6482686b5f1ccd14d2d62`.
  - title GREEN: `0b332341eeb94a91ae4fa2291c0bcfaa`.
  - phone component RED: `c50ffe67a90d4c3f9fe6db053af150a0`.
  - phone browser RED: `f0de29c25e4849938ef3e1aa28f2f854`.
  - phone/search GREEN: `29e1307d3dca491495b4b2972185532e`.
  - related tests: `f437dcf8c53345bd9dcd1728115241d3`.
  - affected browser tier: `7224ddd2f5ac4b7bac73081c116543ef`.
  - frontend lint: `e894961d997e4ecd89e070b6eea1e899`.
  - corrected frontend types: `b94372f871304a43b994743891100fbd`.


## 2026-11-12 — Criteria pass 1 — Independent continuation authorized

- The Owner approved fix-check round 1 and conditional complete pass 2 if the check returns no findings. The
  conditional pass is held until the independent round returns and its source verification resolves cleanly.
- Round 1 runner: fresh read-only reviewer `/root/verification_fix_check`; no inherited author context. Scope:
  the seven-file repair delta from `573856dc` to the working tree, with kept before/after versions and the PRD.
  Rubric: closure, behavioral grounding, propagation/completeness and new failure.
- The prompt supplies the findings, approved actions and change account without the primary's repair-verification
  claims. `prompt-verification-pass1-round1.md`, `diff-verification-pass1-round1.patch`, the kept source copies and
  `manifest-verification-pass1-round1.json` preserve its inputs. The check is in progress; no result is implied.


## 2026-11-12 — Implementation — Criteria verification — fix check, round 1 since pass 1

- **Runner:** independent read-only reviewer `/root/verification_fix_check`, fresh context.
- **Rubric and target:** closure, behavioral grounding, propagation/completeness and new failure over all seven
  repaired source/test files. All kept before copies match `573856dc`; all after copies match the live tree and
  retained manifest. The reviewer read the complete current artifacts, PRD and relevant callers.
- **Counts:** zero findings. F1 and F2 both closed, with no new failure found in the repair delta.
- **Independent execution:** all three title/phone/search suites passed: 97 tests, routed run
  `18c64109cfe540f490bbe050d68589cf`. The reviewer inspected the phone browser spec but did not rerun it.
- **Primary source verification:** checked the own-key guard, the conditional bubbling Escape handler and the only
  two production SearchField consumers; no `onEscape` consumer remains. The seven live files still match the reviewed
  hashes. The earlier affected browser run independently supplies the primary's actual execution evidence.
- **Shared causes:** none added; the two repaired mechanisms remain distinct.
- **Response performance:** both approved full-scope fixes are applied and author-grounded; the independently
  approved fix check returned no findings. Its browser-execution limitation does not leave a repair unresolved:
  source coverage is complete and the primary's affected browser run covers both new paths.
- **Trend:** converging. Critical/major counts: Criteria pass 1: 1 → 0 (this fix check). Repair closure concerns the
  delta, not undiscovered defects in the complete work unit.
- **Continuation:** the Owner's conditional complete-pass-2 approval is now eligible. No additional round is offered;
  the full pass remains a separate independent look.
- **Kept artifacts:**
  - `prompt-verification-pass1-round1.md`, SHA-256 `346e050edab929b3dc5ace983f89e49d0d45fbac0d8fe6c3a7ed22c511dd6aae`.
  - `diff-verification-pass1-round1.patch`, SHA-256 `0f7d383a8edc8f7903746310781d531967969e8d49fa580074fb5bc1faf6ac1a`.
  - `manifest-verification-pass1-round1.json`, SHA-256 `9114d50fbe07f69c142d0f872ecffff2f5eca794e78d26435255a1f98f5fd3e7`.
  - `report-verification-pass1-round1.md`, SHA-256 `8160e03655fc0e063f7e5cb94356ec3021c0aa624924d2ae00893e0c7b061fe2`.


## 2026-11-12 — Implementation — Criteria verification — pass 2 admitted (limit reached)

- **Authorization:** the Owner explicitly approved pass 2 conditional on a finding-free fix check. The independent
  round returned zero findings and primary source verification found no unresolved repair. The conditional approval
  is consumed by this admission, not inherited from fix-check approval.
- **Runner:** fresh read-only reviewer `/root/criteria_verification_pass2`, with no inherited author context.
- **Scope:** the same baseline `2c2cd288a04ba610c67897b3c735124a0b956935` through `573856dc`, including the current
  uncommitted repairs and ADR acceptance, with exact final diff and artifact hashes. Current task headings/goals and
  all 17 immutable criterion texts are supplied without author marks/results. Prior findings and approved changes
  are context after the complete artifact read; author walk and repair-test claims are withheld.
- **State:** complete pass in progress. This is the Heavy cap of two; no result or additional authorization is implied.


## 2026-11-12 — Criteria pass 2 — Source coverage complete, execution evidence pending

- The independent reviewer inspected the complete selected source/criteria scope and matched all 122 manifest
  entries twice. It found no actionable implementation or test-coverage defect, but explicitly left execution proof
  for criteria 9, 11 and 12 unresolved. This is not recorded as a clean or completed pass.
- The bounded test attempt `96ae5b64ea1446d086b4159c1ef2558b` is `not_run`; its runner snapshot preparation was
  refused by the filesystem sandbox. The reviewer reported automatic approval rejection of escalation because
  runner-private snapshot writes conflicted with its read-only brief. No test result is inferred from that attempt.
- The development session is obtaining the missing machine evidence through its authorized check scope: fresh
  production build, contrast and the full local six-spec tier. Contrast has passed; build and smoke are queued.
  The reviewed source remains unchanged. After actual results, the same reviewer will assess only the unresolved
  evidence, preserving completed source coverage of this exact target; this is continuation of pass 2, not a third pass.
- `report-verification-pass2.md` retains the exact initial report, including its evidence limitations. The eventual
  bounded supplement will remain separate so those original limitations are not rewritten away.


## 2026-11-12 — Implementation — Criteria verification — pass 2 completed (limit reached)

- **Runner and retained coverage:** `/root/criteria_verification_pass2` preserved its complete earlier source and
  per-criterion review. Its separately retained evidence supplement assessed the three unresolved runtime-evidence
  loci without repeating the complete source review. The 122-entry source manifest continued to match throughout.
- **Verified counts:** zero findings; no unresolved locally implemented criterion. This is the second complete pass
  at the Heavy cap, not a third pass or another fix check.
- **Execution evidence:** the reviewer inspected raw command outputs, runner histories, snapshot differences and
  emitted assets. The primary separately confirmed status 0 command outcomes for the build, fresh contrast, initial
  full smoke, affected post-repair smoke, related tests and independent repair-check executions.
- **Applicability:** the completed build's asset inventory matches the retained output and excludes BrowseSequential.
  The repairs leave the development-route guard and build configuration unchanged, so that build remains applicable
  to criterion 9. Fresh contrast passed 1,398 checks with zero failed and 272 scoped out. The initial six-spec smoke
  run passed seven cases; after the repairs the five affected specs passed six cases, including both keyboard Escape
  paths. Registration and its exercised wide-bar behavior are unchanged, so its earlier passing result carries.
- **Limits retained:** runner histories describe execution from the live working tree; snapshots supply context,
  not an immutable-execution claim. Independent review does not attest the separate caller gate record. Criterion 17
  remains open for its explicit PR and post-merge staging obligations. No staging work has run here.
- **Safe completion after the reviewer's automatic-approval rejection:** the development session supplied raw machine
  records and read-only execution histories for the unresolved evidence. The reviewer's read-only source boundary
  remained in force; it made no new execution or snapshot-writing attempt. The original evidence-incomplete report
  is retained unchanged, with its resolving supplement beside it.
- **Redundant queued runs:** build `9bf8262366164fea9e12df0dda21ac4f` and smoke
  `6add8ae34c7243d9a038089027d7d357` were cancelled through their own execution sessions before either started.
  They contribute no passing evidence. Their cancellation followed the completed applicability assessment; no
  required result is inferred from a cancelled or not-run check.
- **Shared causes:** none beyond the two distinct mechanisms resolved in the approved repairs.
- **Trend:** converging. Critical/major counts: Criteria pass 1: 1 → 0 (fix check); Criteria pass 2: 0.
- **Stop reason:** converged, with the two-pass allowance exhausted. All reported findings have approved dispositions
  and their repairs are settled; no further verification pass is proposed.
- **Lifecycle:** Task 6.1 is complete; task-list and PRD status are Complete, and the local completion date is recorded.
  Those status/pointer updates follow the review and change no requirement or implementation. Success-criterion text
  stays unchanged. Next is completion preparation from archive-completed.md § 1b, with the existing no-drift API
  regeneration evidence available. No commit, push, PR, code review or merge is authorized by this review closure.
- **Kept evidence files:**
  - `prompt-verification-pass2.md`, SHA-256 `4f0e53cc86c20492dfa6f2ca7597b9ed5e4a0b795adb36bd387d13c9a95ddaf0`.
  - `tasks-verification-pass2.md`, SHA-256 `8cf7f95f9208e0f954e9b4006f7daee955f17074321f5bc7070d198fd65c6b0e`.
  - `diff-verification-pass2.patch`, SHA-256 `5074a876098adeee7860b5d23ffa5d4baeb53e6f249cb2df830a5a67bc2d0475`.
  - `manifest-verification-pass2.json`, SHA-256 `bd2ff787e92617d8990aa8086f3f13b69be8bbb135f81ed6113b47f9a812ebb7`.
  - `prior-findings-verification-pass2.md`, SHA-256 `fa2ac95d16fb1ed4ab56f00ba960d78a359d49919197c861b75eb7f3b2d4d386`.
  - `report-verification-pass2.md`, SHA-256 `cf5aa3f0283a8ca86ea4dda4762892371eef082d5cc80922051200ca908cb0bf`.
  - `prompt-verification-pass2-evidence.md`, SHA-256 `721001bf1dbdc51ca57b00bb484b71a6ecd27534ed5843ce1d7fac210db88922`.
  - `report-verification-pass2-evidence.md`, SHA-256 `791ff024290e497df9c443fa28c770140094cde40ed258586913bef9829deb87`.


## 2026-11-12 — Completion preparation

- Applied archival cleanup to the completed task record while preserving its later criterion 17 obligation.
  All task lines, goals, checkboxes and criterion text/evidence were compared with the retained pre-cleanup copy
  and remain unchanged. Removed only completed setup guidance, a stale current-test reference and expired
  forward/status wording. No companion notes file exists or needs to be created.
- Created completion-navigation-shell.md with the delivered behavior, implementation highlights, decision/reference
  pointers and still-captured follow-ups. Each claim is mapped to task/source evidence in
  completion-preparation-evidence.md; its date matches the task header and local calendar. No volatile test counts
  or dependency versions are added to the completion document.
- Reused successful no-drift API regeneration evidence after confirming current HEAD and unchanged backend/generated
  artifacts. Markdown lint passed for the prepared documents; no application code changed in this preparation.
- Changes remain uncommitted. Next is explicit commit approval for the two independent repairs and completion
  documentation, followed by archive-completed.md Phase 2's separate code-review stage. Nothing was archived or pushed.


## 2026-11-12 — Approved commit scope completed

- The Owner approved three separate commits: catalog fallback repair, phone-search repair, and completion documents.
- `8d3341e5`: the title guard, its regression suite and the complete Task 6.2 record.
- `efb76803`: phone/search behavior, component/browser regressions and the complete Task 6.3 record.
- `f9bccb98`: Task 6.1 and criterion evidence, completed PRD, accepted ADR-044, cleanup and completion metadata.
- Whole task records were staged with their content; the working task file retained its approved final bytes.
  Before staging, Prettier found a line-wrap-only remainder after the query-option correction; normalization
  changed no test behavior. The complete touched-file formatting check passed afterward.
- All pre-commit and commit-message hooks passed with no warnings; no hooks were bypassed. The committed-head
  ADR-record check now passes: 44 records, three changed, no problems. This resolves the earlier deferred check
  of the then-uncommitted Accepted status. Approved source/test hashes match committed bytes.
- Working tree is clean. No push, PR or merge was performed. Next is the separate code-review stage before pushing.


## 2026-11-12 — Implementation — Code review — pass 1, delegated agent (local)

- Target: `c204d571196bcca2a06503822fd09b775e310d63..f9bccb9838faf5ea8a4e0170fc37d4e74136792b`, merge-base PR diff against current `origin/main`. Clean working tree throughout.
- Rubric: code-review-standard and implementation-audit, plus repository contract coherence.
- Authorization: Owner explicitly approved three bounded local scopes followed by integration and a fresh aggregate evaluator as an exception to the whole-target default. Five fresh reviewer contexts form this one pass.
- Author preflight: no actionable finding; not independent evidence.
- Coverage: 103 paths, exactly one primary owner each: navigation 46, catalog 24, presentation/docs 27, integration/browser 6. Fresh aggregate independently reconciled path/status union and all dimensions; no source-review residual.
- Verified findings: 0 critical, 0 major, 2 minor. NAV-1: portalled drawer outlives the phone row at the responsive boundary; source-grounded. C1: encoded catalog paths disagree with router identity; independently reproduced with installed router and helper.
- Shared-cause search: NAV-1's visibility/portal lifetime also reaches account-menu instances when either responsive row hides. C1's raw encoded-path comparisons also reach Watchlist current state and added Sign in path handling; root probes reproduced these siblings. The two findings have distinct causes.
- Proposed dispositions (pending Owner approval): FIX both, local corrections at full behavioral verification scope, with regressions and affected checks. No findings rejected/deferred and no repairs applied.
- Execution: diff checks and lightweight Node probes passed. Four routed reviewer attempts stopped before execution with read-only temporary-file errors; every history reported `not_run`. No tests, browser journeys, contrast, lint, type checks or builds are claimed from this review.
- Kept artifacts: partition, five exact review briefs and five reports under the work unit's `adversarial-review/`, named `code-pass1-partition.json`, `prompt-code-pass1-{scope}.md` and `report-code-pass1-{scope}.md`; scopes are navigation, catalog, presentation-docs, integration and aggregate. `code-pass1-artifacts.json` retains hashes; primary source verification is retained separately.
- Stop reason: complete findings presented for disposition approval. Both behavioral repairs warrant offering a fresh fix check after their checks pass. No successor complete pass authorized.
- Elapsed: 15.0 minutes from retention of the first scope brief to retention of the final aggregate report, including the five evaluator calls and coordinator source verification. Advisor/preflight preparation precedes that interval.


## 2026-11-12 — Code pass 1 — Approved repair batch

- Owner approved both proposed fixes with regression tests and targeted checks. Both are local corrections at full behavioral verification scope. No commit, push, successor pass or fix check was approved by that response.
- C1 regressions: four catalog identity cases, six encoded auth handling cases, two current-link cases and two routed first-request cases failed first. Routed run `2fde5ef6fa204cf497b5e79966786d4f`: 14 failures, 90 existing cases passing. Initial sandbox run `885416da5e904376b07915f38c1e4d3d` did not execute; the exact retry succeeded in running after escalation.
- Repair implementation and remaining checks in progress.


## 2026-11-12 — Code pass 1 — Approved repairs completed

- NAV-1: Drawer and account Menu roots reset state at the theme's shared `lg` breakpoint, with CSS retaining responsibility for row visibility. The drawer uses Chakra context to close after choosing a link. Browser run `26b0e42b155d44a38053d96c19171d2f` reproduced the stale drawer; after that repair, `f488266c93cc47158f73ddac5f3bc313` reproduced the stale account menu. The final browser checks cover drawer closure and no stale reopening, both account-menu transition directions, visible keyboard focus and usable active controls.
- C1: Catalog and auth-page identity use the router's matcher; Watchlist uses its route-match hook. This covers catalog endpoint/normalization/title/tabs/Films current state, Watchlist current state, added Sign in handling and the shared exclusion of encoded auth return paths. The 14 added cases failed first in `2fde5ef6fa204cf497b5e79966786d4f`; the four regression files passed all 104 cases in `1b4fe2d539f4456ea17db6b9a66426f4`.
- Final affected tests: run `945bc5601cf04994a046c369a6176c4b`, 443 passing cases across 35 of 90 test files, related to the ten changed frontend files.
- Final affected browser checks: run `55ee4727c58741079be9b99ed39bbe8c`, all six cases in five specs passed against the isolated worktree stack. Registration and the earlier full frontend/backend suites were not rerun.
- Frontend ESLint passed (`a1c1df074ba14c53a7802232b72a61e6`), Chakra typegen and TypeScript passed (`7a16ec193105422cb44b642428283c77`), all ten touched frontend files passed Prettier, and documentation lint and diff checks passed. Two formatting corrections were applied before the final checks.
- Sandbox refusals were all not-run attempts, followed by successful exact-command escalations. An initially queued browser invocation without its required base URL was cancelled before execution; no result is claimed for it.
- Task records 6.4 and 6.5 and the completion description reflect the repairs. The immutable Success Criteria were unchanged. No design expansion or code outside the two approved shared causes was introduced.
- Retained repair target: base `f9bccb9838faf5ea8a4e0170fc37d4e74136792b` plus all twelve exact working-tree before/after file copies, bound by `adversarial-review/code-pass1-round1-manifest.json`. Passing terminal outputs are kept privately with this work unit's run evidence; run IDs above carry the routed outcomes.
- Primary checked the final complete repair delta against both findings and their siblings. No new author finding. This is author verification, not an independent fix check.
- Stop reason: both approved minor local corrections complete at full behavioral verification scope; recommend a fresh bounded fix check of the twelve-file repair delta. No fix check, commit, push or successor complete pass has been authorized.


## 2026-11-12 — Code review — fix check, round 1 since pass 1, delegated agent (local)

- Owner explicitly approved the independent fix check. Runner: fresh non-author Codex reviewer.
- Exact target: `f9bccb9838faf5ea8a4e0170fc37d4e74136792b` to all twelve after versions in `adversarial-review/code-pass1-round1-manifest.json`. Reviewer verified before/after hashes, before bytes against the commit and live bytes against retained after files, before and after its complete review. Primary repeated final live-target/coverage verification; no movement.
- Rubric: closure, behavioral grounding, propagation/completeness and new failure; all implementation-audit dimensions plus repository contract coherence across the complete repair delta.
- Verified findings: 0 critical, 0 major, 0 minor. NAV-1 and C1 both closed within their approved scope. No new finding or shared cause; the earlier two causes remain covered across their approved sibling implementations.
- Reviewer executed lightweight probes for router/utility agreement, including encoded separators, double encoding and malformed escapes, plus return-path handling and fresh explicit stdin lint of both changed documents. It did not rerun heavy suites or browser journeys.
- Retained execution evidence independently reconciled: 443 affected tests across 35 files, six Chromium cases across five specs, frontend lint and types. All frontend source matches snapshot `9aacf6e1efad3726f15ccf52ad398e3c457b07ee`; the primary spot-check also found no current frontend delta from that snapshot. The two document edits followed those runs and were separately reviewed/linted.
- Evidence limit: red-run histories alone establish unsuccessful earlier runs; reviewer did not independently attribute each red assertion without full failure transcripts. The primary's recorded fail-first observations remain author evidence. Full suites, registration, other browsers and staging were not newly verified.
- Primary source verification: checked the reset roots/context close behavior, router match consumers and return-path origin/auth exclusion order, and the final complete repair delta. Accepted the clean scoped result; no source changes made after it.
- Trend: no critical or major findings at any code-review look (pass 1 or this fix check). Both minor local corrections are closed; no re-inspection trigger or additional complete pass is recommended.
- Final alignment (§5b): compared the final scope with META-PRD vision/exclusions and TECHNICAL-OVERVIEW on `origin/main` at `649651034dd54e7302aab21e55a250b6413f80fc`, which matches the remote main head. No material disagreement. The PR merge base remains `c204d571196bcca2a06503822fd09b775e310d63`, so original aggregate review coverage is unchanged.
- Stop reason: code review settled; repairs remain uncommitted. Commit and push are not authorized. Next proposed boundary is two atomic repair commits, one per cause, each carrying its associated task/completion update.
- Elapsed: 5.2 minutes from retained prompt to retained report.
- Kept artifact: `adversarial-review/prompt-code-pass1-round1.md` SHA-256 `746777f2367228e3d40130ef3904cdc1281faa0dcc944229912cd807d0102c77`.
- Kept artifact: `adversarial-review/report-code-pass1-round1.md` SHA-256 `b43401cd509cbd3792ba72512318b572dbd15e4c334998adf8dacc9367b6a81b`.
- Kept artifact: `adversarial-review/code-pass1-round1-manifest.json` SHA-256 `d60a3ec8703ac2e6243668a67fdd9dc81c1af5e11df8e1f97c7693a326460d23`.


## 2026-11-12 — Approved atomic repair commits completed

- Owner approved two commits, one per shared cause, with task and completion records riding their content.
- `11fa649b` closes overlay lifetime across responsive layouts, with all of Task 6.4 and its completion paragraph.
- `bddbb51e` aligns encoded route identity, with all of Task 6.5 and its completion paragraph.
- Both pre-commit and commit-message hooks passed, with no warning or bypass. Linked-worktree metadata writes required escalation only after each exact command was refused.
- All twelve committed files exactly match the clean fix-check after versions. Worktree and index are clean; no source or test bytes changed during commit preparation. Existing checks and the clean repair check remain applicable.
- Current ADR validation against origin/main passed: 44 numbered records, three changed, no problems. No extra suite rerun was warranted by committing unchanged reviewed bytes.
- PR title and body prepared under pull-request-format; available repository template/policy checks found no prescription, and the owner's inherited-default contents endpoint returned 404. No process or review metadata appears in the proposed body; its sole design reference is pinned to the final head.
- Stop reason: two approved commits complete; awaiting approval of the proposed PR wording, push and creation. No push, PR, hosted review or merge performed.


## 2026-11-12 — Pull request published

- Owner approved the exact proposed title/body, push and PR creation.
- Branch published at `bddbb51e486f7f8bb42a450fdd11cc9fa2cab0bf`; PR [#193](https://github.com/andrewRCr/CineXplorer/pull/193) targets main and is mergeable, with CI pending. Approved title/body match the GitHub response.
- Initial push succeeded remotely but sandbox blocked local tracking writes; repeating that same approved push after escalation completed the upstream configuration without a new remote update.
- No hosted review requested and no merge authorized. CI-only observation is in progress; target and wait evidence stay in the private observation record.


## 2026-11-12 — PR #193 required CI passed

- Exact published head: `bddbb51e486f7f8bb42a450fdd11cc9fa2cab0bf`. Required `ci-ok` passed; all seven component CI jobs passed in [run 43362895469](https://github.com/andrewRCr/CineXplorer/actions/runs/43362895469), including the end-to-end smoke job.
- Re-read the PR head after collecting required checks and all review-thread states. The target is unchanged, PR is open and mergeable, and no review threads exist. No hosted review was requested; CodeRabbit's automatic skipped state is not review evidence.
- Refreshed origin/main at `c0e5c4febcb8f50d8321061954799a02b23f3f2f` and reran ADR validation: 44 numbered, three changed, no problems. Working tree is clean.
- The prepublication whole-target review and clean repair check cover the final bytes; recommend skipping an additional hosted review. Owner decision on that route and explicit merge approval remain pending.
- Criterion 17's PR smoke portion now has CI evidence. Its post-merge staging smoke and not-found checks remain; no criteria checkbox or tracked source was changed during monitoring.


## 2026-11-12 — Approved merge and post-merge verification completed

- Owner explicitly approved skipping additional hosted review and merging PR #193. Refreshed accepted-head CI and all thread states immediately before merging; ci-ok remained green, no threads existed, and current-main ADR validation passed.
- Merged with the merge strategy and exact expected head bddbb51e486f7f8bb42a450fdd11cc9fa2cab0bf. GitHub returned merge commit cc88dacd4fba8729591fbd1f6921bc47a66ec7d6. No administrative bypass or branch deletion.
- [Main run 43363839434](https://github.com/andrewRCr/CineXplorer/actions/runs/43363839434) completed successfully with all ten jobs green, including staging deployment and staging smoke. Staging executed all five required journey files, including the phone scenario: 16 cases passed, registration skipped; the current main tier also contains background coverage.
- A direct unauthenticated Chromium check at the deployed staging sequential path found the 404/Page Not Found display, home control and no release-window navigation. Routed run 67e030d6c0a143298b4e91bede568c03 passed. Screenshot, trace and video capture were disabled; no staging server commands were run by hand.
- The daemon restart interrupted final evidence recording only. Recovery reread the saved exact target and confirmed the merged PR and completed CI before any action; nothing was merged or deployed again.
- Criterion 17 now has complete behavioral evidence, retained privately in post-merge-evidence-cc88dacd.md and the completed staging observation record. The main checkout must record its checkbox/evidence before closure; no tracked source or criteria text was edited in this worktree after merge.
- New source-verified finding DOC-1 (minor): current main has seven browser spec files but four current reference documents describe six and omit background coverage. Proposed prose-only correction is pending Owner approval for main-checkout closeout; stable loci and exact correction boundary are retained with the evidence. No finding-driven fix applied.
- Stop reason: approved merge and all post-merge behavior checks complete. Main-checkout evidence recording, proposed documentation correction and worktree/archive closeout remain. The worktree session must hand off and end before removal.


## 2026-11-12 — Approved main-checkout prose correction and handoff

- Owner approved DOC-1's prose-only correction during main-checkout closeout and requested a handoff. The approved boundary is the four current reference documents: seven browser specs, six desktop and one phone, with background coverage distinguished from axe-scanned journeys. Historical goals, criteria and ADR accounts remain as written.
- Application, linting and any resulting commit are left to the main-checkout closeout. No new commit/push, finish invocation or cleanup was approved.
- All worktree source is committed and merged; no uncommitted work. Session notes replaced for closeout at bddbb51e, with criterion 17 proof and correction authorization carried forward.
- Working memory reviewed against its removal triggers; none fired, and no cross-work-unit addition is proposed. No memory edit was made.
