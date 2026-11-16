# Review Log: user-movie-controls

## 2026-11-14 · PRD · PRD review — pass 1

- **Runner:** independent (fresh reviewer subagent, local); about 19 minutes.
- **Reviewed:** `prd-user-movie-controls.md` (kept copy `prd-pass1.md`, sha256 `c4842b087799`), against the approved
  determinacy confirmation, the shared draft `draft-user-movie-uis.md`, the tracking model's PRD and ADR-047, and the
  landing page's PRD and ADR-046.
- **Rubric:** assess-design-proportionality, design-audit, spec-review at `detailed · PRD`; gate: ready to approve as
  the basis for a task list.
- **Verified:** 3 major, 7 minor (one reviewer major regraded minor: the Undo gap needs liked-but-unwatched records,
  which the like rule's backend change converts).
- **Approved dispositions (all FIX):**
  - F1 major, new design: Rewatch defaults on for a same-day or earlier viewing (journey criterion contradicted R21).
  - F3 major, new design: the picker's searches carry their own pagination context; the API client keeps a caller's
    context (a picker search could clear the search page's duplicate tracking).
  - F2 major, local correction: the test-impact claims corrected (shipped watchlist test fixtures keep `user_watched`;
    card and page tests render signed in with a pointer stub).
  - F4 minor, new design: Undo also supplies the fields a rule could change; the toast after an Undo is a comparison;
    the like rule's conversion of existing records stated.
  - F5 minor, new design: focus targets when the opener is gone; the locked menu item is `aria-disabled`.
  - F9 minor, new design: entry buttons named by position and date.
  - F10 minor, new design: Log on an unloaded film page opens the picker; date validity and its message.
  - F6 minor, local correction: ADR-048 supersedes ADR-044 only to add Log and "Log a film".
  - F7 minor, local correction: ADR dispositions in the required form; three added; ADR-050 note listed.
  - F8 minor, local correction: row-height test wording matches what the tests assert.
- **Shared causes:** the Undo rule meeting real data (F2, F4); unstated edge behavior (F5, F10).
- **Grounding correction folded inline:** R33 says the extra fields are supplied only where not already supplied.
- **Stop reason:** fixes approved; fix check approved (round 1 since pass 1).

## 2026-11-14 · PRD · PRD review — fix check, round 1 since pass 1

- **Runner:** independent (fresh reviewer subagent, local); about 19 minutes.
- **Reviewed:** the change from `prd-pass1.md` (sha256 `c4842b087799`) to `prd-pass1-round1.md` (`8c7756805186`), on
  closure, behavioral grounding, propagation and completeness, and new failure.
- **Result:** all ten pass-1 fixes close; no critical or major finding. Verified: 4 minor.
- **Approved dispositions (all FIX):**
  - F1 minor, new design: the picker's context travels through optional request options on the paginated and search
    fetchers; whichever of this work and the landing page merges second keeps one form; R41b echoes it.
  - F2 minor, local correction: the like rule's count reads four; the conversion of existing records is recorded in
    the approved upstream (the relayed decision, and the Owner's approval of pass 1's F4).
  - F3 minor, local correction: R33's Watched pin for like and rating restores removed (it could reassert a stale
    value); D12 explains the remaining pins; criterion 4's Clear rating body restored.
  - F4 minor, local correction: D25 records the fallbacks and the date rule as tactical.
- **Shared causes:** fixes meeting neighbouring text (F2, F4); the Undo rule's pins (F3).
- **Grounding correction folded inline:** R33's last clause says an older toast's Undo leaves the fields it doesn't
  supply as later saves left them.
- **Trend:** PRD pass 1: 3 → 0 (converging).
- **Stop reason:** fixes approved; the Owner chose PRD pass 2 over a second fix check.

## 2026-11-14 · PRD · PRD review — pass 2 (limit reached)

- **Runner:** independent (fresh reviewer subagent, local); about 21 minutes.
- **Reviewed:** `prd-pass2.md` (sha256 `18dca05c4d95`), with pass 1's and the fix check's findings as context.
- **Verdict:** ready to approve; no critical or major finding. Verified: 7 minor.
- **Approved dispositions (all FIX):**
  - F3 minor, new design: zero stars from the keyboard counts as no rating (clears it on the panel, empties it in the
    dialog).
  - F5 minor, new design: a change of page closes the dialog without saving; `BrowserRouter` can't hold a navigation
    to ask first.
  - F1 minor, local correction: R33 and D12 state the accepted edge where an older toast's Undo meets a rule after a
    later save (the Owner declined dismissing older toasts per film).
  - F2 minor, local correction: R31 names the dialog's entry creates; a toast after an entry create always offers Undo.
  - F4 minor, local correction: Rewatch's default applies to new entries only; an edit keeps the entry's mark.
  - F6 minor, local correction: the film page's signed-out/resolving test is named as rewritten (criterion 7).
  - F7 minor, local correction: if ADR-046 is on `main`, ADR-048 supersedes its row-spacing statements (R41b, D3).
- **Shared causes:** the Undo rule meeting the server's rules (F1, F2); unstated edges (F3, F4, F5).
- **Trend:** PRD pass 1: 3 → 0; PRD pass 2: 0. Converged.
- **Stop reason:** cap reached; fixes approved; the Owner declined a final fix check on the recommendation that the
  folds are small and local. Post-settle reread (spec-review coherence) done over the settled PRD; markdown lint clean.

## 2026-11-14 · Task list · Task-list review — pass 1

- **Runner:** independent (fresh read-only reviewer subagent, local); about 22 minutes.
- **Reviewed:** `tasks-user-movie-controls.md` (kept copy `tasks-pass1.md`, sha256 `bdfd5ec2f446`), against the PRD,
  the shared draft, the tracking model's PRD and ADR-047, and the landing page's PRD, ADR-046 and committed code.
- **Rubric:** task-audit at full depth with source-grounding; executability; the task-list contract (2_generate-tasks
  Steps 3 to 9 and the formatting strategy); gate: ready to approve as the plan the work is implemented from.
- **Verified:** 2 major, 8 minor; all confirmed at the reviewer's grade.
- **Approved dispositions (all FIX):**
  - F2 major, new design: `useEntryDialog()`'s contract (a context default whose `open` throws only when called;
    `EntryDialogHost` as the provider tests wrap; `open()` gains an optional `returnFocus`, carried into R19 by
    amendment).
  - F1 major, local correction: every card and film-page test that clicks today's controls enumerated in 3.1.c, 4.1.b
    and 3.2.a, the vacuous `/to Watchlist/` absence check replaced.
  - F3 minor, local correction: the form reports a settled save through `onSaved(result)`; 2.2.a tests what shows.
  - F4 minor, local correction: the panel's toggles use the button recipe's `subtle` + `selected`.
  - F5 minor, local correction: the combobox recipe registers in `theme/index.ts` `slotRecipes`.
  - F6 minor, local correction: Log opens on the film only while its cached read is `success`; refetch-404 case added.
  - F7 minor, local correction: `useMediaQuery(..., { ssr: false })` for the pointer kind.
  - F8 minor, local correction: R8's memo comparison moves into 3.1.
  - F9 minor, local correction: ADR-048 written in Phase 4 (4.5) after its last decision lands; 5.1 re-cites D19 when
    the landing page is on `main`.
  - F10 minor, local correction: blank lines between lettered subtasks.
- **Folded with these, on the Owner's approval:** a PRD amendment carrying the Library draft's meeting points (R41c's
  combined smoke steps and the Explore rename; R41d's `time_zone` on record saves; criterion 4 superseded by 15) and
  F2's R19 line.
- **Shared causes:** consumers of new shared surfaces left unspecified (F1, F2, F3, F8).
- **Stop reason:** fixes approved.

## 2026-11-14 · Task list · Task-list review — pass 2 (limit reached)

- **Runner:** independent (fresh read-only reviewer subagent, local); about 27 minutes.
- **Reviewed:** `tasks-user-movie-controls.md` (kept copy `tasks-pass2.md`, sha256 `3b7a759a44e1`) against the PRD
  (`prd-tasks-pass2.md`, `05ea29ef6640`), with pass 1's findings as context, and the same upstream chain plus the
  Library's committed draft and uncommitted PRD.
- **Rubric:** as pass 1.
- **Verdict:** not ready to approve as written. Verified: 1 major, 7 minor; all confirmed at the reviewer's grade.
- **Approved dispositions (all FIX):**
  - F1 major, local correction: the landing page's and the Library's tests that press today's card buttons move to
    the new controls at whichever merge of `main` brings them (a new Implementation Note, "Merges of `main`", that
    2.1.a, 3.1, 4.5 and 5.1 point at); the signed-out Home check is rewritten to the new controls' names.
  - F2 minor, local correction: `time_zone` joins every exact record-save body this work's tests assert, at the merge
    that brings the backend unit; criterion 15 (PRD and copy) gains "each with `time_zone` beside these fields once
    R41d applies".
  - F3 minor, new design: `EntryForm`'s whole prop list (R19's options and `onSaved`, `onCancel`,
    `onReviewDirtyChange`); the host renders the form and routes every close but a save or a change of location
    through one request that asks while the review is changed.
  - F4 minor, new design: `FilmPanel`'s `reviewRef` and `FilmLog`'s `fallbackFocus`, wired by `MovieDetail`.
  - F5 minor, new design: `saveFeedback` takes `sent`, the record fields whose change the title names, and leaves them
    out of the toast decision and description, not the Undo body; `onSaved`'s result carries it.
  - F6 minor, local correction: `sign-in.spec.ts` runs in 2.5.c and 5.3; 5.1.b(c) adds Log to `phone-width.spec.ts`'s
    1024px check.
  - F7 minor, local correction: 2.4.a chooses a film in the picker inside the open dialog, by keyboard and pointer.
  - F8 minor, local correction: the dialog's stars fill in `imdb-gold`.
- **Folded with F1, on the Library session's correction:** the dialog's steps replace the Library spec's step 4
  instead of following it (a film logged the day it joined the watchlist leaves it, so step 4 would find nothing to
  remove); 5.1.b(c), R41c and the amendment line say so. The Owner approved it at the approval stop, with the dialog's
  `sent` counting `user_watched` while the date is on (R32: a log never adds "Also marked as watched.").
- **Shared causes:** neighbouring branches meeting this work at a merge (F1, F2, F6); seams between components left
  unnamed (F3, F4, F5).
- **Trend:** task list pass 1: 2 major; pass 2: 1 major (converging).
- **Stop reason:** cap reached; fixes approved; fix check approved (round 1 since pass 2).

## 2026-11-14 · Task list · Task-list review — fix check, round 1 since pass 2

- **Runner:** independent (fresh read-only reviewer subagent, local); about 15 minutes.
- **Reviewed:** the change from `tasks-pass2.md` (sha256 `3b7a759a44e1`) to `tasks-pass2-round1.md` (`fbb1a806e364`),
  and from `prd-tasks-pass2.md` (`05ea29ef6640`) to `prd-tasks-pass2-round1.md` (`d0874a06c0cd`), on closure,
  behavioral grounding, propagation and completeness, and new failure.
- **Result:** all eight pass-2 fixes close, and the Library's step-4 change holds against its PRD and the server's
  rule; the copied criteria match. No critical or major finding. Verified: 3 minor, each introduced by this round's
  wording.
- **Approved dispositions (all FIX):**
  - F1 minor, local correction: a merge before 5.1 applies only what its inputs allow (the API types, one form of the
    read path, `time_zone`, the card tests); 3.1.e removes the `/` and the Library's baseline entries the branch
    carries; R41c's dialog steps, empty states and Log check wait for 5.1.b; 3.1.c names the Library's card tests,
    including its spec's step 4 until 5.1.b(c) replaces it.
  - F2 minor, local correction: R31's toast decision follows R31's list; only the description leaves out `sent`; 1.1.a
    adds silence for liking and rating an unwatched film that isn't on the watchlist.
  - F3 minor, local correction: the host clears the review's changed flag on each `open()`; 2.4.a reopens after a
    saved or discarded review.
- **Shared causes:** fixes meeting neighbouring text (F1, F2, F3).
- **Trend:** task list pass 1: 2 major; pass 2: 1 major; fix check: 0 major (converged).
- **Stop reason:** fixes approved; the Owner declined a second fix check on the recommendation that the folds are
  small and local. Recheck done over the settled list (task audit over the change, the suite-coherence pass,
  markdown lint clean).


## 2026-11-14 · Verification checkpoint · author walk incomplete

- **Subject:** `main...537dd757f782469bab1d185b7db18257029ffaf4`, merge base
  `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1`; tracked worktree clean. All tasks before 6.1 are complete;
  PRD Open Questions is None. No criteria marked and no independent verification pass invoked.
- **Passed:** frontend suite, 114 files / 3,357 tests (`37150e904ac540dfaaf4b64da9445cec`); backend suite,
  1,469 tests in the isolated backend; frontend lint (`a424d460669244939962b70afa260231`); Chakra type generation
  and frontend type check (`0c1b89342fc4433491e8745ea8d6ff3e`); frontend formatting
  (`3e4363a5c4d2454f993f3c37fd500d5d`); backend Ruff lint over apps, config, scripts and middleware, and formatting
  over all backend files (296 files); Pyright 1.1.414 with pinned django-types 0.24.0, zero errors / zero warnings
  (`072cf985d4054dc99300b8309ce3cceb`); markdown lint; palette contrast, no failures
  (`9fde1c0c63284870856a9eab6bca6865`). Shared host Python tools were not changed.
- **Failed:** full E2E suite (`8a890a214ec54d298f111c8f86b8b5e6`), 20 passed / one failed.
  `e2e/sign-in.spec.ts:189`, remember-me true: remained on `/login` rather than reaching `/`. Retained network
  trace confirms `POST /api/token/` returned 429; failure snapshot shows “Too many requests.” Source at
  `backend/apps/authentication/api.py:96` applies `LoginThrottle("5/m")` with scope `auth_login`. The run history
  records a completed command with exit 1, not a runner failure; available memory remained above 9 GB.
  Concurrent or recent attempts sharing the client IP are a suspected contributor, not established provenance
  for the earlier five attempts. No application or test fix applied, and no rerun claimed as resolution.
- **Manual proof:** Owner agreed to perform criterion 14; seeded local credentials supplied after staging credentials
  were found not to apply to this isolated database. Outcome pending. ADR-048 and ADR-049 remain Proposed until
  verification resumes; criterion 13 remains unchecked.
- **Stop:** quality gate failure awaiting Owner direction. Recommend allowing the login window to expire and
  rerunning the real sign-in cases without overlapping manual login attempts, retaining the first failure. Then
  finish the author criteria walk and offer the independent companion. No verification or code-review conclusion.


## 2026-11-14 · Verification amendment and browser evidence

- **Owner approval:** replace criterion 14's manual interaction proof with three Playwright journeys, keep visual
  poster readability manual, and use real local authentication and writes with isolated records. Amendment-only
  independent review offered; Owner explicitly chose “Skip, agreed.” Owner also requested one continuous card-action
  backing bar, icon hover colors and tooltips above the controls. The PRD and task list carry these changes;
  criterion 14 is superseded by 16 and 17. No criterion is claimed from the earlier mouse-only manual check at 1440p.
- **Author amendment checks:** the changed contract is reader-independent, retains keyboard/touch requirements and
  card geometry, and states local-only isolated fixtures. D26 records a tactical testing disposition; D27 maps the
  visual control choice to ADR-048. No product capability or backend contract changed. Independent amendment pass
  declined by Owner; verification and code review remain separate, outstanding passes.
- **Sign-in rerun:** six cases pass (`1b8e1b5495244b5d9d4bb836a72e8984`). This clears the timed login obstruction
  for continuation, not a claim that the earlier 429 did not occur. New journey setup makes at most one bounded,
  annotated retry following a 429's Retry-After window, without changing rate limits or clearing shared cache.
- **Isolation advice:** `/root/advisor` (Astra, read-only) endorsed transactional creation of a temporary verified
  user and stored synthetic movie, cleanup only after successful setup, development and local-target guards, and
  bounded subprocess execution. Catalogue responses are synthetic and hydrate their tracking fields from the real
  record endpoint; this verifies persisted state, not the backend catalogue-enrichment integration, which separate
  backend tests cover. Authentication, record/entry writes and watchlist reads stay real.
- **Bar RED:** `0e4b91bc962e4e7484db73e8a9f29513` fails on the original action group's transparent background versus
  the expected popover surface. The subsequent implementation supplies one surface, transparent buttons, tertiary
  icon hover and top tooltips.
- **Current browser run:** `b67b88bf03384810a2c8cfcbae303fa7`: mouse and keyboard complete both real logs,
  watchlist removals, separate reviews/ratings, opener focus, geometry and persisted rating after reload. The mouse
  case also checks the backdrop, all four hover colors and upper tooltip. Touch fails at first rating: a tap on the
  fourth star's left quarter selects 4 rather than 3.5. Earlier fixture issues (waiting for sign-in navigation and
  normal Escape dismissal when keyboard traversal reaches notifications) were corrected.
- **Verified defect / proposed correction:** the installed rating widget derives fractions from pointer movement;
  a stationary tap sends the whole index, and a first mouse movement can enter hover without establishing the
  half. Both `EntryFormFields` and `FilmRating` use this behavior. Astra confirmed the defect from source; its
  advice is to handle completed pointer activation at the editable controls, preserving keyboard/focus/disabled
  behavior and preventing an integer overwrite. No finding-driven application fix applied pending Owner approval.
  The mouse journey currently performs normal hover then movement; it does not prove the first-click defect fixed.
- **State:** tracked changes are the approved PRD/task amendment, ADR-048 control description and
  `MovieCardActions`; new untracked files are `e2e/tracking-fixture.ts` and `e2e/tracking-journey.spec.ts`.
  No commits. Tasks 6.1.a and 6.1.b remain open until their required checks pass.

- **Additional checks:** frontend type check passes (`c9e24347b2ac42d4ad2f27f788d84d2f`), all three touched
  TypeScript files pass ESLint, formatting is applied, documentation lint and `git diff --check` pass. Related
  component tests pass, 131 cases across seven files (`b8e18a057a684f2687a2c1817ddfb3d2`). A pre-existing
  Toaster act warning appears in the detail suite; it is not a failed assertion. No full rerun is claimed on the
  changed tree; complete browser checks remain gated by the verified touch defect.


## 2026-11-15 · Verification · author criteria walk

- **Scope:** all 17 Success Criteria in `tasks-user-movie-controls.md`, the complete change from merge base
  `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1` through HEAD `537dd757f782469bab1d185b7db18257029ffaf4`,
  and all current uncommitted changes and five new source/browser files. Reachability is the resulting working tree.
  The retained subject manifest hashes the changed/new file contents. There is no delivery plan or member slice.
- **Owner disposition:** approved fixing first-pointer half-star selection in both editable controls. This corrects
  the existing half-star requirement, with no new design or backend contract. The source uses one shared item and
  completed activation; keyboard changes retain native stepping and debounce. Guards keep disabled input inert, and
  pointer saves discard the abandoned keyboard preview. No commits were authorized or made.
- **Fail-first evidence:** panel mouse and touch both select 4 instead of 3.5 before the change
  (`6cc8dbcfdb5845fd9881283faa62df17`); the earlier dialog touch journey has the same failure
  (`b67b88bf03384810a2c8cfcbae303fa7`). The corrected five cases pass
  (`a1f3e005b78b471f8cdc6738646b42b3`). The cancellation check was strengthened to wait beyond 500 ms,
  reload persisted state before the next selection, and start on a stable control. A deliberately early
  pointer-down-save reconstruction fails at the cancelled gesture's no-selection assertion
  (`23b483a475a94e1fa82985f263f5f32e`); the reconstruction was removed before the final run.
- **Advisor advice:** `/root/advisor` endorsed the bounded completed-activation correction and fixture boundary;
  its useful checks led to the longer cancellation observation and explicit disabled guard. The shared midpoint
  follows the application's left-to-right presentation. Keyboard navigation in the journey uses the supported Escape
  dismissal when notifications receive focus; this is not proof of unrestricted Tab traversal through notifications.
  Advice is not an independent review.
- **Final checks:** complete browser suite, 26 passed (`c56f6f04a80e4123be532150c635e8b8`); all five new cases
  skip on the staging target without fixture setup (`f44fe151693846cca0767b9cca19b1dc`); final related frontend
  run, 175 passed across 14 files (`9c5af929d25a4985a2c5e663ce6d9f19`); final type check passed
  (`d18f6735d2cb4d1fafea8c441b2a4525`); all eight new/touched TypeScript files pass ESLint and Prettier.
  Documentation lint and whitespace checks passed after mechanical line-wrap/blank-line corrections. The earlier
  full verification run passed 3,357 frontend tests and 1,469 backend tests, pinned backend lint/format/Pyright,
  full frontend lint/format and contrast. Backend and generated schema/types remain unchanged by this branch.
  The production build and PR CI have not run here; no success is claimed for them.
- **Visual evidence:** five contact sheets retained in `browser-proof/`, one per palette, show both color modes,
  light/dark synthetic poster fixtures and neutral/pressed icons. Visually inspected all 20 combinations on the
  local application. The opaque shared bar keeps icon contours and pressed colors distinct from both poster
  extremes. Capture run: `2323d1e6dc384f3e9561bf52ac565faf`. The Owner's earlier mouse check at 1440p is
  supplemental, not evidence for the new keyboard or touch cases.
- **Criteria report:** 15 met (`1–3`, `5–13`, `15–17`); two superseded (`4 → 15`, `14 → 16 and 17`),
  no unresolved criterion. The per-criterion evidence table is saved with the task list. ADR-048 and ADR-049 were
  set Accepted (2026-11-15); the PRD/task headers stay unfinished pending the independent companion decision.
- **Boundary qualification:** synthetic catalogue responses hydrate from the real record endpoint, and the browser
  cases prove real authentication, film/entry writes, watchlist reads and persistence. They do not exercise backend
  catalogue enrichment, which the full backend suite covers separately.
- **Next:** recommend independent criteria-verification pass 1 (Heavy, cap 2) over the same whole subject, with
  criterion verdicts and author evidence withheld. Owner approval pending. Code review is a later, separate pass.


## 2026-11-15 · Verification · Criteria verification — pass 1

- **Authorization:** Owner approved the offered independent verification pass.
- **Runner:** independent delegated reviewer (local), fresh context and read-only; about seven minutes.
- **Subject:** complete change from merge base `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1` through HEAD
  `537dd757f782469bab1d185b7db18257029ffaf4`, plus tracked and nonignored untracked working-tree changes.
  All 81 subject-manifest file hashes matched before and after the pass.
- **Inputs:** PRD, criterion-unmarked task-list copy with the author evidence appendix withheld, governing project
  context, exact diff, resulting tree and raw palette contact sheets. No author criteria conclusions or advisor
  discussions were supplied. Prompt, input copy, manifest and report are retained in `adversarial-review/`.
- **Rubric:** all 17 supplied Success Criteria, including normal, boundary, failure and recovery behavior required
  by the 15 active criteria. Criteria 4 and 14 were checked as superseded by the approved replacements.
- **Result:** no critical, major or minor finding; all 15 active criteria met; no unresolved evidence.
- **Fresh checks:** 264 tests across 20 criterion-related files (`43f41b7aa43441aa86c71ce9bc08c0fb`) and
  15 browser cases (`7f49fa6883d048c092c3bcde3a88163d`) passed. Snapshot-preparation attempts refused by the
  sandbox did not execute checks; the permitted retries did and exited zero.
- **Primary validation:** checked both run histories against the expected HEAD and commands, confirmed the subject
  hashes stayed unchanged, and compared the report's source-grounded criterion conclusions with the retained author
  source walk. The independent visual inspection covered the same five raw contact sheets.
- **Dispositions:** none required. No shared finding cause, fix batch, fix check or successor pass is needed.
- **Stop reason:** clean convergence. Verification is complete; this is not the separate code review.
- **Closing bookkeeping:** marked 6.1.d and 6.1 complete, set PRD/task headers Complete and dated the task list,
  and updated session pointers. These closing metadata changes follow the reviewed subject; no application or test
  source changed after the pass. Changes remain uncommitted.
- **Next:** completion workflow from § 1b, documentation cleanup and completion metadata on Owner approval.
  Code review, commit, publication and merge have not been authorized by the verification approval.


## 2026-11-15 · Completion preparation

- **Generated-code applicability:** no backend or generated OpenAPI/TypeScript file changed in the branch or local
  changes. No schema regeneration was applicable; the integrated-base case audit remains recorded in the task list.
- **Mode 2 cleanup:** evaluated the completed 688-line task list in one pass. Metadata, purpose/scope, all six
  phases, detailed task outcomes, substantive implementation reference and immutable criteria/evidence were retained.
  Removed stale Proposed/verification-forward status sentences, completed-stage coordination instructions and
  duplicate completion commentary. Condensed pagination/integration notes to the actual interface and conditional
  test adaptation map; retained the PRD's binding R41 obligations. Recorded the final pointer-rating implementation.
- **Preservation checks:** all 74 task titles/checkmarks, all 18 Goal paragraphs and the complete Success Criteria
  text are byte-for-byte unchanged from the pre-cleanup snapshot. The task list is 665 lines; all tasks remain complete
  and the criterion verdicts remain 15 met and two superseded. The retained before-copy supplies cleanup provenance.
- **Notes disposition:** no companion implementation-notes file exists, so none was created or deleted. Useful
  implementation rationale remains in the task list, ADRs and strategies. Personal session/review records and raw
  proofs remain in their established workspace; the shared design draft stays in the backlog for the related work.
- **Completion metadata:** created `completion-user-movie-controls.md`, dated consistently with the task header.
  Claims were checked against every phase, final verification state, the ADRs, source and HEAD `537dd757`. No
  volatile test counts, unperformed CI/build claims or deferred implementation were added to the completion summary.
- **Checks:** documentation lint, whitespace and protected-content checks passed. Application and test hashes still
  match the independently verified subject; this preparation changed documentation only. No tests were rerun.
- **Commit preparation:** proposed two commits, not staged or executed: the remaining 14 coupled verified
  control/test/spec/guidance files with their task check-offs, then the standalone completion summary. Messages
  follow commit-format and are retained as files. The first commit includes task-record cleanup rather than
  separating task check-offs from the source they complete. Owner approval is pending.
- **Next:** the completion workflow's commit checkpoint, followed by separate code review. No push, PR, merge or
  archive move has been performed.

## 2026-11-15 · Approved commits and author code check

- **Authority:** the Owner explicitly approved both concrete commits in the prepared plan.
- **Commits:** `e8e2ee6f` contains exactly the 14 approved control, browser-test and associated record/guidance files;
  `328216d7` contains only the completion summary. Both pre-commit and commit-message hooks passed. The first hook's
  debug warning matches existing Python output examples in QUICK-REFERENCE, outside the changed lines.
- **Git result:** working tree and index are clean. No push, pull request, merge, archive or worktree removal.
- **Author check subject:** the complete 82-file aggregate diff from merge-base
  `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1` through `328216d7218b07c2adad182d12826226cfa32a63` and resulting tree.
  Applied code-review-author to scope, consistency, cleanup, documentation drift, markers, correctness and errors.
  Examined shared mutation/Undo ownership and failure paths, dialog submission and draft retention, deletion/focus,
  rating input, card/grid geometry, navigation, picker pagination isolation, fixture authority and browser journeys.
  Checked cross-task integration coverage and the architecture/ADR/strategy statements against source.
- **Result:** no actionable author findings. Aggregate whitespace check passed; no added unresolved/debug markers
  were found. The sole new skip is the explicit staging guard. No source changes or additional test runs were needed;
  the earlier verification runs remain the test evidence. Production build and PR CI have not run.
- **Boundary:** this is an author preflight, not independent code review. The clean independent criteria pass is
  separate. Recommend a fresh-context code review of the complete branch; Owner choice pending.
- **Integration still pending:** local main is now `9962f99174c45179ac306f7cfb80b2ebec58b61b`; the branch merge-base
  remains the verified baseline above. R41 integration and final alignment are required before publication.
- **Session pointers:** updated to the completed commits and recommended independent code-review choice.

## 2026-11-15 · Code review — pass 1, delegated agent (local)

- **Authority and runner:** Owner approved the recommended independent code review; fresh read-only reviewer
  `/root/code_review_pass1`, without parent history, author conclusions, earlier review results or private session notes.
- **Subject:** complete 82-file branch change from `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1` through
  `328216d7218b07c2adad182d12826226cfa32a63`, with resulting-tree callers. Manifest hashes and clean tree confirmed.
- **Rubric:** code-review-standard, all five implementation-audit dimensions and repository contract coherence.
- **Result:** one verified major, zero critical/minor/unsupported. F1: a private entry draft remains displayed after
  authentication ownership ends without navigation. Primary traced the host/form state, idle-renewal path, session
  retirement and PRD privacy contract, and checked the reproduction's command, exact head and failed run status.
- **Checks:** 91 focused tests in five entry/rating/log/feedback files passed (run
  `9309a88ff3a44b4da8e9316b3077057f`). Memory-only retirement regression failed as expected, one failed/24 skipped
  (run `16a89e842d244ff2a36aad3a82420da6`); no source was changed. Whitespace check passed. Browser, visual and full
  suites were not rerun. Initial sandbox refusals preceded exact-command escalated execution.
- **Shared cause:** draft lifetime is not tied to user ownership in the single shared host. The proposed correction
  covers new drafts, edits and discard confirmation together; write/Undo retirement already operates separately.
- **Proposed response:** F1 FIX (local correction), full behavioral verification scope. Complete proposal retained
  with source references; Owner approval pending. No finding-driven edit, commit or publication has been performed.
- **Stop reason:** approval of the complete disposition set. The pass is not clean and has not converged. After the
  material repair, recommend a fix check and then offer a successor complete pass; neither is authorized yet.
- **Elapsed:** approximately ten minutes including primary source verification and report preparation.
- **Session pointers:** updated to the finding and approval stop.

## 2026-11-15 · Approved F1 repair and focused verification

- **Authority:** Owner approved the proposed one-fix set and focused verification. No commit, publication,
  independent fix check or successor complete review was authorized by that reply.
- **Correction:** each opening retains its owner and ownership signal. A layout subscription retires the private
  request/form, open/dirty/discard state and focus references, including an already-ended signal. The active-opening
  reference prevents a stale listener or callback from clearing a later draft. Form submission retains the original
  owner and checks it before invoking mutations, preventing reassignment during the unmount interval. Current-owner
  delayed saves still report feedback without closing a newer draft.
- **Advice:** read-only Astra `/root/advisor` recommended the existing signal and highlighted the submit/unmount
  race. Its final inspection found no decisive remaining flaw or unnecessary mechanism; it recommended finishing
  existing checks. This settled the bounded implementation choice; it was advice, not an independent fix check.
- **RED:** three edit/new/discard retirement cases failed with the dialog still present
  (`cc51e10f4c74452e93f1688ad739c9f9`). The submit-boundary case failed on an actual PUT carrying private content
  (`e4371d89901c482cbddae6aaee2a1f71`). A narrow reconstruction removing the pre-subscription retirement guard
  failed the late-listener case (`68794f28472d4354a1dd04d7008d8eed`); the source was restored exactly afterward.
- **Test-harness corrections:** corrected the race fixture's HTTP method to PUT before using its failure as
  evidence; the initial nonmatching PATCH handler's passing run is not proof. Moved the test's external retirement
  callback setup into an effect to satisfy React purity lint.
- **GREEN:** 248 related tests across 13 entry/authentication/session/integration files passed
  (`6e3c5de8ff6646769dbe2c0c74dd6d89`), including all five new regressions. The two entry files passed 45 tests
  before the late-listener case was added (`970e7fdec1a5435a940918719a748a3c`). Later formatting changed tests only.
  All six affected browser cases passed: browse/detail/phone and the mouse/keyboard/touch tracking journeys
  (`2e96800a4a5846e492d8d2f0d0c182d6`). After current Chakra type generation, frontend type checking passed
  (`74c14785ca0a4953b075bdf58d114157`). All four touched TS files pass ESLint and Prettier; both changed documents
  pass markdown lint; whitespace check passes. No backend, full-suite or production-build rerun, and no PR CI.
- **Execution boundary:** routed snapshot preparation initially failed under the sandbox; histories show not-run,
  followed by successful exact-command escalated execution. No runner mode or throttling policy was changed.
  Existing React act warnings remain captured by the established inbox item; they are not new test failures.
- **Records:** added completed Task 6.2, updated completion behavior/evidence wording, retained the approved set,
  regression reconstruction and exact six-file repair manifest. No source changes were made after passing checks.
- **Next:** propose one six-file commit with its prepared message, then recommend a fresh independent fix check.
  A later complete pass remains a separate choice once that check settles. Session pointers updated; no staging,
  commit, review invocation, push, pull request or merge has been performed for this repair.

## 2026-11-15 · Repair commit and independent fix-check launch

- **Authority:** Owner explicitly approved the prepared six-file commit and the recommended independent fix check.
- **Commit:** `9a2bd02ffd83353ea287fd581d6bee98009fc7e5`, `fix(movie): retire drafts with user ownership`.
  Staged file/content hashes matched the approved repair manifest. Pre-commit and commit-message hooks passed;
  working tree and index are clean. No new checks were needed for unchanged source at the commit boundary.
- **Fix check:** round 1 since code pass 1, fresh read-only reviewer `/root/code_fixcheck_pass1_round1`, without
  inherited history. Exact subject `328216d7218b07c2adad182d12826226cfa32a63` through the repair commit, all six files,
  original F1 and approved correction boundaries; closure, behavioral grounding, propagation/completeness and new
  failure. Brief and exact subject manifest retained. No author success claims or advisory conclusions supplied.
- **Boundary:** result pending. No successor complete review, push, pull request or merge authorized.

## 2026-11-15 · Code review — fix check, round 1 since pass 1, delegated agent (local)

- **Runner and subject:** fresh read-only reviewer `/root/code_fixcheck_pass1_round1`; complete six-file correction
  `328216d7218b07c2adad182d12826226cfa32a63..9a2bd02ffd83353ea287fd581d6bee98009fc7e5`, plus original F1,
  approved boundaries and relevant upstream/caller context. Prompt, report and exact manifest retained.
- **Rubric and coverage:** closure, behavioral grounding, propagation/completeness and new failure, supplemented by
  implementation-audit and repository contracts. Every correction file and its resulting source was covered. No
  private context beyond the brief and manifest was read; no author success claims were supplied.
- **Result:** zero findings of any grade; no unsupported findings. The repair holds within the existing ownership
  boundary. No dispositions or further fix batch are required, and no new shared cause was identified.
- **Fresh checks:** eight-file entry/authentication/session/write-ownership run passed, exit 0
  (`acec0d1b2a2140828c477c48ab9fcbc0`); whitespace check passed. Primary checked its command, expected head and
  successful history, spot-checked ownership/submission guards and EntryForm consumers, and confirmed all six hashes
  still match with a clean tree. No browser/full-suite/lint/type reruns by the reviewer; primary's earlier repair
  checks remain separate. Expiry and direct-login propagation were source-traced and tested in separate cases,
  without a combined browser scenario. Existing act/flushSync warnings remain separate from passed assertions.
- **Trend:** converging — Code pass 1: one major, then this fix check: zero. The approved F1 response and fix-check
  round are complete. This bounded correction check does not establish a clean complete-branch pass.
- **Stop reason and next:** fix-check round converged. Recommend complete code review pass 2 against the final
  branch, since the last complete pass found one major; Owner choice pending. No invocation, push, PR or merge
  authorized by the completed round.
- **Elapsed:** approximately five minutes including primary result verification and recording. Session pointers
  updated to the complete-pass recommendation; source and git state unchanged.

## 2026-11-15 · Code review pass 2 — bounded-review launch

- **Authority and steering:** Owner approved complete code review pass 2 and asked whether subagent chunking was
  being used because the diff is large. Primary answered that prior complete reviews were whole-target and treated
  this as a preference to chunk the new pass, explicitly communicating that assumption. This is a per-review
  exception to the legacy method's disabled chunking convention; no shared process document was changed.
- **Exact target:** `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1..9a2bd02ffd83353ea287fd581d6bee98009fc7e5`,
  82 files, 9,555 added and 455 deleted lines. Head/source frozen for review.
- **Partition:** entry/write/dialog/picker contracts and tests, 31 files (3,382 additions/52 deletions); visible
  card/grid/film/navigation/theme contracts and tests, 32 files (3,428/368); browser/application composition and
  documentation, 19 files (2,745/35). Behavior-local tests stay with their implementation; composition tests belong
  to their separate cross-surface contract. Every changed outside declaration is explicitly external by owning chunk.
- **Guard:** measured union exactly equals all 82 target files, with no duplicate/uncovered file. Import/reference
  mapping identifies 34 direct cross-chunk edges, all annotated external; full annotations cover changed declarations
  reached through unchanged helpers too. The prior repair type check applies to these unchanged source hashes.
  Frozen partition/manifest, coverage guard, rubric and brief digests are retained. Chunk boundaries follow contracts
  rather than an arbitrary line ceiling; each residual scope is bounded below the whole target's attention burden.
- **Runner boundaries:** fresh read-only reviewers `/root/code_pass2_entry`, `/root/code_pass2_surfaces` and
  `/root/code_pass2_composition`; none inherits history or receives author conclusions. All receive the complete
  five-dimension rubric and repository contracts, exact local files and explicit external annotations. Prior F1 is
  contextual history, not the search frontier; its previous repair/check outcome claims are withheld.
- **Completion plan:** dedicated fresh seam review after local coverage, then fresh non-author aggregate over the
  partition, coverage facts and structured reports. These are components of one logical complete pass, not extra
  successor passes. No partial report can settle it. Primary retains source verification, dispositions and fixes.
- **Boundary:** no source edits, new implementation, push, PR or merge authorized. Pass result pending.

## 2026-11-15 · Code review — pass 2, delegated agent (local)

- **Logical pass and coverage:** the three fresh bounded local reviewers completed 31 entry, 32 surfaces and
  19 composition/documentation files. A fresh seam evaluator covered all 34 recorded import edges plus material
  transitive/prose/composition boundaries. Fresh non-author aggregate `/root/code_pass2_aggregate` independently
  validated complete union, evaluator reports/digests, all five rubric dimensions, repository contracts and findings.
  These five evaluator contexts form one complete pass, not five passes. Raw structured reports, coverage, prompts
  and source-native supplemental geometry evidence are retained in `adversarial-review/pass2/`.
- **Exact result:** complete `46ae700bc66e1c7924b42b48bbd856f7aa70e5e1..9a2bd02ffd83353ea287fd581d6bee98009fc7e5`;
  all 82 source hashes, report hashes and local brief hashes match, with no missing, extra or duplicate file.
  Aggregate found three minor, zero critical/major; primary source verification supports all three, with zero
  unsupported findings. No evaluator or primary changed source/git state.
- **F1, proposed FIX (local correction), full verification:** unknown-year metadata wraps at the supported 138px
  card width and displaces the stars in the fixed text block. Primary reproduced the final browser measurement:
  year 42px versus 21px at 194px; content scroll height 133px versus fixed 128px. The current 194px grid is correct;
  the probe does not establish an existing 138px production caller, and the rating stays inside the card. Proposal
  fits the row and preserves accessible content, with minimum-width geometry coverage.
- **F2, proposed FIX (local correction), full verification:** new tracking/rating browser journeys lack axe scans
  required by the testing strategy. Primary inspected both specs/helpers and shared scanner. Proposal adds scans
  after distinct reached-page ready states, including dialog and phone-sheet states, without weakening existing
  input, auth/write or journey checks.
- **F3, proposed FIX (local correction), full verification:** structural CSS/XPath card/radio/focus lookups conflict
  with the semantic-locator contract. Primary confirmed every reported site. Proposal uses semantic card/region/radio
  locators and state reads while preserving keyboard, focus and geometry proof.
- **Shared causes:** findings are distinct. F2/F3 share a guidance domain, not a single code defect or a missing
  design contract; fixing either alone would not fix the other. No duplicate was merged and no earlier private-draft
  defect recurred. No PRD expansion or unrelated work is proposed.
- **Fresh checks:** 128 tests in nine entry files (`23addeaae0bf494ba732a4baa907d9a7`), 189 in eleven surfaces
  files (`e0369f7ad9ba4862b682df358975f29d`) and the App integration test
  (`633f03e527034536a9ca69ffcf1cd85c`) passed: 318 tests/21 distinct files. All five tracking/rating Chromium cases
  passed (`f033448bdbda4359a9ccf5414eacc84e`). Primary verified all four run histories' commands, exact head and
  status 0. Read-only geometry probes supplied the layout finding. No broad suite, production build or PR CI rerun;
  no lint/type rerun was required for unchanged source. Existing act warnings remain the recorded inbox concern.
- **Aggregate limits:** targeted aggregate inspection relies on complete bounded local source review; its own
  execution checked coverage/hashes/imports rather than rerunning local tests. Synthetic catalogue geometry/journeys
  do not prove backend enrichment; no fresh aggregate visual-palette proof or backend ownership proof is claimed.
  Conditional integration is assessed only at this exact target; later main alignment remains separate.
- **Trend:** converging — Code pass 1: one major, fix check zero; Code pass 2: zero critical/major, three minor.
  Minor-only signal can converge after the complete disposition set is approved; current completeness is pending.
- **Stop and recommendation:** present all three proposed fixes for approval before any edit. Recommend focused
  behavioral verification and, after the batch, an independent fix check at this full scope; no third complete pass
  recommended on a minor-only result. No commits, new review invocation or publication is authorized by this report.
- **Elapsed:** approximately twenty minutes including partition preparation, bounded/seam/aggregate review and
  primary verification. Session pointers updated; working tree remains clean at `9a2bd02f`.

## 2026-11-15 · Approved pass-2 F1–F3 repair in progress

- **Authority:** Owner approved all three local corrections and focused verification. No commit, independent fix
  check, successor review or publication authority is included.
- **F3 and F1:** Card.Root now exposes a named article so geometry uses semantic lookup; keyboard radio selection
  uses checked state/first radio and notification focus reads a semantically located region. No structural selector
  remains in the changed journey/input/rating/layout files. Added a local-only browser geometry case at 194px/138px
  using controlled component width and synthetic catalogue records; no authentication/backend claim is made by it.
  It failed at year height 42px versus 21px (`090ea2a94c1449df9ef2d26fb10937ff`), then passed with min-width-zero
  truncation preserving the full label text (`2b5b5f9f546640ea907557c5e103278e`).
- **F2:** shared scanner calls now cover login/home, reached tracking pages, entry dialog and rating-sheet states.
  First six-case run had two passes/four contrast failures (`f0a633a01ec24f9582eca539772dc3c7`); diagnostics retained
  before the next run, excluding traces/auth headers. No rule or baseline was relaxed.
- **Diagnosis:** Astra `/root/advisor` advised measuring ancestor opacity before assuming token defects, and waiting
  only relevant visible transient surfaces. A read-only animation diagnostic reproduced the touch failure while the
  rating dialog was at opacity 0.08–0.17 during a 500ms entrance animation
  (`06ef22e27a534aa2bc7842bc84acb528`). A bounded finite-motion readiness check of dialog/alertdialog/notification
  surfaces and their descendants then passed the same case with dialog/ancestor opacity 1
  (`5ab2622dc05141adbca382eedafbaa2e`). Diagnostic logs were removed; exact structured evidence is retained.
  This adds readiness before one axe audit, not retrying axe until success or changing application motion/colors.
- **Mechanical correction:** type checking identified the optional catalogue.results field in the new fixture;
  an explicit required-fixture guard was added. The initial type check is not reported green.
- **Current:** final affected browser run `000f1b5c3bc2499aa7492ac832bb7297` is running. Full validation, task and
  completion records remain. No source staging or commit. Pointer fields updated for continuity.

## 2026-11-15 · Pass-2 repair batch completed and verified

- **Implemented:** all three approved local corrections. Named card articles and semantic radio/notification lookups
  replace structural queries. The year shrinks/truncates while its full text remains accessible; the new geometry
  case passes at 138px and 194px. Scans cover reached pages and dialog/sheet states using the shared helper's scoped,
  bounded finite-motion readiness. Rules, baseline handling and application dialog/toast motion are unchanged.
  The geometry fixture controls Card.Root width and disables its transition solely for width measurement; it makes
  no native-grid-width or authentication/backend claim and skips staging.
- **Readiness cause and advice:** the failed scans reached the dialog while its measured entrance opacity was below
  one. Same-flow diagnostics show opacity one in the dialog and every ancestor after finite motion settles, with
  passing audits. This is mechanism-backed diagnosis, not a green retry alone. Astra's final bounded inspection found
  no decisive flaw or unnecessary mechanism, and emphasized that the helper covers dialog/notification descendants,
  not all page ancestors/backdrops or guaranteed toast lifetime. Explicit Logged/Undo assertions remain in the journey.
  Advice was not an independent fix check. Temporary diagnostic code was removed before final runs.
- **Final affected checks:** all six cases passed (`000f1b5c3bc2499aa7492ac832bb7297`), including both pointer-rating
  cases, all three input journeys and the new geometry case.
- **Broader browser check:** shared axe readiness affects all specs, so the complete suite ran once on final source:
  27 passed (`610c875753304a81bfdeefed3fd9f8af`). No retries or new baseline exclusions.
- **Related and static checks:** 131 tests/seven related files passed (`203bd69fa18f42aea6c4a8a225053990`). Frontend
  type checking passed after the required-fixture guard (`63c810f40d604a9bb794be79b58332e0`). All six touched/new TS
  files pass ESLint and final Prettier checks; all four modified docs pass markdown lint; whitespace check passes.
  Existing act warnings remain captured separately. No backend/full-frontend-suite/production-build/PR-CI rerun.
- **Target exclusion:** all six local fixture cases skip under the staging target
  (`ab23c92224e14192bc60edf62ca31cef`), using the local URL and unused dummy credentials, without contacting staging.
- **Evidence checks:** primary inspected the final four histories' exact commands, predecessor HEAD and successful
  outcomes. Success Criteria and axe baseline are byte-for-byte unchanged. The observed failed geometry/contrast/type
  runs remain recorded; none is relabelled green. Snapshot sandbox refusals preceded exact-command escalated execution;
  no runner/memory switch was changed.
- **Records:** completed 6.3 and its three subtasks, updated completion/reference records, retained approved response,
  raw diagnostic contexts and sanitized before/after animation evidence. Prepared exact ten-file manifest, atomic
  commit plan and message, keeping coupled card/geometry/journey/helper changes with their task check-offs.
- **Next:** request approval of the concrete commit and one bounded independent fix check, round 1 since pass 2.
  No third complete pass is recommended for the minor-only result. No staging, commit, review invocation, push,
  pull request or merge performed for this batch. Session pointer fields updated.

## 2026-11-15 · Pass-2 repair commit and independent fix-check launch

- **Authority:** Owner explicitly approved the prepared ten-file commit and one scoped independent fix check.
- **Commit:** `870536729dede0808fbb5fbd63888f4b448386e1`, `fix(movie): complete tracking browser verification`.
  Staged contents matched every hash in the approved repair manifest. Pre-commit and commit-message hooks passed;
  the sole warning matched existing Python output examples in QUICK-REFERENCE, outside its changed lines. Working
  tree and index are clean; no check rerun was needed for identical content at this commit boundary.
- **Fix check:** round 1 since complete pass 2, fresh read-only `/root/code_pass2_fixcheck_round1`, no inherited
  history. Scope is exactly `9a2bd02ffd83353ea287fd581d6bee98009fc7e5..870536729dede0808fbb5fbd63888f4b448386e1`,
  all ten files and the three approved correction boundaries. The reviewer gets current source and rubric, not
  author conclusions or previous test/advice outcomes. The small correction uses one bounded evaluator; it is not
  another complete pass. Prompt and exact manifest retained; result pending.
- **Boundary:** no new complete review, push, pull request or merge authorized. Pointer fields updated.

## 2026-11-15 · Code review — fix check, round 1 since pass 2, delegated agent (local)

- **Runner and scope:** fresh read-only `/root/code_pass2_fixcheck_round1`; exact complete ten-file correction
  `9a2bd02ffd83353ea287fd581d6bee98009fc7e5..870536729dede0808fbb5fbd63888f4b448386e1`, all three approved
  findings, four fix-check axes, implementation-audit dimensions and repository contracts. Prompt, report and manifest
  retained. No author success claims/private context beyond the brief and manifest were supplied or read.
- **Result:** zero findings of any grade; no further dispositions, shared cause or repair required. Geometry,
  semantic locators, audit coverage and scoped finite-motion readiness hold within the declared boundaries.
- **Fresh execution:** all six correction browser cases passed (`de44f2dc70354e44abd7420fa581a585`). A memory-only
  probe of the actual scanner passed (`1433d652f0ee4001bca91a60056118e1`): finite scoped descendants settle,
  infinite scoped/finite outside motion do not block axe, deliberately poor contrast still fails, and a long scoped
  finite animation times out around five seconds with diagnostics. Initial snapshot refusals were corrected through
  exact-command escalation; probe setup/expected-failure handling was corrected before final evidence.
- **Primary verification and limits:** inspected both histories' exact head and successful outcomes, spot-checked
  source claims and confirmed all ten source hashes with a clean tree. No fresh complete browser suite/type/Vitest
  execution by the checker; prior batch checks remain separate. No staging/manual data writes. Controlled component
  widths are not a native responsive-grid claim; shared readiness is not an all-page animation guarantee.
- **Trend and stop:** converged — Code pass 1: one major then fix check zero; Code pass 2: zero material/three minor,
  then this fix check zero. Every approved response is complete. No third complete pass recommended for these repairs.
  The complete review remains bound to the pre-integration source; later integration is a new compatibility surface.
- **Elapsed:** approximately six minutes including primary result verification. Pointer fields updated.

## 2026-11-15 · Main integration and alignment preparation

- **Observed target:** main and origin/main are `1f7416f5787a99793537886bd42b9a35fddb6c09`; direct remote-read
  verification agrees. It includes Home and the later movie-change backend. No source, branch/reference or database
  merge/mutation was performed. The three-tree textual preview and its facts are retained; it predicts 11 conflict
  files among 17 overlapping changed paths, with rename-handling limitations stated.
- **Alignment:** read main's META-PRD vision/core features/out-of-scope and TECHNICAL-OVERVIEW. Private film controls,
  reviews, ratings and viewing entries align with them; no social/TV/streaming scope is added. The existing form/query
  decisions are explicitly represented in this branch's ADRs and technical update. No material vision/architecture
  disagreement was identified at this target.
- **R41 audit:** API schemas/types changed, Home exists, Library UI does not, and save/Undo time zones are present in
  main's shared options. Required integration is R41a/b/d, including combined Home/picker contexts, generated types,
  time-zone assertions, signed-out Home copy, ADR-046/048 status and Home axe/card tests. The new browser helper's old
  welcome heading must follow main's settled Home readiness. No R41c Library routes/links are proposed.
- **Concrete next proposal:** named-main merge, conflict resolution, the specified compatibility changes, Task 6.4,
  validation and a local integration commit, with a prepared plan/message. Main merge requires explicit approval;
  no push, PR, merge to main, staging hold or additional independent review is included. Source remains clean at
  `87053672` pending the Owner's decision.

## Main compatibility integration (2026-11-15)

Owner approved the exact-main plan and its local integration commit. Merged target `1f7416f5` into `87053672`,
resolving the anticipated eleven textual conflicts and applying R41a/b/d. R41c does not apply: no Library UI.
Home and picker contexts, tracking state/ownership, main’s time-zone save/Undo behavior, and browser readiness
compose in the resulting tree. Main’s backend implementation and regenerated schema artifacts remain unchanged.

Checks: 1,007 affected backend tests, 3,452 tests across 125 frontend files, 27 local Chromium cases, frontend
type-check/lint, 74 source/test formatter checks, eight integration-document lints, whitespace and generated drift
passed. Red Home copy cases and the initial expected request-body/duplicate-import mismatches preceded the green run.
The backend remainder and production build were not rerun. Run IDs and the exact boundary are retained in
`main-integration-evidence.json`; no new independent review, publication or staging access was authorized.

Read-only Astra advice (`/root/advisor`) found the boundary sufficient; its request-transport uncertainty is covered
by existing Home and picker MSW checks in the passing full suite. This was advice, not an independent review.
Alignment against main’s META-PRD vision/out-of-scope and TECHNICAL-OVERVIEW found no material disagreement.

Integration committed as `13fee93262491df00f5ea4ba4db44e719ef548fc` with both approved parents. Normal hooks passed.
Post-commit ADR check: 50 numbered, four changed against main, no problems. The working tree is clean;
backend and generated API artifacts equal the integrated main target. No push or PR created.
The next optional action is a focused independent integration review; it requires separate approval.

## Standard code review — pass 3, focused integration, delegated agent (local)

Owner approved one fresh read-only focused integration pass at `13fee93262491df00f5ea4ba4db44e719ef548fc`.
The exact 35-path subject combines the complete paths differing from both parents, explicit card/baseline conflict
resolutions and API artifacts. The evaluator compares both parents, follows composition dependencies and applies all
five implementation-audit dimensions plus repository contracts. This is focused integration evidence; it is not
a third complete branch pass. The neutral prompt and manifest are retained in `adversarial-review/integration/`.
No author findings, conclusions, suspected defects or check claims were supplied. Report pending.

Focused pass 3 result: zero findings; complete 35-path source coverage and all five dimensions reported.
Stop reason: converged for this focused integration scope, not a new whole-branch verdict.
Elapsed approximately 438 seconds. No dispositions, fixes or successor review are required.
The reviewer’s optional six-file Vitest run `ce5036b924b44aa685197c0b67d583a2` was not run: snapshot creation was
read-only, and automatic approval rejected the retry under an interpretation of the no-ARC-CLI restriction.
This source-only review establishes no independent execution result; the existing author-run checks remain distinct.

Primary verification confirmed exact head, both parents, all 35 hashes, the complete combined-path union and clean tree.
Spot checks confirmed card/baseline equality with the tracking parent, generated equality with main, unchanged backend,
shared time-zone injection/validation and independent Home read options. The raw report is retained in
`adversarial-review/integration/report.md`. No further review or publication has been invoked.

## Publication and CI result (2026-11-15)

Owner approved publishing exact head `13fee932` and the presented title/body. PR #209 opened against main `1f7416f5`.
CI run `43766401554` failed in two journey checks: the App/MSW initial action-group wait (3451 other tests passed),
and the mouse browser journey’s second Log (26 other browser cases passed). Backend tests, backend static checks,
docs, API types and image builds passed; ci-ok is red and frontend production build did not run after the failure.
The browser trace shows the immediate film-link/Log sequence opening a picker before the film surface settles,
then losing the draft on navigation. The App startup cause remains suspected timing: the exact local coverage
command passed 3,452 tests across 125 files, run `fcd3c9bc392c4418a4bc7af5d06b3bc6`, without changes. This green
diagnostic does not resolve CI or prove a fix. No source edits, rerun of hosted CI, further commit/push or review
request followed. A bounded two-journey readiness repair is proposed for approval.

## Journey-readiness correction (2026-11-15)

Owner approved bounded test diagnosis/repair, checks, one commit and push. Commit `a1f4c6a3` updates the two journeys
and their task/completion notes. Initial readiness has one scoped five-second semantic wait and an additional
controlled first-response case; the complete two-log assertions remain. The browser awaits its named destination
and pressed watchlist before Log. No application implementation or global wait/retry policy changed.

Controlled old/new startup runs: `05569a859ef04c098b8d6ca44db55432` failed the delayed case;
6ad33e49d4d04e57b83256053a0d2fc0 passed both. Measured pre-data startup near one second supports the readiness
budget correction without proving precise CI scheduling. Browser CPU-throttle reconstruction `a00ec7d650c6498daded7db2de14cf0c`
failed at the same second-log boundary; `0196f2d777fd48d49238c0c522988c8f` passed under the same 12-times throttle.
Temporary timing observers/output and throttling were removed from final source.

Final local checks: 3,453 tests across 125 files with CI-equivalent coverage, three browser modes, type-check, two-file
ESLint/Prettier, documentation lint and whitespace passed. Evidence and command histories remain with the correction
records. Backend tests and production build were not rerun locally for the test-only repair. Read-only Astra advice
found the boundary sound and noted that the second parameterized case may reuse the first case’s loaded modules;
no claim that both independently prove cold startup is made. Advice was not an independent fix check.

Normal hooks passed; the approved commit was pushed to PR #209. New exact-head CI observation is pending.
No independent correction review or main merge has been authorized.

Readiness correction CI result: run `43768736195` is green for exact head `a1f4c6a3`. All 27 browser cases pass; frontend
coverage, formatting, type/lint/contrast and production build pass. Backend tests/static checks, API types, image
builds and docs pass. The required ci-ok gate is green; PR head rechecked unchanged, no review threads exist, and
the ADR check against freshly fetched main passes. The tree is clean. The initial startup scheduling detail remains
unproven; the controlled pending-response regression and current CI establish the bounded readiness contract.

No independent repair check or further hosted review has run. Recommend skipping another review because this final
correction changes only test readiness and documentation, retains the behavior assertions, and both failed paths
now pass in CI. The optional check remains the Owner’s choice. Explicit merge approval is still required.

## Merge (2026-11-15)

Owner agreed to skip the optional readiness fix check and further review, and explicitly approved merging PR #209.
Refreshed required ci-ok was green for exact head `a1f4c6a3`; no review threads existed. After fetching main, the
ADR check passed (50 numbered, four changed), and the source tree was clean. PR #209 merged with a merge commit,
`7f96d37f8f00cb8377c9499306ee523d94987d99`, preserving history. Automatic main CI, staging deployment and smoke
observation are pending. No new review request, local branch removal or archive operation was performed.

## Post-merge staging failure (2026-11-15)

Main CI and deployment passed for merge `7f96d37f` in run `43769778747`. Staging smoke job `132985028404`
failed: 19 passed, one failed, seven skipped. The remember-me sign-out case received HTTP 502 on
`POST /api/logout/` at 4:41 pm CT. The false remember-me case and other executed journeys passed.

A declared, bounded read-only staging hold covered proxy/backend logs and container-state inspection, then was
released. Caddy records the backend resetting this connection after approximately 13 ms. The backend container
remained running without OOM or restart; inspected application stdout/stderr shows no matching exception. Subsequent
home and API health requests returned 200. These observations do not establish the underlying cause or resolve the
failed smoke check. No source change, service restart, redeploy, CI rerun or rollback was performed.

Exact-head observation is terminal with a staging-smoke failure; the original observation deadline is retained.
Recommend a separate bounded logout/proxy investigation, subject to the Owner's fix/defer decision. Private sanitized
evidence retains the check IDs, failure boundary and read-only results. Worktree closure/archive has not run.

## Logout transport repair and staging verification (2026-11-15)

Owner approved a separate bounded investigation and repair after the first deployment's staging smoke failure.
PR #210 (`bc88c849`) sets Caddy's backend idle timeout to one second, below Gunicorn's effective two-second timeout,
and adds a production-image timeout relationship check to CI. The old image contract failed; updated images passed.
An isolated real transport diagnostic retained burst connection reuse and moved idle closure from Gunicorn to Caddy;
a subsequent POST succeeded on a fresh connection. The original 502 was not deterministically reproduced.

After approved publication and an explicit skip/merge decision, PR #210 merged as `b363c7f1`. Main CI run
`43773193867`, automatic deployment and staging smoke all passed. Staging smoke job `132995390308` passed 20 tests
with seven expected skips, including both remember-me sign-in/sign-out cases. A declared read-only staging hold
confirmed the deployed web revision and the one-second timeout on both backend routes; inspected proxy logs from
the smoke window contain no errors. The hold was released. No manual redeploy, rollback or service restart ran.

This establishes removal of the confirmed timeout mismatch and successful deployed logout behavior; it does not
prove the precise cause of the original intermittent reset. The conversation returned from the completed repair
to this session home. Both merged worktrees and their evidence remain preserved; no cleanup/archive operation ran.
