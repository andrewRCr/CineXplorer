# Review Log: user-movie-changes

## Design review (determinacy confirmation)

- **2026-11-14.** No independent pass, by the Owner's decision: decisions 5 to 7 of the Library's design draft, which
  the confirmation adopts, had converged after three independent passes there, and the confirmation added no design.

## PRD review

### PRD review — pass 1

- **Date:** 2026-11-14, 9:08 to 9:26 pm CT (about 18 minutes).
- **Stage:** PRD (`prd-user-movie-changes.md`, detailed · RFC, Class Heavy, pass cap 2).
- **Runner:** independent (a fresh read-only reviewer subagent).
- **Rubric:** assess-design-proportionality, design-audit, and spec-review at `detailed` (with source-grounding at
  `artifact` scope).
- **Reviewed version:** `prd-pass1.md`.
- **Findings by verified grade:** 1 major, 2 minor; none unsupported.
- **Approved dispositions (Owner, 2026-11-14):**
    - F1, major, § 6 Testing's list of existing tests to rewrite was incomplete (two tests the new constraint
      refuses, one that loses its isolation, and an order-dependent concurrency test): FIX (local correction), stating
      the rule and the complete list.
    - F2, minor, D11's form for ADR-047's Status differed from the ADR methodology and the confirmation: FIX (local
      correction), the first line in the methodology's partial-supersession form.
    - F3, minor, D3's reason understated how often the UTC fallback's day is wrong: FIX (local correction).
- **Shared causes:** none across findings. F1's instances share one cause: the list came from a search for fixture
  factories and request bodies that missed records liked by attribute assignment and an interaction under concurrency.
- **Stop reason:** none; not converged (an approved fix of a major finding). The Owner approved the fix check and
  agreed with the recommendation to stop after it, without pass 2.

### PRD review — fix check, round 1 since pass 1

- **Date:** 2026-11-14, 9:30 to 9:42 pm CT (about 12 minutes).
- **Runner:** independent (a fresh read-only reviewer subagent).
- **Rubric:** fold fix check: closure, behavioral grounding, propagation and completeness, new failure.
- **Reviewed versions:** `prd-pass1.md` → `prd-pass1-round1.md`.
- **Result:** pass 1's F1 and F2 closed; F3 partly closed.
- **Findings by verified grade:** 2 minor; none unsupported.
- **Approved dispositions (Owner, 2026-11-14):**
    - F1, minor, D3's new bound ("up to half the day") was too low, since Auckland is UTC+13 on the PRD's date: FIX
      (local correction), stating the hours as the zone's offset with two examples.
    - F2, minor, § 6 Testing's rewrite rule ("stores a liked, unwatched record by any route") reached passing tests
      its complete list rightly leaves out: FIX (local correction), narrowing it to records written directly.
- **Shared causes:** none.
- **Stop reason:** converged (minor fixes only). Round 2 declined on the recommendation, both fixes being wording;
  no pass 2, as the Owner agreed after pass 1. The loop ends here, with the post-settle reread run over the settled
  PRD.

## Task-list review

### Task-list review — pass 1

- **Date:** 2026-11-14, 10:09 to 10:27 pm CT (about 18 minutes).
- **Stage:** task list (`tasks-user-movie-changes.md`, `medium` path, Class Heavy, pass cap 2), with the PRD's header
  change (Related Work removed).
- **Runner:** independent (a fresh read-only reviewer subagent).
- **Rubric:** task-audit at full depth (source-grounding at `artifact` scope and the eight categories), and
  executability, over the PRD and the finished task list.
- **Reviewed version:** `tasks-pass1.md` (and `prd-header-change-pass1.diff`).
- **Findings by verified grade:** 1 major, 5 minor; none unsupported.
- **Approved dispositions (Owner, 2026-11-14):**
    - F1, major, 2.3.a's "one save's rows share one `created_at`" case couldn't fail under the frozen clock the notes
      direct: FIX (local correction), written under `auto_tick_seconds` and added to the reconstruct-and-revert list.
    - F2, minor, 1.1.a's 409 case passes today without a named reconstruction: FIX (local correction).
    - F3, minor, 1.1's Goal refused a like on an unwatched film, contradicting D1: FIX (local correction).
    - F4, minor, 1.3's Goal misstated date added for watchlist with watched: FIX (local correction).
    - F5, minor, `--reuse-db` hides an edited migration from the test database: FIX (local correction), a note to run
      with `--create-db`.
    - F6, minor, criterion 1's frozen-clock API test needs its sign-in inside the clock: FIX (carried as context in
      3.2.b).
- **Shared causes:** F1, F2 and F6 share one: the test-time conditions (the frozen clock, tests passing early) were
  stated for some cases and not checked across all of them.
- **Stop reason:** none; not converged (an approved fix of a major finding). The Owner approved the fix check.

### Task-list review — fix check, round 1 since pass 1

- **Date:** 2026-11-14, 10:32 to 10:46 pm CT (about 14 minutes).
- **Runner:** independent (a fresh read-only reviewer subagent).
- **Rubric:** fold fix check: closure, behavioral grounding, propagation and completeness, new failure.
- **Reviewed versions:** `tasks-pass1.md` → `tasks-pass1-round1.md`.
- **Result:** pass 1's F1 to F6 closed, their claims holding at source.
- **Findings by verified grade:** 2 minor; none unsupported.
- **Approved dispositions (Owner, 2026-11-14):**
    - R1, minor, 1.1.a's "Expect tests to FAIL initially" line, which the fix account said pointed to the notes, was
      unchanged: FIX (local correction), the line names its early-passing cases.
    - R2, minor, 3.2.b's sign-in bullet named no actor and left out the 5-minute access token, which the Time note's
      clock advances outlast; 1.1.a's "holds today" named no actor: FIX (local correction).
- **Shared causes:** none.
- **Stop reason:** converged (minor fixes only). Round 2 declined on the recommendation, both fixes being wording; no
  pass 2. The loop ends here, with the suite-coherence pass rerun over the settled task list and lint clean.


## Verification

### Author criteria walk

- **Date:** 2026-11-15, beginning 6:55 am CT.
- **Stage and rubric:** whole-work-unit verification against all Success Criteria in `tasks-user-movie-changes.md`
  and their governing design in `prd-user-movie-changes.md`; `validate-criteria` with its CineXplorer override.
- **Span:** complete diff from base `9962f99174c45179ac306f7cfb80b2ebec58b61b` to
  `b3fbace3206744e522c0a429082d9681aeb9c1e7`, the resulting tree and the local ADR-051 acceptance.
- **Report:** criteria 1–11 met, with per-criterion source/test evidence beside the criteria; criterion 12 awaits
  its expressly post-merge staging deployment and smoke proof. No implementation gap found by the author walk.
- **Checks:** backend pytest 1,620 passed; frontend Vitest 3,294 passed in 112 files; Chromium E2E 21 passed;
  pinned Ruff lint passed and 301 backend files formatted; full Pyright zero errors and warnings (26 informational
  diagnostics); frontend lint/type-check after Chakra type generation passed; contrast 1,508 passed with zero
  failures and 272 outside theme scope; production build passed; full markdown lint passed; no migration or API
  schema/type drift. The browser stack applied both migrations successfully.
- **Routed evidence:** frontend tests `be830e007f9d4dba99aecfb12bda5e1b`; Pyright
  `d42e1f732acb4758b83b4269a82a3088`; frontend lint `31a23e19736b4041b603f9f1659b826e`; type-check
  `a19eb0cf78fd4e98a855719f39832cee`; contrast `766343e84cf2417db1d42e3bebcfd719`; E2E
  `1354747def9b460caade4f518945f2dd`; markdown lint `6cacaebc61e34423a3ff2973d22fd864`.
- **Run handling:** initial routed attempts failed before running because sandbox restrictions prevented snapshot
  writes. Their histories reported not-run; authorized retries ran successfully. Pyright used the isolated pinned
  stubs described at handoff, with a temporary adjacent config removed after the run; shared tools were preserved.
- **Observations:** React act warnings and the logger's ineffective dynamic import warning remain. The Owner
  approved capturing them as two separate inbox errands; both are captured. The build also emits its chunk-size
  advisory; no build failure. No application code changed during verification.
- **Independent companion:** the Owner approved one fresh-context criteria pass. Its supplied artifact withholds
  execution claims and criterion markings, and its prompt withholds this author's report. See pass 1 below.


### Criteria verification — pass 1

- **Date and elapsed time:** 2026-11-15, approximately 7:04 to 7:08 am CT (about four minutes).
- **Stage:** verification of the whole work unit (Class Heavy, pass cap 2).
- **Runner:** independent Codex reviewer subagent, fresh context, read-only.
- **Rubric:** all Success Criteria against their governing PRD, complete change and resulting tree, using
  `validate-criteria` and the independent adversarial verification posture. This is separate from code review.
- **Span:** base `9962f99174c45179ac306f7cfb80b2ebec58b61b` through head
  `b3fbace3206744e522c0a429082d9681aeb9c1e7`, plus ADR-051's local acceptance.
- **Kept inputs/result:** `prompt-verification-pass1.md`, `verification-pass1-tasks.md`,
  `verification-pass1.diff`, `report-verification-pass1.md`. The task-list artifact includes the complete criteria
  without marks or execution claims; the author's criteria report was withheld.
- **Findings by verified grade:** 0 critical, 0 major, 0 minor; none unsupported. No dispositions or fixes required.
- **Result:** no pre-merge criterion gap found across criteria 1–11. Criterion 12 retains its specified post-merge
  staging proof obligation. The independent pass inspected source and test adequacy; it did not execute tests or
  independently verify CI/deployment results. The author's actual runs remain the execution evidence.
- **Source spot-check:** checked the single timestamp passed to join stamping and deployment dependency for staging
  smoke; both match the report. No new implementation change or claim introduced by the pass.
- **Shared causes:** none.
- **Stop reason:** clean convergence. No fix check or successor pass needed. Task 4.1 is complete, the PRD and task
  list are marked Complete, and session pointers name completion preparation next. One extra blank line in the
  new evidence notes was corrected by markdown lint; no application code changed.


## Completion preparation

- **Date:** 2026-11-15.
- **Scope:** generated-code synchronization, task/notes hygiene and completion metadata under
  `archive-completed.md` sections 1b–3. The successful generation during verification still covers the unchanged
  application tree; schema/type files have no uncommitted diff.
- **Hygiene:** all task lines and historical outcomes retained; removed the stale card-controls coordination note,
  made a historical test result past tense, and retained the migration/testing findings plus live release checks.
  All implementation tasks are complete. The only open criterion is the specified post-merge staging proof.
  There is no tracked companion notes file to prepare or delete; personal session/review state remains separate.
- **Completion metadata:** `completion-user-movie-changes.md` records deliverables, recording/Undo rules, rollback
  limits, verification and the History, controls, privacy-policy and post-merge obligations. Dates match the task
  list and PRD. Claims checked against the aggregate diff, ADR-051, task outcomes and current source.
- **Validation:** markdown lint passed on all four changed documentation files; task-line descriptions and PRD
  Success Criteria remain unchanged. No application test rerun: only documentation changed after the full run.

### Author code-review preflight

- **Target:** complete diff from `9962f99174c45179ac306f7cfb80b2ebec58b61b` through
  `b3fbace3206744e522c0a429082d9681aeb9c1e7`, plus verification/completion documentation edits and the resulting tree.
- **Rubric:** `code-review-author`: scope, consistency, temporary/debug artifacts, documentation drift, unresolved
  markers, business correctness and explicit failure handling. Followed request/schema boundaries and the locked
  record and entry write paths, the shared recorder, constraints, migrations, sorting and browser mutation.
- **Findings:** none from this author preflight. It is not independent code-review evidence.
- **Next:** explicit approval for the four-file documentation commit, then the recommended separate independent
  code review of the complete branch change. That review must cover migrations 0004 and 0005 together, forward and
  back; the criteria pass does not replace it. The Owner subsequently approved the documentation commit and one independent code-review pass; pushing remains unapproved.


## Documentation commit and code-review launch

- **Date:** 2026-11-15, 9:45 am CT.
- **Approval:** the Owner approved the four-file documentation commit and one independent code-review pass.
- **Commit:** `265042ed91a345d2f6a969b17138b262b6d0062c`, documentation only: completion metadata, PRD/task status
  and evidence, and ADR-051 acceptance. Pre-commit and commit-message validation passed; the latter emitted only
  its advisory for a 53-character subject, below the hard limit. The working tree is clean.
- **Target launched:** complete diff from `9962f99174c45179ac306f7cfb80b2ebec58b61b` through the commit above,
  with the resulting tree. `prompt-code-pass1.md` contains only target, governing source/specification and rubric;
  no author's conclusions, suspected defects or earlier verification report. The fresh reviewer is read-only and
  covers every rubric dimension, with migrations 0004 and 0005 together in both directions. See pass 1 below.


## Code review

### Code review — pass 1, delegated agent (local)

- **Date and elapsed time:** 2026-11-15, approximately 9:45 to 9:49 am CT (about four minutes).
- **Runner:** independent fresh-context Codex reviewer subagent, read-only; no author conclusions, suspected weak
  spots, preferred fixes or execution report supplied.
- **Target:** complete diff from `9962f99174c45179ac306f7cfb80b2ebec58b61b` through
  `265042ed91a345d2f6a969b17138b262b6d0062c`, and its resulting tree. All 26 changed files covered.
- **Rubric:** `code-review-standard` and all five `implementation-audit` dimensions, plus AGENTS.md's repository
  contract coherence dimension. Coverage included both migrations together, forward and back.
- **Kept prompt/report:** `prompt-code-pass1.md`, `report-code-pass1.md`.
- **Findings by verified grade:** 0 critical, 0 major, 0 minor; none unsupported. No dispositions or repairs needed.
- **Source spot-check:** migration conversion scope, copied timestamp, constraint ordering and no-op reverse agree
  with source. Reviewed head and base match the report; the working tree remains clean.
- **Reviewer checks/limits:** diff whitespace passed; changed Python files parsed and generated schema inspection
  confirmed optional/nullable time_zone. The reviewer did not rerun runtime suites or independently verify CI or
  staging; the earlier actual local verification runs remain the execution evidence.
- **Shared causes:** none.
- **Stop reason:** clean convergence; no fix check or successor pass needed.

### Alignment and publication preparation

- Refreshed origin; `origin/main` remains `9962f991`, already merged into the reviewed head. Compared the final
  scope with that commit's META-PRD vision, personal movie management and out-of-scope list, and with
  TECHNICAL-OVERVIEW's backend services, persistence, frontend data flow and testing architecture. No material
  disagreement. The change remains private personal movie tracking and adds no social, television or streaming
  surface.
- ADR record check against `origin/main` passed: the changed accepted decision and partial supersession are valid,
  and the new number is available on the base.
- Prepared the exact PR title/body under `pull-request-format`: outcomes and design tradeoffs, one commit-pinned
  design link, explicit exclusions, no process vocabulary or review metadata. No local template or applicable
  accessible inherited policy found.
- **Next:** show the title/body and obtain approval to push the exact reviewed head and open its PR, then monitor
  its CI. Nothing has been pushed or published. Criterion 12 remains for the post-merge deploy and staging smoke.


### Additional hosted review decision

- The Owner approved skipping an additional hosted code review because the completed independent local pass covers
  the final published head. No further code-review pass was requested. The approved merge used that same head.


## Post-merge proof

- Criterion 12 is proven on merge commit `22bfc7ed` by successful CI run `43733367679`. Deploy job
  `132871735861` names its full deployment log, which lists migrations `0004_liked_requires_watched` and
  `0005_movie_changes` applied with OK and ends with deployment success. Following staging smoke job
  `132871938911` passed. No runtime or migration failure remains.
- The main-checkout closing steps still need to record the criterion's tracked evidence and archive the work after
  this linked-worktree session hands off and ends. No additional application change was needed after code review.
