# Review Log: landing-page

## 2026-11-13 — Design review — pass 1

- **Stage:** design draft (`draft-landing-page.md`), Class Heavy, cap 2.
- **Runner:** a fresh read-only `reviewer` subagent, independent of the author. Prompt, reviewed version and report
  are in `adversarial-review/` (`prompt-draft-pass1.md`, `draft-pass1.md`, `report-draft-pass1.md`).
- **Rubric:** assess-draft-readiness (divergence, ADR dispositions), assess-design-proportionality, design-audit at
  the draft point, source-grounding at artifact scope.
- **Findings by verified grade:** 8 major, 6 minor; none critical; none unsupported. All 14 confirmed at source.
- **Approved dispositions (Owner):**
  - F1 FIX (local correction): a `/` entry in the axe baseline for the movie cards' unnamed icon buttons, removed with
    the other two by the core user-movie UIs.
  - F2 FIX (local correction): three smoke specs change; the sign-in specs wait for the "Popular in theaters" heading;
    the local hero fixture has no backdrop.
  - F3 FIX (local correction): the sign-out claim corrected; sign-out loads the sign-in page.
  - F4 FIX (new design): the watchlist read's pending and failed states, and the last-film removal accepted.
  - F5 FIX (new design), revised by the Owner: the sign-in "Welcome back" toast is removed and Home's greeting shows on
    arrival, including after sign-in, by first name or username. The app's other toasts went to an inbox errand with a
    rule for when a toast fits.
  - F6 FIX (new design): the hero renders the pitch at once; the hero and sections opt out of the global server-error
    toast; the caching claim corrected.
  - F7 FIX (local correction): the watchlist's order restated as the Library's `added` order.
  - F8 reopened by the Owner: the Films hub shouldn't be only rows, and neither should Home; page composition and the
    hub's size returned to shaping.
  - F9 FIX (local correction): ADR-026 takes a dated amendment pointing to the new ADR.
  - F10 FIX (local correction): the trending rationale reworded.
  - F11 FIX (local correction): the credit sits above the headline on the solid gradient; its "Today's film" label
    dropped (Owner).
  - F12 FIX (local correction): the film check reworded.
  - F13 FIX (new design): the strip names only what works at merge; watched, rating and liking join with the core
    user-movie UIs.
  - F14 FIX (local correction): decision 7 names the strategy and test sites that state one context per tab.
- **Shared causes:**
  - asynchronous reads without stated pending or failed states: F4, F6;
  - readers of changed behavior not swept (specs, baselines, strategies, tests): F1, F2, F14;
  - behavior claims inferred rather than traced at source: F3, F6, F7.
- **Stop reason:** re-entered. The Owner accepted a return to shaping at the `high` level for page composition (Open
  1) and the Films hub (Open 2), after asking that pages not read as stacks of poster rows. A fresh loop with a fresh
  cap follows readiness; its first pass takes these findings as context, not their fixes.
- **Elapsed:** the review about 16 minutes; verification and disposition about 20 minutes.

## 2026-11-13 — Design review — pass 1 (fresh loop)

- **Stage:** design draft (`draft-landing-page.md`), Class Heavy, fresh cap 2, after shaping settled page composition
  (decisions 13–14) and readiness returned ready.
- **Runner:** a fresh read-only `reviewer` subagent. Prompt, reviewed version and report are in `adversarial-review/`
  (`prompt-draft-l2-pass1.md`, `draft-l2-pass1.md`, `report-draft-l2-pass1.md`). The ended loop's findings went in
  as context only, without their fixes.
- **Rubric:** as pass 1.
- **Findings by verified grade:** 4 major, 7 minor; none critical. All confirmed at source; F7's "unreachable" sub-claim
  not supported (the last watchlist film can be removed through a what's-on card showing it).
- **Approved dispositions (Owner):**
  - F1 FIX (local correction): the calendar takes the first 20 films of a response that can hold up to 39 (ADR-038).
  - F2 FIX (new design), with the scope expansion approved: `MovieCard` shows no card actions to signed-out visitors,
    the card controls' own rule applied early; `/browse`'s axe entry removed, `/search`'s kept.
  - F3 FIX (local correction): folded the core UIs' decisions (logs list, one entry per viewing, Activity tab, rewatch
    icon, nothing-saved by watchlist and logs) and named the three user-movie units.
  - F4 FIX (new design): Google's homepage requirements stated from Google's page; the data-use line goes to the
    privacy and terms work.
  - F5 FIX (local correction): `background.spec.ts` stubs Home's reads on both targets.
  - F6 FIX (local correction): Home waits for the session read; a stored sign-in that fails turns Home to the pitch.
  - F7 FIX (local correction): the large card keeps one height; the swap accepted; the last-film path named.
  - F8 FIX (new design): the hero holds its space (fixed height, bottom-set text on wide screens; held backdrop space
    on phones while pending).
  - F9 FIX (local correction): page roles say sort, filter or reorder; card actions work everywhere.
  - F10 FIX (local correction): the calendar rests on weekly grouping.
  - F11 FIX (local correction): decision 10 covered by ADR-039; ADR-044's stale spec count captured in the inbox.
- **Shared causes:** claims checked against today's code but not the documented bounds around it (F1, F11); the
  adjacent design moving under the draft (F3, F2's dependency on the card controls).
- **Next:** pass 2, the cap, approved by the Owner.

## 2026-11-13 — Design review — pass 2 (fresh loop, limit reached)

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-draft-l2-pass2.md`,
  `draft-l2-pass2.md`, `report-draft-l2-pass2.md`). Prior findings and fixes: pass 1's report and its log entry.
- **Findings by verified grade:** 1 major, 6 minor; all confirmed at source. The major was a slip in pass 1's F2 fix
  (the `/browse` axe entry removed though `phone-width.spec.ts` scans `/browse` signed in).
- **Approved dispositions (Owner):** all seven FIX (local correction): `/browse` and `/search` entries kept with a
  signed-in reason, `/` added, all three removed by the card controls; the row-appearing shifts accepted and the
  "newest addition" wording made exact; the greeted flag cleared on every change of user; decision 10 takes a dated
  amendment to ADR-039 and names the strategy and TECHNICAL-OVERVIEW sites; the diary's interim rating display is
  ADR-042's user-rating chip, and both handoffs sent to the core UIs session; decision 5's claim scoped to signed out
  and the headline kept as the app's purpose (Owner); the toast and `Featured` test readers named.
- **Trend:** majors 4 → 1; the remaining one from a fix, not the design.
- **Stop reason:** cap reached; the Owner chose to stop and capture rather than run a pass over the limit.
- **Elapsed:** loop 2's two reviews about 50 minutes; verification and dispositions about 40 minutes.

## 2026-11-13 — Design review — fix check round 1 since pass 2

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-draft-l2-pass2-round1.md`,
  `draft-l2-pass2-round1.md`, `report-draft-l2-pass2-round1.md`). Checked pass 2's seven fixes and the Owner's later
  folds (Google's homepage requirements and scopes, the shared star display and rewatch icon).
- **Findings by verified grade:** 4 minor; all confirmed at source. Six of pass 2's fixes closed fully, fix 2 in part.
- **Approved dispositions (Owner):** all four FIX (local correction): the staging host already sits on a verified
  domain and the launch re-verifies the branding, with no-redirect added to what this work covers; the whole watchlist
  section going named as an accepted shift and the next visit's set qualified; decision 6 says card actions are offered
  on Home, not that they work; the greeted flag names `session.ts`'s change count and `beginUserChange`. The same edit
  numbered the new ADR as ADR-046, as assigned.
- **Stop reason:** clean apart from wording repairs; the Owner chose to stop after them and commit.
- **Elapsed:** the fix check about 15 minutes; verification and dispositions about 5 minutes.

## 2026-11-13 — PRD review — pass 1

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-prd-pass1.md`, `prd-pass1.md`,
  `report-prd-pass1.md`). Rubric: spec-review at the detailed form (with the ADR question), source-grounding,
  design-audit at its spec point, proportionality, draft fidelity and the public-document rules. Upstream chain: the
  committed draft, META-PRD, ADR-026, 027, 038, 039, 044 and 045, the navigation shell's PRD, and the core user-movie UIs'
  draft.
- **Findings by verified grade:** 3 major, 11 minor; all confirmed at source.
- **Shared cause:** the PRD said what Home builds but not where it meets shared code: the card's height against the
  catalog grid's fixed row spacing (F3), the app's padded container (F5), the read path's options and its other reader
  (F9), the card width the card controls need (F14), and the row's interface against its second use (F4).
- **Approved dispositions (Owner):** all fourteen FIX. New design: F3 (the signed-out card loses its footer and the
  grid keeps its 449px spacing, over a row height chosen by status), F5 (Home renders outside `AppLayout`'s container;
  the hero and the band span the viewport), F14 (row cards keep `CARD_WIDTH`, never below 138px). Local correction: F1
  (R20 names its request; the queue's sort value is a read change under R30d), F2 (ADR-046 supersedes ADR-002 in part),
  F4 (the row's scroller and section split), F6 (posters on Home behave as `MovieCard`'s), F7 (the phone hero releases
  its space when the image fails), F8 (the query client's retries stated and accepted), F9 (request options on the read
  path, passed only by Home), F10 (Goals 1 and 5 match the requirements; the session-read wait recorded in decision 1),
  F11 (ADR-026 and ADR-039 superseded in part by ADR-046 rather than amended), F12 (a provisional starter list), F13
  (signed-out composition in criterion 2).
- **Owner's change folded with the fixes:** the hero picks a random film from a list of about 50 (size the Owner's) on
  each page load, held while the app stays loaded, with a development-only `film` parameter for the hand check;
  decision 2, R3, R4, criteria 1, 3 and 14, and ADR-046's title ("Open Home on a classic film and sections of films").
- **Stop reason:** none yet; pass 2, the cap, offered.
- **Elapsed:** the review about 22 minutes; verification and dispositions about 15 minutes; the fixes about 20 minutes.

## 2026-11-13 — PRD review — pass 2 (limit reached)

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-prd-pass2.md`, `prd-pass2.md`,
  `report-prd-pass2.md`). Prior findings and fixes: pass 1's report, its reviewed copy and its log entry, with the
  Owner's hero change named as a decision to attack in how it is carried, not as a draft-fidelity failure.
- **Findings by verified grade:** 8 minor; all confirmed at source. Pass 1's repairs held; the one slip was the README
  line in R29, which the hero change didn't reach.
- **Approved dispositions (Owner):** all eight FIX (local correction): R29's README line names a classic film; the hero's
  query is never dropped from the cache (`gcTime: Infinity`); Home's loading state ends when its reads first settle, and
  a Retry shows only that section's placeholders; R30d sends the queue's sort and direction; Goal 5 scoped to Home's own
  reads; the hero gets a fetcher of its own for the opt-out and `film`; R20 names the bar's Watchlist link; ADR-046
  supersedes only what ADR-044 left of ADR-002 (its trending Future items and the Consequences resting on them), and each
  Status line names its part. ADR-044's six-spec count against the seven-spec tier predates this work and stays with its
  inbox errand.
- **Trend:** majors 3 → 0.
- **Stop reason:** cap reached; a fix check offered.
- **Elapsed:** the review about 17 minutes; verification, dispositions and fixes about 15 minutes.

## 2026-11-13 — PRD review — fix check, round 1 since pass 2

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-prd-pass2-round1.md`,
  `prd-pass2-round1.md`, `report-prd-pass2-round1.md`). Checked pass 2's eight repairs and every passage their
  subjects touch. The runner wrote a probe script to the session's scratchpad (outside the repository) despite its
  read-only brief; nothing in the checkout changed.
- **Findings by verified grade:** 5 minor; all confirmed at source. All eight of pass 2's repairs closed.
- **Approved dispositions (Owner):** all five FIX (local correction): criterion 3 checks the hero's query options
  directly, since the test client already keeps every query; R4 and decision 2 hold the film until a reload or a change
  of user (`resetUserQueries`), narrowing the claim rather than exempting the hero's query; decision 8 and R20 say
  the queue's sort value and direction; decision 10's ADR note names only what ADR-044 left of ADR-002; ADR-046
  supersedes all four of ADR-002's Featured-page Future items and the Consequences resting on them.
- **Stop reason:** clean apart from wording repairs; the Owner chose to stop after them.
- **Elapsed:** the fix check about 10 minutes; verification, dispositions and fixes about 10 minutes.

## 2026-11-13 — Task-list review — pass 1

- **Stage:** task list (`tasks-landing-page.md`), generated on the `high` path from the committed PRD; Class Heavy,
  cap 2.
- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-tasks-pass1.md`,
  `tasks-pass1.md`, `report-tasks-pass1.md`). Rubric: task-audit at full depth (source-grounding floor and its eight
  categories), executability against the PRD, and the task-list workflow, formats and DEVELOPMENT-RULES.
- **Findings by verified grade:** 2 major, 7 minor; none critical; all confirmed at source.
- **Approved dispositions (Owner):**
  - F1 FIX (local correction): `**Check:**` lines name the smoke specs each page-changing task runs (2.1, 2.2, the
    routing task, 4.2, 4.3, 4.4), and an `AppLayout` test shows only Home skips the padded container.
  - F2 FIX (local correction): Phase 3 reordered: 3.1 builds Home and its forms without routing; 3.2 routes `/` to
    Home, removes `Featured` and changes the container together with the fixtures, the three specs' waits, the
    baseline and the two documents; 3.3 is the by-hand layout check; 3.4 the check task.
  - F3 FIX (local correction): the card's shared-save cases render signed in; the stale `Featured` comments in
    `App.tsx` and `routing.test.tsx` are corrected.
  - F4 FIX (local correction): signed-in Home's cases start after `beginUserChange`, and the interim cases are
    rewritten to the arrival rule.
  - F5 FIX (local correction): the tasks give a working TMDB lookup; the QUICK-REFERENCE snippets went to the inbox as
    an errand, on the Owner's approval.
  - F6 FIX (local correction): 5.4's conditional changes are tests first, and the viewings read takes Home's opt-out.
  - F7 FIX (local correction): an invalid TMDB body is tested at the service and the endpoint.
  - F8 FIX (local correction): Home's two option sets, the scroller's hook and buttons, `homeFilmPath`'s file and the
    watchlist section's test file are named.
  - F9 FIX (local correction): 5.1 asks for the Owner's list and stops for it; 4.6 empties the dev account's
    watchlist first.
- **Shared causes:**
  - checks and propagation not traced to every reader of a changed page or test seam: F1, F3, F4;
  - task order and inputs not traced against when each is produced: F2, F9;
  - contracts and paths left to the implementer: F5, F8;
  - test-first applied unevenly: F6, F7.
- **Stop reason:** none yet; pass 2, the cap, approved by the Owner.
- **Elapsed:** the review about 23 minutes; verification and dispositions about 10 minutes; the fixes about 10
  minutes.

## 2026-11-13 — Task-list review — pass 2 (limit reached)

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-tasks-pass2.md`, `tasks-pass2.md`,
  `report-tasks-pass2.md`). Rubric as pass 1.
- **Findings by verified grade:** 1 major, 5 minor; all confirmed at source. All nine of pass 1's repairs held; the
  major came from pass 1's Phase 3 reorder.
- **Approved dispositions (Owner):**
  - F1 FIX (local correction): `routing.test.tsx` is a copy of the route table, so its change is a rename; the route
    switch is proven by a new `App.test.tsx` case rendering the real `App` at `/` and `/featured`, beside the
    `AppLayout` test.
  - F2 FIX (local correction): each "no Server error toast" case mounts a `Toaster`; Home's two section reads are
    checked for Home's pagination context in MSW; "no card actions" is counted by role.
  - F3 FIX (local correction): 3.2's fixtures land first, then the route switch, `Featured`'s removal, the container
    change, the spec waits and the baseline in one checkbox carrying the Check.
  - F4 FIX (local correction): `login()` drops the toast-only `displayName` and returns `AuthResult<void>`;
    `strategy-service-layer.md`'s file list and `getPaginated` signature, and `BackToCollectionLink`'s comments,
    follow the change.
  - F5 FIX (local correction): 4.6 adds films the dev account has never saved.
  - F6 FIX (local correction): the tagline goes through the existing `empty_str_to_none`.
- **Shared causes:**
  - test seams not checked for whether the assertion can fail (a copied route table, an unmounted toaster, unnamed
    buttons): F1, F2;
  - per-checkbox gates not traced through a repaired order: F3;
  - readers of removed or changed behavior not swept: F4, F6;
  - a repair's input not traced to the data it depends on: F5.
- **Stop reason:** cap reached; a fix check approved by the Owner.
- **Elapsed:** the review about 24 minutes; verification and dispositions about 10 minutes; the fixes about 10
  minutes.

## 2026-11-13 — Task-list review — fix check, round 1 since pass 2

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-tasks-pass2-round1.md`,
  `tasks-pass2-round1.md`, `report-tasks-pass2-round1.md`). Checked pass 2's six repairs and every passage their
  subjects touch.
- **Findings by verified grade:** 1 major, 1 minor; both confirmed at source. All six of pass 2's repairs closed; the
  major came from F1's repair.
- **Approved dispositions (Owner):**
  - F1 FIX (local correction): the `App.test.tsx` case keeps `/` only, and 3.2.a says why the `/featured` redirect
    stays with `routing.test.tsx`: the test setup fixes `window.location`, so the router never leaves the first path.
  - F2 FIX (local correction): 4.4.b also drops `displayName` from `AuthResult`'s JSDoc.
- **Shared causes:** a test seam not checked for whether the assertion can pass (a second instance of pass 2's cause):
  F1; readers of removed behavior not swept: F2.
- **Stop reason:** none yet; round 2 approved by the Owner.
- **Elapsed:** the fix check about 13 minutes; verification and dispositions about 10 minutes; the fixes about 5
  minutes.

## 2026-11-13 — Task-list review — fix check, round 2 since pass 2

- **Runner:** a fresh read-only `reviewer` subagent; `adversarial-review/` (`prompt-tasks-pass2-round2.md`,
  `tasks-pass2-round2.md`, `report-tasks-pass2-round2.md`). Checked round 1's two repairs and every passage their
  subjects touch. The runner also diffed `tasks-pass2.md`, which the brief didn't name, for orientation only; no
  conclusion rests on it.
- **Findings by verified grade:** none. Both repairs closed; the 3.2.a reason was run against vitest's and
  react-router's own code, not only traced.
- **Stop reason:** clean; the loop ends here.
- **Elapsed:** the fix check about 7 minutes; verification about 5 minutes.

## 2026-11-13 — Amendment review — pass 1

- **Stage:** the full-width neutral hero amendment to the PRD, affected task-list contract and Proposed ADR-046;
  Class Heavy, cap 2. Target: the three-file working-tree delta from application commit `59fff3a2`.
- **Runner:** a fresh read-only `reviewer` subagent, `amendment_review_1`; `adversarial-review/` keeps the
  `prompt-amendment-hero-pass1.md`, `report-amendment-hero-pass1.md`, the three reviewed artifact copies, the notes
  snapshot, exact patch and target-hash manifest. The manifest records every snapshot hash and the prompt/report
  filenames, roles and hashes. The runner loaded no personal session files or prior reports.
- **Rubric:** proportionality; design efficacy and fit; spec-review's reader, coherence and source-grounding checks;
  the grounding floor over affected tasks; and the amendment workflow's dated record, ADR and criteria propagation.
- **Findings by verified grade:** none. No dispositions or finding-driven edits are required.
- **Author verification:** the current artifact hashes match the reviewed copies; all five replacement criteria
  match between the PRD and task list. The service choice seam, single TMDB read and factory boundary were checked
  against source; their focus extension is planned by Task 4.7.
- **Shared causes:** none identified.
- **Stop reason:** converged, with no findings. No successor pass or fix check is offered.
- **Elapsed:** about 4.5 minutes, including source verification and recording.

## 2026-11-14 — Amendment review — pass 1

- Stage: scalable hero film review and checked artwork amendment.
- Runner: fresh read-only reviewer subagent; complete delta against `3e806690` in the PRD, task list and ADR-046.
- Rubric: proportionality, design-audit, spec-review coherence/grounding and affected-task grounding.
- Verified findings: 0 critical, 0 major, 1 minor. Shared cause: an outdated broad point-editor exclusion.
- Disposition: Owner approved qualifying the exclusion as in-app; correction applied. Fold: wording clarification.
- Stop reason: one approved minor correction completed; optional fix check has not run.
- Elapsed time: not recorded. No unrelated implementation review was performed.

## 2026-11-14 — Portrait/director amendment review — pass 1

- Target: complete PRD, task-list and ADR-046 amendment delta against `74b96f6c`.
- Rubric: proportionality, design-audit, spec-review coherence/grounding and affected-task grounding.
- First invocation: invalid as independent evidence after a prior-review conclusion contaminated the brief.
  Its two candidate findings were not used as an independent pass. A fresh neutral invocation replaced it.
- Runner: fresh read-only reviewer, independent. Verified findings: 0 critical, 0 major, 2 minor.
- Shared cause: supersession/credits-rationale propagation. Owner approved both corrections with author verification.
  Fold: move criterion 24's replacement notice to its criterion; update obsolete ADR context to the director projection.
- Stop reason: approved minor fixes performed and author-verified; Owner chose no additional fix check.
- Elapsed time: not recorded. No implementation review or verification pass was performed.

## 2026-11-14 — Label-panel amendment review — pass 1

- Target: complete PRD, task-list and ADR-046 amendment delta against `df10647a` (text panels, capital titles,
  short title, broader pitch and band copy, batch film checks).
- Runner: fresh read-only reviewer subagent, independent.
- Rubric: proportionality, design-audit, spec-review coherence/grounding, affected-task grounding and the amendment
  procedure.
- Verified findings: 0 critical, 3 major, 4 minor. Author verification confirmed all seven, including a browser
  accessibility-tree probe for the capitals finding.
- Shared causes: layout and accessibility outcomes stated without a mechanism CSS or the browser provides (panel width
  under wrapping; accessible name under `text-transform`); fit and placement evidence not reaching the short-title
  path or the sheet's static snapshot.
- Dispositions (Owner approved all): panel-width rule restated to what CSS achieves; explicit accessible name checked
  in the browser's accessibility tree; post-import fit rescreen with shipped titles; padding about 24px, flush band to
  about 1450px and compact separation inside the fit; CSS-driven flush/inset with a 1500×900 check; four stale
  wordings; task-list propagation. Fold: specification wording and task steps; no design re-entry.
- Stop reason: approved fixes applied; fix check round 1 approved and running.
- Elapsed: about 18 minutes for the pass.

## 2026-11-14 — Label-panel amendment review — fix check, round 1 since pass 1

- Runner: fresh read-only reviewer subagent, scoped to the approved fixes and their immediate contract.
- Result: all seven corrections adequate. New from the fixes: 0 critical, 0 major, 3 minor (criterion 29's width
  limits against flush panels; the Amendments record not updated; the flush switch untested and its condition missing
  from criterion 29), plus a remedy-wording note (fit failures take a short title or exclusion, not a reframe) and a
  task-bullet placement nit.
- Shared cause: criterion 29's geometry clauses not carrying R7's flush condition.
- Dispositions (Owner approved all, with 1450×900 added beside 1500×900): criterion 29 states R7's flush condition,
  extends its width limits to the window's edge on a flush side and checks both sides of the switch; the Amendments
  record is brought up to date; fit failures take a short title or exclusion; the accessible-name step moves to
  `HeroCredit`. Fold: specification wording; no further fix check (Owner).
- Post-settle reread: R7, criterion 29 and the Amendments record agree; criteria 28 and 29 identical in both files.
- Stop reason: converged; approved fixes applied and author-verified.
- Elapsed: about 12 minutes.

## 2026-11-14 — Library-pages amendment review — author checks only

- Scope: R15, R18, R20, R30b, R30d, the Library non-goal, the neighbouring-work note, decisions 7 and 8, the ADR
  summary, criteria 13, 22 and 30, Tasks 5.2 and 5.4 with the task list's criteria, and ADR-046's signed-in paragraph.
- Independent pass: omitted (wording-level: the Library's addresses and page names; Home's design unchanged).
- Author checks: spec-review reader, coherence and grounding over the delta against the Library's PRD in review
  (History at `/library/history`, the Watchlist page at `/watchlist`, no Activity tab or `/library/watchlist`, its
  "Recently watched" matching R15 and R18); markdownlint clean; leftover old names only in superseded criteria 16
  and 22, the design draft and the Amendments record.
- Post-settle reread: criterion 30 identical in both files; R30d, task 5.4.c and decision 8 agree on `/watchlist`.
- Committed as `80fe6f9b` (Owner approved).

## 2026-11-14 — Mirrored-backdrop amendment review — author checks; independent pass offered

- Scope: R3 (entry metadata, sheet and batch check), R4 (response field), R7 (full bleed and the presentation's
  inputs), decision 2, criteria 28, 29, 31 and 32, Task 4.15, Tasks 5.1.b and 5.1.c, the Phase 4 exit criterion, and
  ADR-046's decision and negative consequences.
- Size: contained (a new list field and response field; Home's design otherwise unchanged). Independent pass offered
  to the Owner neutrally; the Owner declined it.
- Readiness: decision 2 carries the mirroring and its ADR disposition (revise Proposed ADR-046); no new ADR.
- Author checks: spec-review reader, coherence and grounding over the delta. The stacked image stays unflipped
  (Owner); TMDB's API terms (§1.C, no derivatives) were read with the Owner, who accepted display-time flipping; the
  wording records that reading. Criteria 31 and 32 replace 28 and 29 identically in both files; markdownlint clean.
- Committed as `b7c9b622` (amendment) and `06d2a54d` (Task 4.15), Owner approved.


## 2026-11-14 — Criteria verification — author walk 1

- Scope: the whole work unit, `0e029c0c2ce3d2f034785999e8756d6076d00df8...3bd893f672e2656c287e588afce43608712b11d3`,
  its resulting tree and the initially clean working tree; subsequent edits only record this verification.
  Rubric: every Success Criterion in `tasks-landing-page.md`, including each replacement and post-merge obligation,
  against `prd-landing-page.md`. No criterion text was changed. Class: Heavy.
- Preconditions: every implementation task is complete or explicitly superseded; PRD Open Questions reads None.
- Full local verification: 1547 backend tests pass, 96.56% coverage; 111 frontend files / 3288 tests pass; all seven
  browser smoke specs / 21 scenarios pass without retries. Ruff lint and formatting, frontend lint and formatting,
  frontend type-check after type generation, Pyright (0 errors / 0 warnings; 26 information diagnostics), production
  build, semantic contrast (1508 passed / 272 scoped out / 0 failed), full markdown lint and API regeneration pass.
  Regeneration leaves no diff. The build retains its chunk-size and ineffective dynamic-import notices.
- Backend checks use this worktree's Docker stack and locked Ruff. Pyright uses a separate environment installed from
  the locked development requirements, avoiding the already-captured stale shared host tools; no shared tool changes.
- Routed evidence: frontend tests `a1b7294887214c3cb9cd3b3060fc9d2a`; frontend lint
  `be06657035c24d7084101c0f00ebb4c6`; types `4596127666dd427f9f252d3fdc3c7e14`; semantic contrast
  `478f08c883fc4a5ba993e043f42354a9`; full smoke `25ae2282a50b4a78a6e28986c89e860c`; live interactions
  `3a80279ff9344958a79ca95efec9775b`; corrected stability/contrast captures
  `5eab7b770580490d8fdccbb1fabe27bc`; panels/calendar/band measurements
  `235d00e080a14447b14e81f72dcc60c5`. Sandbox routing refusals produced no check result and were rerun outside the
  sandbox; no routing mode was changed.
- Live evidence: ten window shapes, from 360×800 to 2000×1000, in both modes show the final hero arrangements,
  mirrored full-bleed positions and unflipped portrait frames, flush/inset panels, separated text, desktop alignment,
  calendar shape, full-width band and shared content edges. Pending/success/image failure keep pitch/actions fixed;
  failed reads keep reserved space. Title hover/focus checks pass. Pixel contrast over white artwork is at least
  5.69:1, with muted tagline/separator at least 5.70:1. The initial pixel probe left the explicitly colored separator
  visible while hiding the parent paragraph, contaminating its background sample; hiding and measuring that span
  independently corrects the probe. This was a measurement defect, not a UI correction.
- Rows: live checks across ten widths from 320px through 2200px keep complete cards, no partials and no horizontal
  page overflow. Count paging, the final overlapping page, native wheel movement, resize, Tab, phone touch, reduced
  motion, hidden scrollbars, shared watchlist geometry and loading count pass. Large image sources select original
  at wide sizes at both tested pixel densities.
- Film approvals: all 135 current entries match the final approved IDs, backdrops, points, short titles and flips;
  96 have a custom point and 14 are mirrored. Retained raw batch evidence contains 135 endpoint matches, 676 fit
  measurements and 300 captures with zero failures, plus a correctly flagged unlisted long-title control. The final
  approval includes the three additional flips recorded in 5.1; the external sheet's flip, invalidation, export,
  persistence and built-framing scripts were inspected. No new film decision was made.

### Criterion report

The numbered loci below are the task list's unchanged Success Criteria. Superseded criteria retain their existing
amendment notes and replacements; no historical criterion was used in place of its replacement.

| Criterion | State | Evidence or remaining obligation |
| --- | --- | --- |
| 1 | [~] | Existing amendment; replacement 18, then 23, 26, 28 and 31. |
| 2 | [x] | Home, App and routing tests; real status branches and composition. |
| 3 | [~] | Existing amendment; replacement 19, then 25. |
| 4 | [ ] | F1: calendar state and isolated-Retry component coverage missing. Other forms and request-level quiet failures are covered. |
| 5 | [~] | Existing amendment; replacement 20. |
| 6 | [x] | Grouping unit cases and the calendar component case pass. |
| 7 | [x] | Large card metadata/placeholder/no-action cases, one-film watchlist and band copy pass. |
| 8 | [x] | Home/watchlist gating, greeting lifetime, user change, held set, Retry and mutation cases pass. |
| 9 | [x] | Login and provider-return tests pass; source removes the welcome toast. |
| 10 | [x] | Catalog context, caller-header retention and distinct Home context cases pass. |
| 11 | [x] | Home link cases and Back to Home test pass; all link callsites inspected. |
| 12 | [x] | Anonymous/resolving action suppression and signed-in saves pass; unchanged grid tests pass. |
| 13 | [x] | Seven local smoke specs, 21 scenarios, zero retries, expected axe baselines. |
| 14 | [~] | Existing amendment; replacement 21, then 24, 27, 29 and 32. |
| 15 | [ ] | Documentation search and four supersession statuses pass; ADR-046 remains Proposed until verification closes. |
| 16 | [~] | Existing amendment; replacement 22, then 30. |
| 17 | [ ] | Pull-request CI and post-merge staging proof cannot yet be supplied. |
| 18 | [~] | Existing amendment; replacement 23, then 26, 28 and 31. |
| 19 | [~] | Existing amendment; replacement 25. |
| 20 | [x] | Unit/component row geometry plus current live scrolling/resize checks. |
| 21 | [~] | Existing amendment; replacement 24, then 27, 29 and 32. |
| 22 | [~] | Existing amendment; replacement 30. |
| 23 | [~] | Existing amendment; replacement 26, then 28 and 31. |
| 24 | [~] | Existing amendment; replacement 27, then 29 and 32. |
| 25 | [x] | HomeHero/FilmHero component tests and source inspection. |
| 26 | [~] | Existing amendment; replacement 28, then 31. |
| 27 | [~] | Existing amendment; replacement 29, then 32. |
| 28 | [~] | Existing amendment; replacement 31. |
| 29 | [~] | Existing amendment; replacement 32. |
| 30 | [ ] | Merged-base conditions checked against source; regeneration has no drift. Actual PR CI type-drift proof pending. |
| 31 | [x] | Featured service/API/focus/detail tests pass; generated contracts match. |
| 32 | [x] | Mirroring component tests, current live arrangements/contrast/rows and retained film-review raw evidence. |

- Summary: 13 met, 15 superseded, 4 open (one coverage gap; ADR acceptance, PR CI proof and post-merge proof remain).
- Findings: 0 critical, 0 major, 1 minor. F1 fails criterion 4: `ReleaseCalendar.test.tsx` contains one successful-render
  test. Its named loading placeholders, empty omission, failed heading/error/Retry and section-only retry are not
  exercised through that form. The shared wrapper is tested through poster rows, and watchlist tests cover its states,
  but the criterion explicitly requires each form. No calendar runtime defect was observed.
- Proposed disposition: FIX (local correction), test-only. Add calendar MSW cases for delayed loading to success,
  empty results, and failed read to Retry with a sibling read and Toaster mounted; assert local placeholders, the
  named section, no global error toast, and no sibling refetch. Prove each added assertion detects a relevant broken
  behavior. Add the correction under verification on approval, run the focused section tests/lint/format/types and
  update the criterion evidence. No criterion rewrite, application redesign or unrelated test expansion.
- Shared cause: none; no earlier finding in this verification lane. Disposition is pending, so no repair has landed.
- Independent pass: not run. Recommend one fresh-context criteria pass after F1 is resolved, over the same complete
  scope with author evidence and criterion marks withheld. Owner decides; this recommendation authorizes no pass.
- Stop reason: criterion 4 not met; awaiting approval of the proposed correction. Task 6.1 and completion metadata
  remain open; ADR acceptance is not performed while verification is unresolved. Session pointer fields updated.
- Elapsed: about 12 minutes. No commits or application-code edits.


## 2026-11-14 — Criteria verification — F1 approved correction and author validation

- Owner approved F1's test-only correction. Disposition: FIX (local correction), focused verification scope; no
  application behavior, criterion wording or scope expansion. Added Task 6.0 under verification to carry the repair.
- Added three calendar component cases using real queries, MSW page builders, role/name queries and userEvent:
  delayed loading through successful opening links; omission after an empty response settles; and a failed read
  under its heading followed by Retry, local placeholders and recovery. The Retry case mounts a real sibling row
  and Toaster, checks the sibling remains visible, verifies its request count stays one, and checks no global toast.
  Pending response gates release on test completion, including assertion failure; toasts are cleared per case.
- Test-after evidence: current behavior initially passes. Seven narrow reconstructions then produce expected
  assertion failures, followed by restoration of every application file and a green final focused run:

  | Reconstruction | Observed assertion failure | Routed run |
  | --- | --- | --- |
  | Remove loading status | Named loading status absent. | `96659f8b7960495590c2c503f27c825f` |
  | Keep empty section | Section remains after the empty response. | `5a5d6df232e44612bdce1aced3b5de84` |
  | Remove failure fallback | Required failure text absent. | `d3b63633a5c442eb8af4f3714d9ff00c` |
  | Remove Retry loading status | Named Retry loading status absent. | `2482f69978d346abbc833352f46ec876` |
  | Refetch both Home sections | Sibling read count becomes two. | `fc06b7b85edb458ba949f11154ebf5ef` |
  | Enable global server errors | Server error toast appears. | `3d99d51c138c48659db12abfdbe8b96b` |
  | Supply empty placeholders | Loading status contains no placeholder content. | `c5ded4b5ebeb46e7a3d64be4052eaa9d` |

- A preliminary reconstruction dropping only the error-and-fetching arm did not change the observed Retry state,
  because this query is pending again on retry. It is not counted as fail-first evidence. Suppressing loading
  altogether establishes the required Retry assertion failure without making the test depend on an internal flag.
- Routing: one unmeasured focused invocation waited for local capacity and was cancelled, with source restored.
  Remaining probes use the registered npm test script through the same pool, with its measured memory class.
  Routing mode and policy are unchanged. Expected red reconstructions are not reported as failing final gates.
- Final checks: six section/watchlist test files, 28 tests pass in routed run `029ef6f63388426b999d4987e161638f`;
  changed-file ESLint and Prettier pass; frontend type-check passes in `2b9979aed6d24984a7e5f03570840012`;
  task-list markdown lint and whitespace checks pass. Application files compare equal to HEAD after restoration.
- The earlier full-run evidence remains applicable: the only source change is the calendar test file. No full suite,
  backend, build or smoke rerun was required for this test-only correction. No commit or push.
- Criterion 4 is now met; the author report has 14 met, 15 superseded, 3 open (ADR acceptance, actual PR CI type-drift
  proof, and post-merge CI/staging proof). No unresolved application or coverage finding remains from that walk.
- Separate fix check: offered, with declining recommended for this minor test-only repair. Recommend the first
  independent criteria pass over the complete work unit, with author conclusions and criterion marks withheld;
  that pass is not yet authorized or run. Task 6.1 remains open and session pointer fields are updated.
- Stop reason: approved repair complete; independent-pass decision pending. Elapsed: about 9 minutes, including
  routing waits and fail-first reconstructions.


## 2026-11-14 — Criteria verification — independent pass 1 launched

- Owner authorized the independent criteria pass and explicitly approved a one-off exception to the local method's
  exclusion of partitioned modes: three read-only source scopes plus one fresh aggregate reviewer. The separate
  test-only repair fix check was declined with that continuation. This is one logical criteria pass, not code review.
- Bound target: `0e029c0c2ce3d2f034785999e8756d6076d00df8...3bd893f672e2656c287e588afce43608712b11d3` plus the current
  uncommitted task evidence and calendar tests. A manifest pins all 91 changed paths by content hash, including
  deletions; source and governing contract are frozen during the pass.
- Coverage: data/requests owns 23 paths and criteria 10, 31 and 30's API clause; Home/sections owns 42 paths and
  criteria 2, 4, 6–9, 11, 12, 20 and 30's conditional feature clauses; presentation/integration owns 23 paths and
  criteria 13, 15, 25, 32 and post-merge 17. Three planning documents are shared contract. Supersession chains are
  carried to their terminal criteria. Query lifetime/quiet-error, API-to-hero, page/container, signed-in smoke,
  row/calendar integration and final-merge conditions are explicit aggregate questions.
- Inputs: neutral PRD and task-contract views preserve requirement and criterion text and supersession notes while
  withholding completion markers, historical outcomes and author criteria evidence. The fresh reviewers receive no
  author findings or preferred fixes. Briefs, exact launch messages and input/target copies are retained under
  `adversarial-review/` with the `criteria-pass1-` prefix; scoped and aggregate reports will be kept on return.
- Runner: three fresh read-only reviewer subagents, no further delegation. The fresh aggregate follows after all
  scoped reports return; primary verification and disposition decisions remain with the primary. No review result
  or completeness claim yet.


## 2026-11-14 — Criteria verification — independent pass 1 returned and source-verified

- One logical pass, using the Owner-approved exception: three scoped fresh reviewers plus a fresh seam/aggregate
  reviewer. Coverage is complete across the same 91-path frozen target: 23 data/request paths, 42 Home/section,
  23 presentation/integration and three shared contract documents. The aggregate checked all manifest hashes,
  exact nonplanning diff bytes and every active criterion and supersession chain. This is criteria review, not the
  later code-quality review.
- Verified findings: 0 critical, 0 major, 1 minor. F1, from presentation/integration and retained by the aggregate,
  fails criterion 15: ADR-046 reads Proposed. Primary inspected its Status and the four predecessor records;
  the supersession descriptions agree and only the new ADR's acceptance step is outstanding. Proposed disposition:
  FIX (local correction), set Accepted with the local date as the governing workflow's closing step. No acceptance
  or other finding-driven edit has been made; approval remains pending. No shared cause or further source defect.
- Scoped execution gaps were resolved within this same exact-target pass by brokered checks, not by trusting author
  walkthroughs: 48 request/hero tests (`d78aa2dc16604660b6fd3e852fb3dfb8`), 292 component/integration tests including
  the grid (`29c9ba0c109f4a18af93ab74b4907579`), seven Watchlist-page tests including its global toast assertion
  (`e51badbfede9450d93188849cd7d0cde`), and all 21 smoke scenarios without retries
  (`24f9e2b9f5ff4337a3547537b46cfbea`). The aggregate checked the run histories and source snapshot identities.
- A fresh bound backend run passes all 1547 tests at 96.56% coverage. Its binding records the manifest identity,
  command, stdout hash and the eleven changed backend file hashes inside Docker before and after execution.
  All target hashes also match before and after. The aggregate inspected these bindings and the raw log.
- Browser binding checks 34 served runtime modules through Vite source maps against the frozen source hashes,
  then runs the panel, stability, pixel-contrast and interaction probes, checking target hashes around them
  (`2c81e2e8a88945f38d3c839925d618d3`). The ten-shape/two-mode matrix passes; minimum sampled text contrast remains
  5.69:1. Supplemental bounded checks (`794a7d6eacfa47ce82ae8b5d262c4dad`) prove actual four-week 3/2-film counts at
  1280/360 in both modes, synchronous reduced-motion paging and full focused-card visibility through sixteen Tab
  moves beyond the first viewport. These close specific aggregate evidence questions; no application edit occurred.
- The aggregate corrected a scoped report's merge-SHA typo from git: the merge is
  `24d76404b11a7f5960434e35080c12b16b1eead0`, whose second parent is the recorded base. No code correction is needed.
- Aggregate result, retained verbatim: not clean; 13 active criteria supported, with 15 (ADR acceptance), 17
  (PR/post-merge), 30 (actual CI type drift) and 32 (historical human/per-film evidence applicability) unresolved.
  Its only graded finding is F1. All fifteen superseded criteria are accounted for. The raw scoped reports,
  aggregate, exact briefs/supplements, runner histories and bound runtime evidence are retained with this pass.
- Primary reconciliation of criterion 32's evidence qualification: the human decisions are already recorded in
  5.1.b/c, including the Owner's imported review JSON, batch-capture acceptance and three further flips. Authorization
  is carried from that recorded decision; no repeat approval is requested. Current 135 entries match that final
  export. Commit `55bcb461` records the approved import and completed endpoint/fit/capture checks. Git comparison
  confirms FEATURED_FILMS, FilmHero, HeroArtwork, HeroCredit, HomeHero, shared container props, fonts and global
  styles are unchanged since it; the only theme changes are comments. All 300 retained captures independently
  match the current approved focus and mirroring metadata, with zero mismatches; the endpoint/fit record has zero
  failures. The current bound browser probes cover the unchanged presentation again. This supports carrying the
  historical evidence to the exact current tree without adding a requirement for retrospective cryptographic
  authentication of a human action or historical stdout. The independent report's limitation remains recorded;
  the primary retains criterion 32 as met on this source/authorization evidence.
- Primary outcome: 14 met, 15 superseded and three open, exactly the current marks. Criterion 15 awaits the proposed
  status correction; criterion 30 still requires actual PR CI type-drift proof and criterion 17 its explicit
  PR/post-merge staging proof. Neither local green checks nor this review claim those future results. Task 6.1
  remains open. Subsequent tracked edits only record this review/evidence; they do not change criterion text or
  application/test behavior.
- Fix check: offered for the proposed status-only correction, with declining recommended on its minor metadata
  merits. No successor criteria pass is recommended for that correction; unused capacity under Heavy's two-pass
  cap authorizes no further call. The Owner decides the disposition and offered check.
- Stop reason: complete pass has no material finding, but F1's disposition is pending. No finding-driven fix,
  commit, push or later code-review pass is authorized or performed. Session pointer fields updated.
- Elapsed: about 30 minutes, including brokered checks and evidence-gap closure.


## 2026-11-14 — Criteria verification — F1 approved and applied

- Owner approved the ADR status correction and declined its optional independent fix check. F1 disposition:
  FIX (local correction), metadata only. ADR-046 now reads Accepted (2026-11-14), using the local calendar date.
- Author grounding compares the working-tree record with HEAD and confirms only the Status line changed. The
  repository parser recognizes the accepted status; all five changed ADR records have settled statuses and all
  47 record numbers are unique. The committed-HEAD CLI is not presented as a working-tree check: it reads HEAD,
  so that invocation belongs after a commit. Current content was checked directly with its exported status parser.
- Markdown lint passes on ADR-046 and the task list after wrapping one new evidence line; whitespace checks pass.
  Criterion 15 is marked met. No application change, new test, commit or push. Session pointer fields updated.
- Response performance is complete; the optional fix check is declined on the Owner's approval. The pass converges
  with no material finding; no successor pass is authorized or needed for this status-only correction. Its minor
  metadata repair is the accepted final repair residual.
- Current criteria: 15 met, 15 superseded and two future obligations open (30, actual PR CI type drift; 17,
  PR/post-merge smoke and staging proof). Task 6.1 remains open because criterion 30 includes future PR evidence
  in the Implemented group, while the workflow closes verification before opening the PR.
- Proposed staging-only amendment, not applied: preserve all current conditional/source requirements and verify
  API regeneration with no local diff before the PR; place the actual CI type-drift result in a separate PR-proof
  criterion. Supersede criterion 30 and append replacements in both PRD and task list as the amendment workflow
  requires. No behavior or CI obligation is dropped. Owner approval is required to change that criterion staging.


## 2026-11-14 — Verification-proof timing amendment — author checks; Task 6.1 complete

- Owner approved separating local proof before the PR from actual CI proof on it. Amendment depth: low,
  wording-level verification timing; application behavior and every original conditional obligation are retained.
- Criterion 30 is preserved verbatim and marked superseded in PRD and task list. Criterion 33 copies all its
  conditions, changing only the API-proof clause to local regeneration of the schema/types with no diff. Criterion
  34 carries the actual CI type-drift pass under Proven on the pull request, due before merge. Both copies of 33
  and 34 are textually identical after layout normalization. Criterion 17 retains PR/post-merge smoke/staging proof.
  R30a, design decision 21 and the dated amendment record state the timing; current task references point to 33.
- Readiness: ready, no gaps. The decision is settled by the Owner; both proof signals are concrete; no inbound
  change is introduced by this bounded amendment; ADR disposition is none (verification timing, no architectural
  decision). No ADR is added or amended by this change.
- Spec-review over the written delta and affected contract passes reader independence, binding completeness,
  coherence and source grounding (author). Local actor: export-openapi.js selects this worktree's own backend and
  the API-type generator writes its types. CI exports the schema, regenerates the types and its Check for type
  drift step fails on a generated-types diff. The stage split follows the workflow's pre-PR verification and later
  PR CI sequence. Old criterion 30 and every non-API conditional clause are preserved; the CI obligation is retained.
- Fresh `npm run generate-types --prefix frontend` succeeds; both generated files compare equal to HEAD. All
  current backend/frontend source and test hashes still match the independently reviewed target. Earlier source,
  component, browser and full-run evidence therefore remains applicable. Criterion 33 is met; 34 remains pending.
- Amendment review is author-only; the independent pass is omitted under the wording-level rule. This is not a
  new independent verification or code-review pass. Author coherence reread and propagation checks find no remaining
  contradiction. The existing numerical references to superseded criteria retain their explicit replacement chains.
- Markdown lint and whitespace checks pass after correcting two introduced extra blank lines. The PRD and task
  list read Complete, the task list records the local completion date, and Task 6.1 is marked complete with its
  evidence. Current criterion states: 16 met, 16 superseded, two later obligations open (34 and 17). No CI or staging
  result is claimed. Application code and tests are unchanged by this amendment; no broader rerun is needed.
- Session pointer fields updated. Next: completion preparation from archive-completed.md § 1b, then its document
  cleanup and completion metadata; the separate code review remains ahead. No commit, push or publication.

## 2026-11-14 — Completion records committed; author code-review preflight

- Owner explicitly approved committing the five prepared files and using the same three-slice plus fresh-aggregate approach for code review. This extends the one-off partition exception to this code-review pass; no successor or fix check is authorized by it.
- Commit `c37398e2` contains the calendar state coverage, approved verification-proof timing amendment, settled ADR-046 status and completion records. Pre-commit and commit-message hooks pass; the latter gives an advisory subject-length warning (51 characters, below its 72-character hard limit). No push or merge occurred.
- Markdown and whitespace checks pass; generated API files remain without drift. Task cleanup preserves all 141 checkbox paragraphs and the complete criteria section verbatim. The official committed-HEAD ADR check now passes against main.
- Author preflight over `0e029c0c..c37398e2`: scope, cross-task consistency, cleanup, documentation, unresolved markers, correctness and explicit failures considered. No actionable material finding. This is author evidence only, separate from the independent code-review pass.
- Independent code pass 1 is bound to that exact range: 92 disjoint paths in three scopes (23 data/request, 42 Home/section, 27 presentation/integration/documentation), followed by a fresh seam-and-aggregate reviewer. Scope briefs and launch messages are retained separately. No author findings or self-verification claims are supplied as review evidence.

## 2026-11-14 — Code review — pass 1, delegated agent (local)

- Exact target: `0e029c0c2ce3d2f034785999e8756d6076d00df8` to `c37398e21c76016cfafd9f46148e24b9c2da8c72`. Owner approved three read-only scopes plus a fresh aggregate. Four fresh non-author reviewer contexts; no further delegation. Elapsed: approximately 13.2 minutes from target freeze to final record.
- Rubric: code-review-standard and every implementation-audit dimension, plus repository-contract coherence. No prior criteria reports, author conclusions, suspected weak spots or self-verification claims supplied as review evidence.
- Complete coverage: 23 data/request paths, 42 Home/section paths including two deletions, 27 presentation/integration/document paths. Disjoint union equals all 92 changed paths. Aggregate independently verified identity, hashes, coverage and seams; primary rechecked those facts before settlement.
- Verified findings: 0 critical, 0 major, 0 minor, 0 unsupported. All three scoped reports and the aggregate returned no finding; no disposition or repair is required. No shared cause. Stop reason: complete clean pass, with no coverage or rubric gap. No fix check or successor launched.
- Primary spot-checks support the reported seams: Library invalidation reaches Home, session changes reset non-session queries, configured featured metadata reaches presentation, and section failures remain local. Reviewer-requested probes bound all 34 changed served runtime modules to current source, with target hashes checked before and after.
- Probe run `e52ccf063fcf44a3abbbffc5f2cca13e` passed: film 4512 at 1024×1000 in both modes, 121.890625px panel separation and zero pitch/action x/y movement on credit arrival. Initial card fixture fitted but had only one desktop genre line; its result was not used to claim the requested two-line case.
- Strengthened probe run `6482142a1d0c4930b562bb3329fc5cf6` passed: two-line titles and genres with five overview lines at 1024/1280/2000px, overview bottom 531px inside card bottom 543px; 360px also fits. These are bounded geometry results, not fresh full-suite or film-approval claims. Two sandbox snapshot refusals never ran checks; their exact retries produced the reported successful runs.
- Exact prompts and returned reports retained (SHA-256):
  - `prompt-code-pass1-data_requests.md` — `feb22111d2e968dd87276810efec589a01d169b7771bbb7178d4726eccb8e841`
  - `report-code-pass1-data_requests.md` — `3bda4fea1c981ad61d3b56c5059ac8b6a4cdedbaf5c751f0aa2e15b9158e4590`
  - `prompt-code-pass1-home_sections.md` — `2de70b3fd5063daeac63e8846307d6cd97848002c87e492651f91242c92a088f`
  - `report-code-pass1-home_sections.md` — `f97996f6b688655e648e688f952f9a5abb8fad21632b23ec6311653f597bdd06`
  - `prompt-code-pass1-presentation_integration.md` — `0fed5c2925f9d2ee75c25d0c901011aae24ad769ef5f238cca1f7e827149d6f1`
  - `report-code-pass1-presentation_integration.md` — `631f0f06370cc07d9fab19c004c154067c784e2a6a4a98c002f9e4f58ef7dbdf`
  - `prompt-code-pass1-aggregate.md` — `a28d37002bab28cda7b9a67931f45e91dd6184c645e214bdd9ff66ae7dad1492`
  - `report-code-pass1-aggregate.md` — `60dcfe7e30561c9867cc3ebb0597afb6a66e45b0b3942ed92ea04f9d663146d5`
- Current-pass raw probe scripts/results and target manifest are retained beside the review records. No finding-driven source edit occurred, and HEAD/worktree remain unchanged and clean.
- Post-review alignment checked against origin/main `46ae700b`: META-PRD purpose/core features/out-of-scope and TECHNICAL-OVERVIEW architecture and testing contracts. Home serves curated film discovery and personal watchlists, adds none of the excluded social/TV/streaming scope, and retains the existing service/query/theme boundaries. No material disagreement.
- `origin/main` has advanced from the last integrated main at `0e029c0c`: PR #206 labels browse selectors, seven frontend source/test paths, none in this branch's changed-path set. No API, History, card-control or queue condition changed. Task 5.4 requires repeating integration if main moves before merge. A new merge requires the Owner's explicit approval; no merge or push occurred.
- A PR title/body draft is prepared but unpublished; it will need its design link rebound if integration changes HEAD. Session pointers now name latest-main integration and affected checks before publication.

## 2026-11-14 — Approved main refresh and review applicability

- Owner explicitly approved merging latest origin/main and running affected checks. Merge `d32042b6` has parents `c37398e2` and `46ae700b`; it applied cleanly and includes its task-list integration record. Both commit hooks pass. No push, PR publication or fresh review pass occurred.
- Seven incoming browse-selector accessibility files exactly match main. Before updating the task record, the entire branch diff against the new main was byte-identical to the reviewed diff against the previous base. After the record update, all 91 other reviewed paths retain their exact hashes, including every application/test/generated file and both deletions; the PR still has the same 92 paths.
- The only reviewed-artifact change is the task-list record: the refreshed merge, no-diff API regeneration, unchanged conditional decisions and new check evidence. Author reread finds no contradiction or scope change. All checkbox paragraphs remain unchanged. The complete independent pass remains evidence for the unchanged change; this applicability judgment is primary-held, not another independent review of the new head. Incoming selector context is covered by focused integration checks.
- R30: History routes, watched/liked card controls and queue-order sources are byte-identical to the previous main, so all three conditions remain false. API regeneration succeeds and leaves no diff. Backend, hero and metadata code are unchanged; no backend suite or hero probe rerun was needed.
- Passed checks: 46 related tests across six files (`aed0c273fc314af3a4f538462c7c226b`); full frontend lint (`c58934acf2c741548e12d1670d7e6541`); frontend type-check after Chakra type generation (`8499303bce2042d7bf4f558c067d34a5`); all 21 smoke tests across seven specs with zero retries (`7eb320e2d0854f3185e659cbbd01683c`). Single-file Prettier checks pass for all seven incoming files; task markdown and whitespace checks pass. Committed-HEAD ADR validation passes against updated origin/main (47 records, five changed).
- Initial npm test invocation incorrectly passed `related` after the script's existing `vitest run`, selecting no tests (run `ed61226e2154476db0b598d6eb642b77`). It was corrected to `npx vitest related --run`; no test assertion failed. Sandbox snapshot refusals did not run checks. Successful routed run records and applicability proofs are retained.
- Alignment remains with the same origin/main vision, out-of-scope list and architecture documents checked at the end of code review; the incoming change edits none. Home's scope and completion summary are unchanged. Criteria 34 and 17 remain due at PR/post-merge stages.
- The unpublished PR draft now pins its design link to `d32042b61e1d2ed150d3fa09e4cbeb152913e06b`. Session pointers updated: next is Owner approval of exact PR title/body, branch push and PR creation, then exact-head CI monitoring.

## 2026-11-14 — Publication CI proof

- Published the Owner-approved title/body without alteration. Required CI succeeds: backend/frontend tests and checks, documentation, images, API type drift, end-to-end smoke and ci-ok. Evidence: CI run `43679094514`, including API-type job `132705613651`, smoke job `132705613509` and gate job `132706627321`. The target-bound wait and publication evidence are retained privately with the review records.
- Criterion 34's PR type-drift proof is now established. Criterion 17's PR smoke portion is established; staging smoke and signed-out root behavior remain due after merge. Carry the proven CI evidence into the final task-list evidence update with post-merge proof, rather than changing the accepted code head solely to record a check result.
- No hosted review was requested. CodeRabbit's automatic skipped status supplies no review evidence. There are no submitted reviews or review threads. The completed local code-review result and its primary-held integration applicability judgment remain the basis for recommending no additional review. The Owner still decides that route.
- After refreshing origin, ADR validation passes (47 numbered records, five changed), current main still equals the integrated base and the local/remote branch heads agree. Worktree remains clean. No merge performed. Session pointer fields updated for the explicit review-route and merge decision.

## 2026-11-14 — Approved merge and completed staging proof

- Owner explicitly approved skipping another review and merging the accepted head. Refreshed head, current main, required ci-ok and review-thread evidence before the merge; no mismatch or unresolved thread. Merge `40a2c7b4` preserves `d32042b6` through a merge commit. No hosted review was requested.
- Post-merge CI run `43679662429` passes all jobs, including ci-ok (`132708388193`), staging deployment (`132708406462`) and staging smoke (`132708572105`). The separate Docs run `43679662436` also passes.
- Staging smoke logs show 20 passed and one skipped: six exercised specs, sign-up skipped, all background cases included. Root probe `a48c6a7b012945adbc790ba20f042fc0` passes in a fresh signed-out browser: HTTP 200, no redirect, final URL remains the staging root and the exact Home headline is visible. Main remains at `40a2c7b4` before/after the probe. The initial sandbox refusal did not run a check; the routed retry succeeded.
- Criteria 34 and 17 are now proven. Their final task-list evidence update, plus removal of completed CI/staging obligations from the completion document's follow-ups, is prepared as a patch with retained raw proof. It is not applied to this already-merged worktree: archive-completed § 9–10 places the final evidence commit and closure in the main checkout after this linked-worktree session ends. No main-checkout edit, archive operation or main push occurred.
- Session pointer fields updated for handoff and main-checkout closure. The worktree stays clean; run artifacts remain until their evidence has been retained through closure.
