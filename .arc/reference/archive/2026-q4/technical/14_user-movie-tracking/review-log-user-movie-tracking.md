# Review Log: user-movie-tracking

One entry per review pass and fix-check round, from the design review on. Kept versions, prompts and reports are in
`adversarial-review/` beside this file. The design review covers the draft all three user-movie units share
(`draft-user-movie-uis.md`); this unit was named `user-movie-uis` until its branch was renamed after that review.

## 2026-11-13 · Design review — pass 1

- **Stage:** design draft (`draft-user-movie-uis.md`), `Class: Heavy`, pass cap 2.
- **Rubric:** assess-draft-readiness (all four criteria, divergence for criterion 1), assess-design-proportionality,
  design-audit (draft point), source-grounding (artifact scope).
- **Runner:** fresh read-only reviewer subagent; its verdict reports `independent`, no session files loaded.
- **Author checks before the pass:** readiness, proportionality and source-grounding over the draft. Folded: ADR
  dispositions reassigned to the unit delivering each after the three-unit cut (ADR-044's bar and smoke-spec changes
  as partial supersessions, not amendments); React Hook Form's disposition; stale planning labels; the "latest entry"
  wording. Folded from Owner-relayed changes: the seams for search suggestions, and the landing page applying the
  signed-out card rule early.
- **Kept files:** `draft-pass1.md` (`5988dd4e604f96d2`, reviewed version), `prompt-draft-pass1.md`
  (`ca50054b33a4b0e2`, prompt), `report-draft-pass1.md` (`582e4c54dd355056`, report).
- **Findings by verified grade:** 11 major, 3 minor; none refuted. Every finding's origin is the reviewed draft.
- **Shared causes:**
  - The entry write's contract with the film record and the frontend's save layer was never stated: F3, F4, F5, F6.
  - The three-unit cut left shared parts and ADR owners unassigned: F2, F8, and F12's Log-button placement.
  - The readers and writers of the fields the tracking model removes were not inventoried: F7, F10, F14.
- **Approved dispositions (Owner, 2026-11-13, as recommended):**

  | # | Grade | Finding | Action |
  |---|---|---|---|
  | F1 | major | Watchlist rule compares dates in no defined time zone | FIX (new design) |
  | F2 | major | Smoke spec can't run in either target; ADR-039 policies missed | FIX (new design) |
  | F3 | major | Dialog's rating is both the entry's and the film's | FIX (new design) |
  | F4 | major | No source for the dialog's prefill after a picker selection | FIX (new design) |
  | F5 | major | Entry writes bypass the save overlay | FIX (new design) |
  | F6 | major | Undo of an entry delete has no restore path | FIX (new design) |
  | F7 | major | Library endpoint's changes have no owner and no contract | FIX (new design) |
  | F8 | major | The controls' and the Library's shared parts list is incomplete | FIX (new design) |
  | F9 | major | "Lists are small" is unsupported; the grid isn't virtualized | FIX (local correction) |
  | F10 | major | ADR-043 supersession misses "omitted field keeps its value" | FIX (local correction) |
  | F11 | major | React Hook Form gets no stated reason over Formik | FIX (local correction) |
  | F12 | minor | "Presentational" isn't an ADR-disposition category | FIX (local correction) |
  | F13 | minor | The 146px card width has no source; the shipped card is 194px | FIX (local correction) |
  | F14 | minor | Migration, admin form and record DELETE unaddressed | FIX (local correction) |

  Owner choices within the fixes: entry writes carry the browser's time zone (F1); the smoke spec runs on the local
  target only with seeded cards, and staging skips it (F2); deleting an entry asks for confirmation instead of Undo
  (F6); the tracking model delivers the shared frontend layer (F8); React Hook Form stays, with its reason (F11). The
  offered return to shaping for the entry contract was declined.
- **Other approved changes folded with the fixes (landing page, relayed):** the accessibility baseline's entries
  corrected (landing keeps `/browse` and `/search`, adds `/`; the controls remove all three); signed-out Home's band
  and pitch line name only what works at merge; "Recently watched" shows ratings with the tracking model's stars.
- **Author fold-grounding corrections:** the stars' ADR moves to the tracking model's ADR, since that unit delivers
  the star display (F8), and the controls' ADR records the card's controls and decisions 4, 9, 10 and 11; the stars
  also change the component-styling strategy's guide; decision 12 names CI's placeholder TMDB token and the
  browser-only fixture films as the reason for seeding.
- **Settled version:** `draft-pass1-round1.md` (`e5463d1cd4a4d6d2`).
- **Stop reason:** none yet; fixes of confirmed majors withhold convergence.
- **Conditional decision:** the fix check (round 1 since pass 1) and pass 2, the last under the cap, approved as
  recommended; pass 2 waits until the fix check resolves.
- **Elapsed:** reviewer 2:30 to 2:47 pm CT; folds landed by 3:00 pm CT.

## 2026-11-13 · Design review — fix check, round 1 since pass 1

- **Checked:** pass 1's folds, from `draft-pass1.md` to `draft-pass1-round1.md` (`e5463d1cd4a4d6d2`).
- **Rubric:** closure, behavioral grounding (source-grounding at fold scope), propagation and completeness, new
  failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read only the two session files its brief named.
- **Kept files:** `prompt-draft-pass1-round1.md` (`629d8e4b7f5e2497`, prompt), `report-draft-pass1-round1.md`
  (report).
- **Findings by verified grade:** 2 major, 7 minor; none refuted.
- **Origins:** F1 from pass 1's F3 and F4 fixes together (the dialog's prefill missed the overlay that F4's approved
  action named); F2 from pass 1's F5 fix (its ADR-027 disposition); F3, F4, F5 and F9 from partial closures of pass 1's
  F3, F6, F14 and F13; F6 from pass 1's F2 fix; F7 and F8 from pass 1's F2, F10 and F9 fixes.
- **Approved dispositions (Owner, 2026-11-13):** all nine FIX (local correction): the prefill goes through
  `useUserMovieState`'s overlay (F1); the tracking ADR supersedes ADR-027 in part on its one optimistic mutation hook
  (F2); "latest" is judged after an edit (F3); an edit's toast has no Undo, and the tracking model makes the shipped
  watchlist Undo send the Undo mark (F4); the migration keeps the watchlist, and the records' admin becomes
  view-and-delete only (F5); the spec's fixture films use IDs far above TMDB's range (F6); the Library's unit updates
  the smoke-tier texts, and the tracking model's unit amends DEVELOPMENT-RULES' PATCH rule (F7); the refetch cost is
  stated (F8); the Library grid measures its rows, the controls own the browse grid's row height, and the Library adds
  a `/library` baseline entry if it merges first (F9).
- **Other approved change folded with them:** the picker's list follows ADR-045's Select and Menu highlight (relayed
  from the project's planning after K43 merged).
- **Settled version:** `draft-pass1-round2.md` (`ac6ddf9c43a8ee7e`).
- **Stop reason:** none; material fixes call for a second round.
- **Conditional decision:** round 2, then pass 2, approved as recommended.
- **Elapsed:** reviewer 3:00 to 3:22 pm CT; folds landed by 3:26 pm CT.

## 2026-11-13 · Design review — fix check, round 2 since pass 1

- **Checked:** round 1's folds and the ADR-045 picker change, from `draft-pass1-round1.md` to `draft-pass1-round2.md`
  (`ac6ddf9c43a8ee7e`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read the two session files its brief named and
  the kept round-2 copy, which it loaded itself to diff.
- **Kept files:** `prompt-draft-pass1-round2.md` (prompt), `report-draft-pass1-round2.md` (report).
- **Findings by verified grade:** 1 major, 4 minor; none refuted.
- **Origins:** F1 from the Owner-approved ADR-045 picker change (its "covered by" disposition); F2 from round 1's
  "latest after an edit" fix; F3 from round 1's doc-update fix; F4 from round 1's row-height and baseline fix; F5 from
  round 1's refetch-cost fix.
- **Approved dispositions (Owner, 2026-11-13):** all five FIX (local correction): the picker's highlight is a tactical
  choice applying the component-styling strategy's Menu and Select rule, with a combobox recipe and the strategy
  naming the combobox, delivered by the controls (F1); an edit sets the current rating only when the entry is then the
  latest and the edit changed its rating or made it the latest, and an unrated entry never clears it (F2); the update
  lists add QUICK-REFERENCE's smoke-test section, the testing strategy's run-instruction count and the type-safety
  strategy's Pattern 3 (F3); `scanPage` groups Library tabs as `/library/:tab`, and the Won't Do bullet keeps the
  browse-grid tests beyond the row height (F4); the refetch cost reads at least 60 queries and names its code (F5).
- **Settled version:** `draft-pass1-round3.md` (`692b0a49ff7cc18d`).
- **Stop reason:** none; F1's material fix calls for a third round.
- **Conditional decision:** round 3, then pass 2, approved as recommended.
- **Elapsed:** reviewer 3:27 to 3:42 pm CT; folds landed by 3:48 pm CT.

## 2026-11-13 · Design review — fix check, round 3 since pass 1

- **Checked:** round 2's folds, from `draft-pass1-round2.md` to `draft-pass1-round3.md` (`692b0a49ff7cc18d`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read only the two session files its brief named.
- **Kept files:** `prompt-draft-pass1-round3.md` (prompt), `report-draft-pass1-round3.md` (report).
- **Findings by verified grade:** 1 major (documentation only, major as an incomplete list stated complete), 2 minor;
  none refuted.
- **Origins:** F1 from round 2's doc-list fix; F2 from round 2's edit-rule fix; F3 from round 2's picker fix.
- **Shared cause, recurring across three looks:** the hand-enumerated list of reference documents to update (round 1
  F7, round 2 F3, round 3 F1). Fixed at the cause: decision 12 now obliges the Library's unit to update every
  reference document that names, counts or describes the smoke specs, found by search, with the known ones as
  examples.
- **Approved dispositions (Owner, 2026-11-13):** all three FIX (local correction): the sweep obligation (F1); an entry
  write never clears the current rating, while Clear rating and an Undo restoring an empty rating do (F2); the
  combobox recipe uses the solid `tertiary` highlight (F3).
- **Settled version:** `draft-pass2.md` (`15ecd52c657c50fe`).
- **Stop reason for the fix checks:** Owner-stopped after round 3, going straight to pass 2. Residual: round 3's three
  folds, unattacked by a fix check; pass 2 and the post-settle reread cover them.
- **Elapsed:** reviewer 3:50 to 3:58 pm CT; folds landed by 4:04 pm CT.

## 2026-11-13 · Design review — pass 2 (limit reached)

- **Stage:** design draft, `Class: Heavy`, pass 2 of 2.
- **Rubric:** as pass 1 (readiness, proportionality, design-audit, source-grounding at artifact scope).
- **Runner:** fresh read-only reviewer subagent; `independent`, having read the review log and the four earlier
  reports its brief named, plus the kept `draft-pass1-round3.md` and `draft-pass2.md`, which it loaded to diff.
- **Kept files:** `draft-pass2.md` (`15ecd52c657c50fe`, reviewed version), `prompt-draft-pass2.md` (prompt),
  `report-draft-pass2.md` (report).
- **Findings by verified grade:** 1 major, 5 minor; none refuted. All originate in text that pass 1 and its rounds
  left unchanged or wrote: F1 in decision 3's lock and the record contract, F2 in decision 3's watchlist rule, F3 in
  the "latest entry" wording, F4 in decision 5, F5 in decision 12 (pass 1's F2 fix), F6 in the privacy assumption.
- **Approved dispositions (Owner, 2026-11-13):** all six FIX (local correction): the record carries whether the film
  has any entry, so cards can show the Watched lock (F1); the watchlist rule reads "changes from unwatched to watched
  without a date" (F2); one entry order for both rating rules, with an undated entry counting as dated on the day it
  was made (F3); Activity pages and virtualizes like the film tabs (F4); the spec deletes its fixture films' records
  before its journey (F5); the privacy assumption names the policy as written outside the repository, with the
  project's planning carrying the edit (F6).
- **Settled version:** `draft-pass2-round1.md` (`f433cdff3fa552a3`).
- **Stop reason:** `cap-exhausted` once the fix check resolves; every fold is a local correction, so the design holds.
- **Conditional decision:** a fix check (round 1 since pass 2), approved as recommended.
- **Elapsed:** reviewer 4:06 to 4:26 pm CT; folds landed by 4:46 pm CT.

## 2026-11-13 · Design review — fix check, round 1 since pass 2

- **Checked:** pass 2's folds, from `draft-pass2.md` to `draft-pass2-round1.md` (`f433cdff3fa552a3`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read only the two session files its brief named.
- **Kept files:** `prompt-draft-pass2-round1.md` (prompt), `report-draft-pass2-round1.md` (report).
- **Findings by verified grade:** 2 minor; none refuted. F2 graded minor because the planning record it doubted
  exists: the policy's review notes record the edit, with the join times as well.
- **Origins:** F1 from pass 2's entry-order fix (its order reaches decision 8's list, which predates it); F2 from pass
  2's privacy fix.
- **Approved dispositions (Owner, 2026-11-13):** both FIX (local correction): decision 8 lists entries in the reverse
  of decision 2's order, latest first, and Activity breaks same-date ties by when each entry was made (F1); the privacy
  bullet says the policy's text is drafted outside the repository for the privacy and terms pages, and that the review
  notes kept with that draft record the edit, join times included (F2).
- **Settled version:** `draft-pass2-round2.md` (`7b36fb8450dc8dd5`).
- **Stop reason:** `cap-exhausted`; both folds are local wording corrections, so the design holds. Residual: the two
  folds, unattacked by a fix check (Owner-approved, 2026-11-13); the post-settle reread covers them.
- **Elapsed:** reviewer 4:47 to 5:03 pm CT; folds landed by 5:47 pm CT.

## 2026-11-13 · Design review — post-settle reread

- **Read:** the whole settled draft, for coherence across decisions after the last folds.
- **Result:** no conflict between sections; decision 8's list, Activity's order, Home's "Recently watched" and the
  Watched tab's last logged all agree with decision 2's entry order, and the privacy bullet agrees with the roadmap.
- **Changes:** line wrapping only (the Activity bullet the last fold left ragged, five older ragged paragraphs, and one
  line over 120 columns), checked word for word against `draft-pass2-round2.md`; lint clean.
- **Final version:** `51d7722329cbbef7`.

## 2026-11-13 · PRD review — pass 1

- **Stage:** PRD (`prd-user-movie-tracking.md`), detailed · RFC, `Class: Heavy`, pass cap 2.
- **Rubric:** assess-design-proportionality, design-audit (spec point), spec-review at `detailed` with its override's
  ADR question, grounding by source-grounding at `artifact` scope over the PRD and the draft, including the draft
  check.
- **Runner:** fresh read-only reviewer subagent; its verdict reports `independent`, no session files loaded.
- **Author checks before the pass:** proportionality (`proportionate`); spec-review with source-grounding (named the
  entry service); draft check (absorbed the privacy-policy obligation and the approximate join times, corrected
  Goal 5's claim about ratings); size (565 lines, stays one work unit); lint clean.
- **Kept files:** `prd-pass1.md` (`2c9a28c717eb26f6`, reviewed version), `prompt-prd-pass1.md` (`e1b2a6746287bac9`,
  prompt), `report-prd-pass1.md` (report).
- **Findings by verified grade:** 3 major, 6 minor; none refuted. Every finding's origin is the reviewed PRD.
- **Shared causes:**
  - Lists of affected sites written by hand, not derived by searching for the changed rule: F2, F3, and F1's SC14
    part. The same cause recurred across three looks of the design review, fixed there by a search obligation; here
    D14 and § 6 Testing take the same form.
  - Success criteria not aligned with the design they check: F1, F8.
- **Approved dispositions (Owner, 2026-11-13, as recommended):**

  | # | Grade | Finding | Action |
  |---|---|---|---|
  | F1 | major | Two success criteria fail on a correct build | FIX (local correction) |
  | F2 | major | The new constraints break tests that create records directly | FIX (local correction) |
  | F3 | major | The document-update rule misses sites the change makes wrong | FIX (local correction) |
  | F4 | minor | `has_entries` has no stated purpose; "the panel" undefined | FIX (local correction) |
  | F5 | minor | Two decisions lack ADR dispositions; ADR-047 omits the cross-film list | FIX (local correction) |
  | F6 | minor | Most Non-Goals give no reason | FIX (local correction) |
  | F7 | minor | The "about 1 MB" worst case holds only for ASCII | FIX (local correction) |
  | F8 | minor | Most new database constraints have no criterion | FIX (local correction) |
  | F9 | minor | The 409 detail is unspecified when both causes apply | FIX (local correction) |

- **Author fold-grounding corrections:** line rewrapping; D15's list reordered (save windows before the time zone);
  SC3's element references read "(D1, D2, D3)". A search for omitted-field claims found no site beyond those F3 names
  and the type-safety strategy's Pattern 3, which D14 already names.
- **Settled version:** `prd-pass1-round1.md` (`848f3ee54d068f74`).
- **Stop reason:** none yet; fixes of confirmed majors withhold convergence.
- **Conditional decision:** the fix check (round 1 since pass 1) and pass 2, the last under the cap, approved; pass 2
  waits until the fix check resolves.
- **Elapsed:** reviewer 6:23 to 6:43 pm CT; folds landed by 6:47 pm CT.

## 2026-11-13 · PRD review — fix check, round 1 since pass 1

- **Checked:** pass 1's folds, from `prd-pass1.md` to `prd-pass1-round1.md` (`848f3ee54d068f74`).
- **Rubric:** closure, behavioral grounding (source-grounding at `fold` scope), propagation and completeness, new
  failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read only the two kept PRD copies its brief
  named.
- **Kept files:** `prompt-prd-pass1-round1.md` (prompt), `report-prd-pass1-round1.md` (report).
- **Findings by verified grade:** 2 minor; none refuted. All nine pass-1 fixes close their findings.
- **Origins:** F1 from pass 1's F7 fix (the corrected size bound named no actor); F2 from pass 1's F3 fix (the widened
  D14 rule reached no success criterion).
- **Approved dispositions (Owner, 2026-11-13):** both FIX (local correction): § 6 names Django Ninja's default
  `JSONRenderer` and the Caddyfiles behind the bound (F1); SC15 checks the sites D14's search rule names and any
  others a search finds (F2).
- **Settled version:** `prd-pass1-round2.md` (`c479666113251ef5`).
- **Stop reason:** converged (confirmed minors only); round 2 not offered beyond the recommendation to skip it, since
  both repairs are wording and pass 2 rereads the whole PRD.
- **Elapsed:** reviewer 6:48 to 7:01 pm CT; folds landed by 7:03 pm CT.

## 2026-11-13 · PRD review — pass 2 (limit reached)

- **Stage:** PRD, `Class: Heavy`, pass 2 of 2.
- **Rubric:** as pass 1 (proportionality, design-audit at the spec point, spec-review at `detailed` with its
  override's ADR question and source-grounding, including the draft check).
- **Runner:** fresh read-only reviewer subagent; `independent`, given pass 1's and its fix check's findings with
  their approved actions as `prior-findings`; no session files loaded.
- **Kept files:** `prd-pass2.md` (`c479666113251ef5`, reviewed version), `prompt-prd-pass2.md` (`f2f4a2452b480d17`,
  prompt), `report-prd-pass2.md` (report).
- **Findings by verified grade:** 1 major, 3 minor; none refuted. All originate in text pass 1 and its round left
  unchanged: F1 in D6's route table and D14's update rule, F2 in D3's lock paragraph and SC3, F3 in D15 and § 5 D9,
  F4 in § 7.
- **Shared cause:** F1 is a new instance of pass 1's named cause (a rule the change alters not carried to the
  documents it governs): two material looks in this loop (pass 1, pass 2). Fixed at the rule: D14's search covers
  rules the change replaces or departs from. An author sweep of every strategy STRATEGY-INDEX lists found no other
  departure.
- **Approved dispositions (Owner, 2026-11-13, as recommended):** all four FIX (local correction): D6 states the
  `PaginatedResponse` envelope through `paginate_queryset` with its reason, § 5 gives it a `none` disposition, D14
  names the pagination strategy's update and widens its search, SC15 adds the strategy (F1); D3 and SC3 state that
  no order leaves an unwatched film with an entry (F2); D15 adds D9's sorts (F3); SC7 checks Liked on entry writes
  and an edit's `made_on` and whole-entry replacement (F4).
- **Author correction approved with the set:** § 6 Testing's search for direct test writes also covers a field set
  on a fetched record that is then saved (raised by pass 2 as a non-finding note).
- **Settled version:** `prd-pass2-round1.md` (`dee9b61b009752ff`).
- **Stop reason:** `cap-exhausted` (F1's fix withholds convergence); every fold is a local correction, so the design
  holds.
- **Conditional decision:** a fix check (round 1 since pass 2), then stop at the limit, approved as recommended.
- **Elapsed:** reviewer 7:04 to 7:25 pm CT; folds landed by 7:28 pm CT.

## 2026-11-13 · PRD review — fix check, round 1 since pass 2

- **Checked:** pass 2's folds, from `prd-pass2.md` to `prd-pass2-round1.md` (`dee9b61b009752ff`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read only the two kept PRD copies its brief
  named.
- **Kept files:** `prompt-prd-pass2-round1.md` (prompt), `report-prd-pass2-round1.md` (report).
- **Findings by verified grade:** 1 major, 1 minor; none refuted. Pass 2's F2, F3 and F4 close.
- **Origins:** both from pass 2's F1 fix: SC15 kept "replaced rules" while D14 widened to "replaces or departs
  from", and D14 named one of the pagination strategy's two statements of the database-list envelope (F1); the
  envelope's new `none` disposition gave a false reason (F2).
- **Shared cause, recurring across three looks:** a rule the change alters not carried to every site that states it,
  the PRD's own criteria included (pass 1 F2 and F3, pass 2 F1, this round's F1). Read as sustained non-convergence
  and put to the Owner: re-entry declined; fixed at the rule, with SC15 checking every site D14's search reaches
  rather than restating its kinds.
- **Approved dispositions (Owner, 2026-11-13, as recommended):** both FIX (local correction): SC15 tied to D14's
  rule, and D14's pagination bullet covering every statement of the envelope in the strategy (F1); the envelope's
  disposition becomes covered by ADR-047, with D15's cross-film list item naming it (F2).
- **Author fold-grounding corrections:** D15's paragraph rewrapped.
- **Settled version:** `prd-pass2-round2.md` (`3deadbb3b9f88953`).
- **Stop reason:** none yet; F1's material fix calls for round 2.
- **Conditional decision:** round 2 since pass 2, approved as recommended ("yes, agreed").
- **Elapsed:** reviewer 7:29 to 7:39 pm CT; folds landed by 7:40 pm CT.

## 2026-11-13 · PRD review — fix check, round 2 since pass 2

- **Checked:** round 1's folds, from `prd-pass2-round1.md` to `prd-pass2-round2.md` (`3deadbb3b9f88953`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh read-only reviewer subagent; `independent`, having read only the two kept PRD copies its brief
  named. Its read-only Python probe left git-ignored bytecode under `backend/apps/core/`.
- **Kept files:** `prompt-prd-pass2-round2.md` (prompt), `report-prd-pass2-round2.md` (report).
- **Findings by verified grade:** 2 minor; none refuted. Round 1's F1 and F2 close without new failure.
- **Origins:** both carried, not introduced: F1 in § 5 D6's _ADR:_ sentence, whose "framework convention" reason the
  round-1 rewrite kept for the route shapes, false for a delete that answers 200 over the code's 204; F2 in D14's
  stay-as-written list, which SC15 now inherits, missing the migrations and migration tests that D10 and SC14 keep on
  the old fields.
- **Approved dispositions (Owner, 2026-11-13):** both FIX (local correction): the nesting under the film and the
  delete's answer are covered by ADR-047 through D12's entry writes as saves that return their film's record, and the
  edit's `PUT` is `none`, a tactical choice (F1); D14's stay-as-written list adds migrations and the migration tests
  (F2).
- **Settled version:** `prd-pass2-round3.md` (`748ccae9919c1f3b`).
- **Stop reason:** `cap-exhausted`; fix-check rounds Owner-stopped after round 2 ("yes, agreed, and on stopping").
  Every fold in the loop is a local correction, so the design holds. Residual: round 2's two folds, unattacked by a
  fix check; the post-settle reread covers them.
- **Elapsed:** reviewer 7:40 to 7:50 pm CT; folds landed by 7:51 pm CT.

## 2026-11-13 · PRD review — post-settle reread

- **Read:** the whole settled PRD, for coherence across sections after the last folds (spec-review's coherence slice,
  with its reader-independence and binding-completeness checks).
- **Result:** no conflict between sections. D2's entry order agrees with D4, D6's two lists and SC1 and SC4; D3's
  table agrees with its summary paragraph, SC1 and SC2; § 5 D6's ADR sentence agrees with D15's D12 item; D14's
  stay-as-written list agrees with D10, SC14 and SC15. The record routes D8 names exist, and D14's partial-supersession
  Status form matches the ADR methodology's.
- **Changes:** none. `**Class:** Heavy` header present; lint clean (0 issues); no prose line over 120 columns.
- **Final version:** `748ccae9919c1f3b`, identical to `prd-pass2-round3.md`.

## 2026-11-13 · Task-list review — pass 1

- **Stage:** task list (`tasks-user-movie-tracking.md`), level `high`, `Class: Heavy` (unchanged), pass cap 2.
- **Rubric:** task-audit at full depth (source-grounding at `artifact` scope over the task list and the PRD, and the
  eight categories), executability against `2_generate-tasks.md`, the task-list formatting strategy, test-first,
  testing-standards and the task loop, and coverage of D1–D15 and the Success Criteria.
- **Runner:** fresh read-only reviewer subagent; its verdict reports `independent`, no session files loaded.
- **Author checks before the pass:** Step 3.5 proportionality (`proportionate`) and boundary fit (stays one work
  unit, under the marks); per-phase grounding (Step 4.5) with two probes of the backend images (time zone database,
  `zoneinfo`'s errors); Step 9 suite coherence; Success Criteria diffed against the PRD (identical); lint clean.
- **Kept files:** `tasks-pass1.md` (`670ed3d6330edfe1`, reviewed version), `prompt-tasks-pass1.md` (prompt),
  `report-tasks-pass1.md` (report).
- **Findings by verified grade:** 1 major, 10 minor; none refuted. Every finding's origin is the reviewed task list.
- **Shared causes:** test lists that stop short of a criterion's full reach (F1, F2, F3, F9); done-signals that don't
  match what the code already does (F7, F8).
- **Approved dispositions (Owner, 2026-11-13, as recommended):**

  | # | Grade | Finding | Action |
  |---|---|---|---|
  | F1 | major | Criterion 9 is unproven for the edit's and the film list's `record` | FIX (local correction) |
  | F2 | minor | No test that clearing the latest entry's rating leaves the current rating | FIX (local correction) |
  | F3 | minor | The film's-list route has no exact-OpenAPI-statuses check | FIX (local correction) |
  | F4 | minor | 1.2.b places the self-contradiction 400 after the lock | FIX (local correction) |
  | F5 | minor | 2.3.a's "date added" wording can send list-plus-rated to the wrong sort | FIX (local correction) |
  | F6 | minor | 3.1.e names no way to force the create to win the race | FIX (local correction) |
  | F7 | minor | The factory's stamping lands in 1.3.f, so 1.3.c's PASS can't hold | FIX (local correction) |
  | F8 | minor | "Expect tests to FAIL" markers on cases that pass on arrival | FIX (local correction) |
  | F9 | minor | The migration test can't exercise the reverse's choice of "latest" | FIX (local correction) |
  | F10 | minor | Two pairs of tasks claim the same change; `HttpService` has no PUT | FIX (local correction) |
  | F11 | minor | Two Implementation Notes misstate facts (tzdata, transactional tests) | FIX (local correction) |

- **Author fold-grounding:** F6's ordering rests on Postgres's tuple lock queueing waiters in arrival order; the task
  confirms the order from the outcome under the break rather than assuming it. 5.4.a's pass-on-arrival cases cite the
  overlay's spread of `changes` and `beginUserChange`'s cache clear, both read at source.
- **Settled version:** `tasks-pass2.md` (`5e93947a670f1e1e`, 682 lines); Success Criteria unchanged; lint clean.
- **Stop reason:** none yet; a confirmed major's fix withholds convergence.
- **Decision:** the fix check skipped and pass 2, the last under the cap, approved (Owner, 2026-11-13: "straight to
  pass 2 after").
- **Elapsed:** reviewer 8:29 to 8:49 pm CT; folds landed by 9:09 pm CT.

## 2026-11-13 · Task-list review — pass 2 (limit reached)

- **Stage:** task list, level `high`, `Class: Heavy` (unchanged), pass 2 of 2.
- **Rubric:** as pass 1.
- **Runner:** fresh read-only reviewer subagent, given pass 1's findings with their approved fixes as prior findings;
  its verdict reports `independent`, no session files loaded.
- **Kept files:** `tasks-pass2.md` (`5e93947a670f1e1e`, reviewed version), `prompt-tasks-pass2.md`
  (`e6a1f21b4daf8c2e`, prompt), `report-tasks-pass2.md` (report).
- **Findings by verified grade:** 6 minor; none refuted. Reviewer's verdict: ready to execute as written, with local
  wording fixes. Pass 1's repairs re-attacked at source: ten held, and F8's held at its four sites without spreading.
- **Shared cause:** F1 continues pass 1's named cause (done-signals that don't match what the code already does):
  two looks (pass 1, pass 2). Fixed by sweeping every "Expect tests to FAIL" marker, not only the sites the finding
  named.
- **Approved dispositions (Owner, 2026-11-13, as recommended):**

  | # | Grade | Finding | Action |
  |---|---|---|---|
  | F1 | minor | More "Expect tests to FAIL" markers sit over cases that pass on arrival | FIX (local correction) |
  | F2 | minor | The entry create's 400s aren't placed before the TMDB lookup | FIX (local correction) |
  | F3 | minor | An over-long zone name raises `OSError` in the dev image (500, not 422) | FIX (local correction) |
  | F4 | minor | The record's rating-range database tests stop testing the range | FIX (local correction) |
  | F5 | minor | 3.1.e's lock-wait check would see other xdist workers' backends | FIX (local correction) |
  | F6 | minor | The Overview cites the draft by backlog path, against the filename-only rule | FIX (local correction) |

- **Author correction approved with the set:** 1.3.c's "created whole with its constraints" replaced: Django adds
  the entries table's foreign key and its index only as the migration ends (raised by pass 2 as a non-finding note).
- **Author fold-grounding:**
  - F1 at the named sites: 1.1.a, 1.3.e, 2.2.a, 2.3.a, 2.4.a and 3.4.a, with 429's OpenAPI expectation moved into
    3.4.a. Beyond the approved sites, the marker sweep found two more of the same kind and fixed them under F1: in
    1.2.a, the cases that leave the watchlist on and the null-rating success (today's `save` ties neither to watched),
    and in 1.3.d, the two keep cases. In 2.4.a, `undo` dropped by today's schema means only the kept join time and the
    kept place fail first, so its stamp and rules cases are marked too. The other markers sit over code that doesn't
    exist yet. All of these are named to the Owner at the approval stop.
  - Advisor check before the stop: 1.3.d's first wording ("pass on arrival") was wrong. After 1.3.c, `save` reads
    `record.watched_at` on every call and errors, and the keep cases pass with no stamping only once it drops the
    fields; reworded. The 2.2.a and 2.4.a breaks now say they follow 2.2.b and 2.4.b, as 5.3.a and 5.4.a do.
  - The author correction rests on Django 5.2.19's `table_sql` read in `infrastructure-backend:latest`
    (`sql_create_inline_fk` is None on Postgres, so the foreign key goes to `deferred_sql`).
  - F2 rests on `save`'s order (body checks before the lookup, the `Movie` stored outside the transaction); F3 on
    the over-long-name probe in both images; F4 on `test_models.py` lines 19–20; F5 on `-n auto --maxprocesses 4`;
    F6 on DEVELOPMENT-RULES' filename-only rule. F6 rewords the session notes' "cites it at that backlog path"
    (project-manager.CX) and keeps its intent: the draft isn't moved at archive.
- **Settled version:** `164af44bc9df8523` (712 lines; the task list itself, no kept copy); Success Criteria unchanged
  against the PRD; lint clean; no line over 120 columns.
- **Stop reason:** converged (confirmed minors only, all fixed), with the pass allowance exhausted.
- **Decision:** no fix check; stop at the limit, approved as recommended, followed by the author reread below.
- **Elapsed:** reviewer about 9:10 to 9:35 pm CT; folds landed by 9:46 pm CT.

## 2026-11-13 · Task-list review — post-settle reread

- **Read:** the whole settled task list against the PRD (Step 9's suite-coherence pass): the pass-2 version in full,
  then every change since it.
- **Result:** no conflict between tasks. 3.1.c's and 3.2.a's OpenAPI status sets agree with 3.4.a adding 429; 3.1.d
  places the three 400s before the card lookup as 3.1.b and 3.1.c test them; the time-zone note agrees with 3.1.a's
  and 3.1.c's cases; 1.3.c's migration order agrees with its `SET CONSTRAINTS` fallback and the migration-tests note.
  Every "Expect" marker and pass-on-arrival note reads true against the code each subtask meets, with `save` read in
  full. Coverage of D1–D15 and the criteria is unchanged, and the list is 712 lines and six phases, within the
  boundary marks.
- **Changes:** none beyond the folds above.

## 2026-11-14 · Verification — author criteria walk

Date: 2026-11-14. Implementation head: `9a82111eb8a8f4e9a9c49ae50ba3271e4792cc05`.
Scope: all Success Criteria in `tasks-user-movie-tracking.md`, the complete change from merge base
`e1540ef994ece3add2ab7678e725c73217f30010` to that head, and the resulting tree.
No implementation or test changes were made during this walk. The verification edits add criterion evidence and
set ADR-047 to Accepted (2026-11-14).

Each row identifies the criterion by its ordinal under Success Criteria. The task list retains the exact text.

| Locus | Evidence | Author state |
| --- | --- | --- |
| Implemented > 1 | `test_tracking_journey_retains_each_viewing` drives watchlisting, both rated/reviewed viewings, record GET, all Library filters, per-film history and activity. Passed in the full backend suite. Live readback retained both ratings/reviews, matching records and filters. | Met |
| Implemented > 2 | `test_record_save_rules`, `test_create_watchlist_rules`, `test_edit_current_rating_and_summary` and delete tests cover every transition and preserved flag; services apply supplied fields before omitted-field rules under the record lock. | Met |
| Implemented > 3 | API conflict/contradiction/clear tests, ORM constraint tests and `test_entry_create_and_unwatch_serialize_on_parent` cover refusal, rollback, database enforcement and both lock orders. All passed. | Met |
| Implemented > 4 | Entry create/edit/delete tests cover latest/backdated/undated/same-day order, unchanged or cleared entry ratings, later direct record ratings, and moving an older entry to latest. PATCH clearing is covered separately; `ordered_for_history` supplies the common effective-date order. | Met |
| Implemented > 5 | List-join stamping and Undo tests cover each flag. Library endpoint tests cover each single filter, list-plus-rated, combined/no/rated-only filters, both directions, nulls last and cleared-record exclusion. Live readback retained watchlist order 603, 105. | Met |
| Implemented > 6 | Frozen Kiritimati date/made_on and future-date refusal, Chicago watchlist join-day tests, and unknown/malformed zone schema/API tests passed. | Met |
| Implemented > 7 | Entry API, activity, service, schema and CSRF tests cover bodies, defaults, ownership, authentication, validation, upstream errors, replacement, deletion and pagination. Direct assertions against committed OpenAPI confirmed every specified status and shared error schema on all six route/method contracts. Regeneration produced no drift. | Met |
| Implemented > 8 | `test_record_saves_entry_creates_and_edits_share_limit`, for bearer and session, accepts a mixed 30 and refuses the 31st with Retry-After. Read/delete exclusion test passed. Existing live journey also proved the save throttle boundary through Redis. | Met |
| Implemented > 9 | Record GET/PATCH/Library, every entry response and film read, list and detail enrichment tests assert summaries. Query-count tests retain one enrichment query and two Library queries. Current live record/history/Library readback agrees. | Met |
| Implemented > 10 | `test_viewing_history_migrates_forward_and_back` covers date/review/rating transfer, undated reviews, rating-only watched repair preserving watchlist, initial join times and lossy reverse selection with multiple entries. Passed against PostgreSQL. | Met |
| Implemented > 11 | Six request-level admin cases cover list, read-only detail, add GET/POST refusal, change refusal and deletion with entry cascade preserving the movie. Passed. | Met |
| Implemented > 12 | MSW tests cover Undo body/state, serial saves/entry writes in both directions, confirmed-only entry effects, all mutation operations, active query invalidation, error toast, browser zones, queued/in-flight cancellation and entry-cache reset on user change. Passed in the full frontend suite. | Met |
| Implemented > 13 | `RatingStars.test.tsx` covers all ten ratings, both sizes, earned whole/half gold stars, names, keyboard focus, absent ratings, Rewatch name and removed MovieUserScore props. Passed; TypeScript and contrast checks passed. | Met |
| Implemented > 14 | Repository search outside migrations, migration tests, ADRs and planning/archive records found no old record date/review field names. Generated schema/types also carry only the new record. | Met |
| Implemented > 15 | Reference diffs and searches verified PATCH semantics, log-summary serialization, stars, entry-service documentation, both pagination-envelope sites and all known living examples. ADR-043/027/042 carry partial supersession; ADR-047's body stands without planning history. Its status is Accepted (2026-11-14). | Met |
| Proven after merge > 1 (criterion 16) | Requires the merge commit's staging migration and following smoke run. No merge or deploy is part of this verification run. | Pending after merge |

The independent verification companion has not been requested. This is the author's walk, separate from code review.
The full verification run passed: 1,461 backend tests, 3,198 frontend tests, 21 browser tests, Ruff lint and format,
ESLint, frontend type checking after type generation, Pyright (zero errors/warnings; 26 information diagnostics),
Markdown lint, contrast (1,508 applicable pairs) and generated-type drift. Frontend formatting of the changed
source/test files also passed. Pyright used the isolated locked Django stubs already described in the handoff.
The production build and coverage run remain for CI; no CI or staging result is claimed.

- **Review position:** author walk only; no independent verification pass consumed. Heavy allows two passes;
  pass 1 is recommended and awaiting the Owner. Separate code review has not begun.
- **Source-verified findings:** none in the criteria walk. Criterion 16 awaits post-merge evidence.
- **Run identities:** frontend tests `b4e11173a23141ad80e67457cd95ee51`; contrast
  `e7c19c1133434e60867654ec57f39d67`; Pyright `82005d2297e149cbb1f5a18cd0e2f09b`; E2E
  `7557f5577aec4631b2ea2fa0dec50f4f`; lint `6b328a60c8d94d489d3b429c75c6a0e3`; TypeScript
  `175b19c4aedd4c25bf49ec9f53ab19cb`. Sandbox-refused starts produced no check result and were retried.
- **Stop reason:** awaiting the independent-pass decision required by the verification workflow.
- **Recorded:** 7:19 am CT.

## 2026-11-14 · Criteria verification — pass 1

- **Scope:** all 16 Success Criteria, the complete implementation change from
  `e1540ef994ece3add2ab7678e725c73217f30010` to `9a82111eb8a8f4e9a9c49ae50ba3271e4792cc05`,
  the local ADR-047 status edit and the reachable tree. The saved task plan's criteria were checked identical to
  the current task list, with criterion marks removed; execution annotations and the author's report were withheld.
- **Rubric:** independent source-grounded validation of the Success Criteria against the PRD and actual outcomes.
- **Authorization:** Owner approved this independent pass after the author walk. Class Heavy, pass 1 of 2.
- **Runner:** fresh read-only reviewer subagent; verdict `independent`, no author session files loaded.
- **Kept files:** `prompt-verification-pass1.md`, `verification-pass1-tasks.md`, `verification-pass1.diff`,
  `verification-pass1-target.json`, `report-verification-pass1.md` and `execution-verification-pass1.md`, under
  `adversarial-review/`. The target record retains the prompt/input hashes; the report hash is
  `c21d023cf48991c3eacfd6e29a2e3a196ea3bf9bd3c43fd0ec47a12178a8e1c1`.
- **Findings:** none. No dispositions or finding-driven changes were required.
- **Independent checks:** 398 backend tests passed in two Docker runs (112 and 286); 36 frontend tests passed
  through arc-offload, run `285a2e0a34354e169a4939e676c63f22`. Its first sandbox-refused start produced no
  test result. The primary checked the retained run's status 0 and verified the report's source claims against the
  criteria walk, including shared log-summary queries, the common mutation queue and migration reversal.
- **Target check:** implementation HEAD and saved aggregate diff were unchanged on receipt; subsequent tracked
  edits only close the task and update document status. Criterion text remains unchanged.
- **Outcome:** implemented criteria 1–15 withstood. Criterion 16 requires post-merge staging migration and smoke
  evidence and remains unchecked. Task 6.1 is complete; this is not an all-criteria or post-merge clean result.
- **Stop reason:** converged for the pre-merge criteria. No second pass is recommended without a material change.
  Separate code review remains for the completion workflow.
- **Elapsed:** 7:25 am to 7:32 am CT.

## 2026-11-14 · Completion preparation and code review — pass 1, delegated agent (local)

- **Authorization:** Owner approved completion preparation, then explicitly chose a one-off chunked code review
  instead of another criteria pass. The normal whole-work-unit convention remains unchanged. No commit or push
  was authorized or performed. The fixed working tree was reviewed before the documentation commit.
- **Preparation:** regenerated the schema/types with no drift; created `completion-user-movie-tracking.md` from
  source and completed-task outcomes. Task cleanup preserved task lines, goals, outcomes and exact criterion text,
  removed obsolete activation/acceptance/run instructions, and retained substantive migration and locking notes.
  There was no paired implementation-notes file to clean or delete. Criterion 16 remains a post-merge obligation.
  Markdown lint on the four changed/new documents and whitespace checks passed.
- **Exact target:** `sha256:3dd9ea1c231139535f7ed0f268650a301a88799bbdf49d76a31db7264641c80c`, base
  `e1540ef994ece3add2ab7678e725c73217f30010`, HEAD anchor
  `9a82111eb8a8f4e9a9c49ae50ba3271e4792cc05`, plus recorded local documentation edits. All 68 path hashes
  matched on receipt. No source/test implementation changes were made during the review.
- **Rubric:** every implementation-audit dimension plus repository contract coherence.
- **Coverage and runner:** fresh read-only scopes for foundation (20 paths), entries (19), frontend (25), then
  integration (four document paths and seams), followed by a fresh non-author whole-target aggregate. The union
  covers all 68 paths with no missing, extra or overlapping owners. All reports classify their evaluator as
  independent; author/session/verification reports were withheld. This is one logical code-review pass.
- **Kept files:** `code-pass1-target.json`; each scope's file list, diff and `prompt-code-pass1-*.md`; raw reports
  `raw-code-pass1-foundation.md`, `raw-code-pass1-entries.md`, `raw-code-pass1-frontend.md`,
  `raw-code-pass1-integration.md`, `raw-code-pass1-aggregate.md`; and `author-code-preflight.md`.
- **Independent findings:** one major and one minor after duplicate consolidation. The two backend reports and
  integration describe one cause: parent deletion omits the parent-first locking boundary. The aggregate resolves
  the backend grade disagreement as major because valid destructive operations can fail or deadlock, without
  claiming corruption. The queued frontend operation is a separate retirement/settlement cause.
- **Author preflight:** one further minor, the record-save docstring's obsolete supplied-fields-only claim.
- **Primary source verification:** all three findings hold. A disposable PostgreSQL database reproduced
  `IntegrityError` through service deletion, admin single deletion and admin bulk deletion (three confirming
  probes). Its database and temporary container probe file were removed. The installed TanStack library probe
  reproduced a truly paused operation whose promise and observer remain pending after cache clearance, with no
  entry dispatch. That probe confirms the library mechanism; a full hook regression remains part of the fix.
  The edit deadlock is source-grounded; its runtime regression remains to be added with the correction.
- **Proposed complete set, not yet approved:**

  | ID | Grade | Source | Action and boundary |
  | --- | --- | --- | --- |
  | F1 | major | code-pass1-001 | FIX (local correction): serialize API/admin record deletion before child collection; PostgreSQL create/edit concurrency regressions |
  | F2 | minor | code-pass1-002 | FIX (local correction): settle retired queued entry operations and reset pending observers; hook-level cancellation/recovery coverage |
  | F3 | minor | author A1 | FIX (local correction): describe derived save rules in the entry-point docstring |

- **Verification scope:** F1 and F2 are full behavioral corrections; F3 is wording only. No common implementation
  mechanism joins the three distinct causes. None requires PRD scope expansion.
- **Continuation recommendation:** approve the fix batch and its focused checks; then take an independent fix check
  and, once that resolves, another complete code-review pass because this pass found a major. Those further looks
  are recommendations, not yet authorized.
- **State:** findings await complete-set disposition approval; no finding-driven edits have landed. Code review
  and completion remain open. Criterion 16 still awaits the merge commit's staging migration and smoke evidence.
- **Elapsed:** 7:40 am to 8:02 am CT.

## 2026-11-14 · Code review — approved repairs after pass 1

- **Authorization:** Owner approved F1–F3 and focused verification. This did not authorize a commit, push,
  independent fix check or another complete pass.
- **F1 — FIX (local correction), full behavioral scope:** record-service deletion and admin single/bulk deletion
  share `delete_records`, which locks the authorized parent selection in primary-key order inside its transaction
  before collecting children. The API retains its owner filter and missing-record error. Six request-level
  PostgreSQL cases cover entry create/edit versus all three deletion paths. The six failed before the fix with
  integrity failures/deadlocks, then passed; bulk cases also select multiple records.
- **F2 — FIX (local correction), full behavioral scope:** the entry hook binds ownership before queueing and wraps
  the exposed operation with cancellation settlement. Retirement synchronously resets only the retiring owner's
  observer. Both inner-promise handlers stay attached; abort listeners leave on settlement/retirement. The deferred
  transport guard remains in place. No TanStack internals or second queue were introduced.
  Four MSW retirement cases failed first, then passed: mounted, multiple create/edit/delete calls, unmounted and
  offline. They establish actual scope pause, assert cancellation before releasing the held save, prevent stale
  dispatch/feedback and permit a later owner's write. Existing success, genuine-error and active-transport cases
  remain green. The coupled behaviors for each correction shared a test batch.
- **F3 — FIX (local correction), wording scope:** the save docstring names supplied fields plus derived rules.
- **Advisor consultation:** `/root/advisor_cancellation` (Astra) advised on the bounded public-API cancellation
  choice. It endorsed hook-local caller settlement plus observer reset, with per-call listeners, generation-guarded
  reset, handled inner rejections and listeners retained after unmount. This settled the approach. It was advice,
  not an independent review or fix check; no advisor implementation was delegated.
- **Checks:** 317 user-data tests passed; final focused six deletion races passed. Forty-six frontend
  entry/save/ownership/query tests passed. Ruff lint/format, ESLint, Prettier, TypeScript and locked-stub Pyright
  passed (zero Pyright errors/warnings; 26 information diagnostics), as did Markdown lint on the four changed/new
  documents and whitespace checks. Corrected a typed movie lookup in the new test and two lint diagnostics in the
  touched frontend code/tests. No checks were weakened. Full suites, build and browser smoke were not repeated
  for this bounded correction; full suites/smoke passed earlier, and CI remains pending.
- **Run identities:** frontend RED `179db236cab94dc0b6517b8d833c84e2`; final frontend tests
  `0ea3b7c3045b4cceaf46697a3e0aaf77`; ESLint `2582c2288fd641e69eeea693075c3d92`; TypeScript
  `736c1f2e81534ccbaa018107bcc0e766`; Pyright `a6c372294dc549788d98e799f9d13263`.
  Expected RED results and subsequent passing execution logs are retained with the work's run evidence.
- **Documentation:** Task 6.2 is marked complete with actual outcomes; the PRD/task status, completion document
  and session pointers reflect the corrections. Success Criterion text is unchanged; criterion 16 remains open.
- **Target for the offered fix check:** sha256:c685647607bb1989c0666b5ba666e5d19aa75aa5a3aae9ce8e026aea6d1523d9, retained in
  `fixes-after-code-pass1-target.json` with the changed-since-review paths and all 69 current file hashes.
- **Review state:** the approved response batch is implemented and locally verified. Pass 1's major finding still
  withholds convergence. Independent fix check, round 1 since pass 1, is recommended; after it resolves, a second
  complete code-review pass is recommended. Neither has been authorized. All changes remain uncommitted.
- **Recorded:** 9:30 am CT.

## 2026-11-14 · Code review — fix check, round 1 since pass 1, delegated agent (local)

- **Authorization:** Owner explicitly approved this independent fix check after the repair batch and its focused
  checks. No successor complete pass, commit or push was authorized.
- **Exact scope:** the seven changed/new paths between
  `sha256:3dd9ea1c231139535f7ed0f268650a301a88799bbdf49d76a31db7264641c80c` and
  `sha256:c685647607bb1989c0666b5ba666e5d19aa75aa5a3aae9ce8e026aea6d1523d9`, with the whole affected
  source and PRD available for context. The six existing before files were reconstructed and hash-verified; the
  new concurrency test had no before file. The exact delta and after identity matched on receipt.
- **Rubric:** F1–F3 closure, behavioral grounding, propagation/completeness and new failure, with every
  implementation-audit dimension and repository contract coherence at repair scope.
- **Runner:** fresh read-only reviewer, classified `independent`; no author/session/advisor/verification reports
  loaded. Original independent findings and the approved correction boundaries were supplied without the
  author's execution results or closure conclusions.
- **Kept files:** `prompt-fixcheck-code-pass1-round1.md`, `fixcheck-code-pass1-round1.diff`,
  `fixcheck-code-pass1-round1-start.json`, `code-pass1-before-fixes/`,
  `fixes-after-code-pass1-target.json` and `raw-fixcheck-code-pass1-round1.md`.
- **Findings:** none. F1–F3 hold. The reviewer verified parent locks before destructive collection across API/admin,
  exposed-promise retirement and observer recovery across entry operations, retained dispatch/feedback guards,
  regression-source adequacy and the corrected save docstring. It ran no suites and made no runtime-proof claim.
- **Primary check:** after-file hashes and HEAD remain unchanged. The source-grounded closure account agrees with
  the primary's inspected mechanisms and retained passing executions; no further edits were required.
- **Trend:** converging — Code pass 1: 1 major → 0 in fix-check round 1. This closes the repair response only; it is
  not a second complete code review or a whole-change clean result.
- **Stop reason for this round:** converged; no new repair backlog. Another complete code-review pass remains
  recommended because pass 1 found a major. The proposed next pass would retain the approved chunked structure
  and fresh integration/aggregate coverage, and awaits the Owner's approval.
- **Elapsed:** 10:10 am to 10:15 am CT.

## 2026-11-14 · Code review — pass 2, delegated agent (local)

- **Authorization:** Owner approved a complete second code-review pass using the same three bounded scopes and
  fresh integration/aggregate review. This was a one-off chunked review authorization, not a policy change.
  It authorized no finding-driven edits, fix check, successor pass, commit or push.
- **Exact target:** `sha256:c685647607bb1989c0666b5ba666e5d19aa75aa5a3aae9ce8e026aea6d1523d9`, base `e1540ef994ece3add2ab7678e725c73217f30010`,
  HEAD `9a82111eb8a8f4e9a9c49ae50ba3271e4792cc05` plus the frozen working-tree changes. All 69 path hashes and the exact
  tracked/untracked change set matched at launch and on receipt.
- **Rubric:** all five implementation-audit dimensions plus repository contract coherence, with complete PRD
  scope and Non-Goals. No author verification, closure or preferred-fix claims were supplied. Neutral prior
  findings/applied-change history was read after current-source inspection.
- **Runner:** five fresh read-only independent contexts: foundation (21 paths), entries (19), frontend (25),
  integration (four documents and cross-scope seams), then whole-target aggregate. Exact disjoint union, all
  dimensions, target identity and material seams were accounted for. Source review only; no suites/database
  reproduction or new runtime success is claimed.
- **Kept evidence:** `code-pass2-target.json`, per-scope path lists/diffs, `prompt-code-pass2-*.md`,
  `code-pass2-prior-context.md`, `raw-code-pass2-*.md`, `code-pass2-start.json` and
  `primary-code-pass2-verification.md` retain the orchestration inputs and exact reports.
- **Verified findings:** one major, no critical/minor findings. `foundation-001` and `integration-001` duplicate
  aggregate `aggregate-001`, mapped to `code-pass2-001` / F1 in this decision set: record save releases its lock
  before its annotated acknowledgement lookup. A competing delete can make an already-committed PATCH return
  404; a competing write can replace the acknowledged state and invert watchlist feedback/Undo.
- **Primary verification:** inspected the source boundary, base behavior, API mapping and frontend consumers.
  No enclosing request transaction is configured. Sibling search found entry create/edit/delete responses
  already captured inside their transactions; the record-save read is the only affected write acknowledgement.
- **Proposed disposition, awaiting approval:** F1 — FIX (local correction), full behavioral verification scope.
  Capture the annotated result before releasing the parent lock; add real-transaction competing-delete and
  competing-overwrite response regressions; run the affected backend tests, lint, format and type checks and
  update task/completion documentation. No edits applied.
- **Shared causes:** the response read outside the write transaction is distinct from pass 1's child collection
  before locking, paused caller settlement and docstring defects. This fix would not have prevented the earlier
  findings. No new design contract or three-look shared-cause stop was established.
- **Trend:** discovering — Code pass 1: 1 major → 0 at fix-check round 1; Code pass 2: 1 major. This new class lies
  in the original change, not the approved repair delta. Prior repairs held in this complete pass. A material
  finding remains, so the lane has not converged.
- **Stop reason:** complete review; await the complete proposed disposition's approval before edits. After a
  verified repair, recommend an independent fix check and then another complete pass, each separately approved.
- **Elapsed:** 10:19 am CT to 10:33 am CT.

## 2026-11-14 · Code review — approved repair after pass 2

- **Authorization:** Owner approved the complete proposed set: F1 — FIX (local correction), full behavioral
  verification scope, followed by focused verification. No commit, push, fix check or successor pass is authorized.
- **Boundary:** capture the annotated record-save result before releasing the parent lock; regress both competing
  deletion and competing overwrite acknowledgements. Task 6.3 carries implementation and affected checks.
- **Implementation:** the annotated response lookup now runs within the save's atomic block, before releasing
  the parent lock. This is a one-line transaction-boundary correction; no wire schema or frontend behavior changed.
- **Fail-first evidence:** two coordinated real-request cases reproduce the original failure. A concurrent delete
  makes the saved PATCH return 404; a concurrent watchlist write makes it return false instead of its own true.
  Both final tests failed before the correction and passed after it. Scheduling wraps and forwards real SQL;
  no project service, transaction or database result is replaced. The coupled cases shared one test batch.
- **Checks:** two focused regressions passed, then all 319 user-data tests passed. App Ruff, touched-file format,
  locked-stub backend Pyright (zero errors/warnings, 26 existing information diagnostics), single-file Markdown
  lint and whitespace checks passed. The new test's coordination helper was moved out of its test function to
  satisfy Ruff's complexity limit. No check was weakened. Full suites, frontend tests/types and browser smoke
  were not repeated for this backend-only repair; earlier verification and future CI remain distinct evidence.
- **Type-check execution:** run `12e0c84bde4a4c7ba0bc209b3ba915e7` passed. Initial run
  `983608044c5d4fb9a4b9e6ceb6b4537f` did not run because snapshot writes to the shared Git object store were denied
  by the sandbox; the same command succeeded after its permitted escalation.
- **Retained evidence:** `save-acknowledgement-red.log`, `save-acknowledgement-green.log` and
  `save-acknowledgement-backend-tests.log` are kept with the work's raw runs. The reviewed before versions are
  hash-verified in `code-pass2-before-fix/`; `fixes-after-code-pass2.diff` and
  `fixes-after-code-pass2-target.json` retain the exact four-path repair scope for an offered fix check.
- **Documentation:** Task 6.3 is complete with actual outcomes. PRD/task status and completion highlights are
  current; Success Criterion wording is unchanged and staging criterion 16 remains open.
- **Repair target:** `sha256:9f8c6e210768b8cbd180dba3c9e6eebb8ea0924189f08806b437612cb31a82a6`, containing all 70 changed/new paths.
- **Review state:** the approved repair and focused verification are complete. Recommend independent fix check,
  round 1 since code pass 2, before considering another complete pass. Neither review is authorized yet; all
  changes remain uncommitted. Session pointers updated at 10:40 am CT.

## 2026-11-14 · Code review — fix check, round 1 since pass 2, delegated agent (local)

- **Authorization:** Owner explicitly approved this independent repair check. No complete successor pass,
  finding-driven edits, commit or push was authorized.
- **Exact scope:** four changed/new paths from `sha256:c685647607bb1989c0666b5ba666e5d19aa75aa5a3aae9ce8e026aea6d1523d9` to
  `sha256:9f8c6e210768b8cbd180dba3c9e6eebb8ea0924189f08806b437612cb31a82a6`, with whole affected source available for context. All 70 after hashes,
  three kept before copies, the exact delta and HEAD/base anchors matched; the reviewer also reconstructed
  the 69-path before tree without mismatches.
- **Rubric:** F1 closure, behavioral grounding, propagation/completeness and new failure, with all five
  implementation-audit dimensions plus repository contract coherence at repair scope.
- **Runner:** fresh read-only reviewer, classified independent; no author execution logs, closure reports,
  session files, review log or advisor conversations loaded. Original independent finding and approved
  correction boundary were supplied without author execution or closure claims.
- **Kept evidence:** `prompt-fixcheck-code-pass2-round1.md`, `fixcheck-code-pass2-round1-start.json`,
  `raw-fixcheck-code-pass2-round1.md`, both target manifests, the exact repair diff and kept before copies.
- **Findings:** none; F1 holds. Annotated record and movie values are materialized while the parent lock remains
  held, and later API serialization adds no database read. The two real-request cases assert own-result
  acknowledgement, competing operation success and final competing state, with faithful synchronization.
- **Primary check:** target identity remains unchanged. The source-based closure and test-adequacy account
  agrees with the inspected mechanisms and retained executions. No additional source edits or tests were needed.
  The reviewer ran no suites and did not authenticate historical execution claims.
- **Trend:** discovering — Code pass 1: 1 major → 0 in fix-check round 1; Code pass 2: 1 major → 0 in this
  fix-check round. The complete passes found distinct original-change defects; both repair checks converged,
  but neither establishes whole-change convergence. No recurring shared cause or three-look stop is present.
- **Stop reason:** this repair check converged with no new backlog. Recommend complete code-review pass 3 using
  the same bounded scopes and fresh integration/aggregate, since the last complete pass found one major.
  Await the Owner's separate approval. All work remains uncommitted.
- **Elapsed:** 10:46 am CT to 10:51 am CT.

## 2026-11-14 · Code review — pass 3, delegated agent (local)

- **Authorization:** Owner approved one complete third code-review pass with the same three bounded scopes and
  fresh integration/aggregate. This did not authorize edits, further passes, commits or a push.
- **Exact target:** `sha256:9f8c6e210768b8cbd180dba3c9e6eebb8ea0924189f08806b437612cb31a82a6`, base `e1540ef994ece3add2ab7678e725c73217f30010`,
  HEAD `9a82111eb8a8f4e9a9c49ae50ba3271e4792cc05` plus frozen working-tree changes. All 70 hashes and the complete actual
  change set matched at launch and on final receipt; no product or tracked document changed during this pass.
- **Rubric:** all five implementation-audit dimensions plus repository contract coherence, with the complete
  PRD's Scope and Non-Goals. Prior findings and neutral applied-change history were read only after current
  source inspection; no author verification, closure or preferred-fix report was supplied.
- **Runner:** five fresh read-only independent contexts: foundation (22 paths), entries/API (19), frontend (25),
  integration (four documents and material seams), then aggregate. All assigned path sets exactly match their
  reports and form the complete disjoint union. All effective dimensions and material seams are accounted for.
  The entries report labels its permitted review artifacts as session files; its explicit separation statement
  and exact listed inputs contain no session notes, working memory or author reports.
- **Kept evidence:** `code-pass3-target.json`, `code-pass3-start.json`, scope lists/diffs,
  `prompt-code-pass3-*.md`, `code-pass3-prior-context.md` and all five `raw-code-pass3-*.md` reports.
- **Verified findings:** none. No disposition backlog, shared material cause or unresolved source question remains.
  All prior repairs were re-attacked; deletion ordering, caller cancellation and response capture hold in the
  inspected source. This is complete source-review evidence, not a new suite or live-stack execution.
- **Primary check:** verified the exact union and unchanged target independently. Spot-checked response hydration,
  lock boundaries and the summary-field consumers against original source; the clean aggregate's bounded claims
  agree. Historical runtime claims remain supported by earlier run evidence, not by this review.
- **Trend:** converged — Code pass 1: 1 major → 0 at fix-check round 1; Code pass 2: 1 major → 0 at fix-check
  round 1; Code pass 3: 0 major/critical and no minor finding. The complete-pass material count is 1 → 1 → 0.
- **Stop reason:** clean convergence on the exact complete target; stop the local review loop. No additional pass
  or fix check is recommended. Staging criterion 16 still requires post-merge migration and smoke evidence;
  CI and a public PR surface are outside this source review. All remaining changes are uncommitted; await
  explicit commit instructions before mutation of Git history or publication.
- **Elapsed:** 10:52 am CT to 11:06 am CT.

## 2026-11-14 · Owner review stop and completion continuation

- Owner explicitly stopped further review after clean pass 3 and requested continuation of completion.
  The review loop remains closed; carry this direction through the PR stage without requesting a hosted
  or local successor. CI monitoring and required checks are separate and continue normally.
- Completion preparation checked fetched-main alignment, mapped all ten dirty paths to complete tasks,
  prepared one exact commit plan/message and drafted the PR presentation. No source change, staging,
  commit, push, PR creation or merge occurred. Commit-message validation passed.
- The next checkpoint is the prepared final commit's explicit approval. Publication and merge retain their
  own authorization boundaries. Session pointers reflect that checkpoint.
