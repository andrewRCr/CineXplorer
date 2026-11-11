# Review Log: palette

## Design review — pass 1 (2026-11-10)

- **Stage:** design draft (`draft-palette.md`), `Class` Heavy, cap 2.
- **Rubric:** assess-draft-readiness (criteria 1, 2 and 4; criterion 3 held by the author), assess-design-proportionality,
  design-audit, source-grounding.
- **Runner:** fresh general-purpose subagent, read-only. Kept: `adversarial-review/draft-pass1.md`,
  `adversarial-review/prompt-draft-pass1.md`, `adversarial-review/report-draft-pass1.md`.
- **Elapsed:** about 20 minutes (reviewer).
- **Verified findings:** 6 major, 5 minor; all supported at the reviewer's grade.
- **Shared causes:**
    - Lists recorded from a partial search instead of a full sweep: F1 (fonts), F7 (undefined color names), F8
      (default-theme reads), F11 (docs describing traffic-light scores).
    - Values measured only on the surfaces the study modeled, not on the ones the app uses: F2 (toast and alert
      surfaces), F3 (light layering against ADR-008), F4 (unrecorded roles and borders).
- **Dispositions (approved by the Owner, 2026-11-10):** all 11 FIX.
    - New design: F2 (light `success` `#376A0D`, light `warning` `#9C3A11`, status text measured on toast and alert
      surfaces; decision 17 count corrected to nine pairs), F3 (light layers alternate, deep page and panel, pale
      card and raised; Marquee ADR supersedes ADR-008 in part), F5 (score chip anatomy), F6 (font removal to its own
      errand, run before implementation).
    - Local correction: F1 (full font list, carried by the errand), F4 (role mapping), F7 (undefined color names),
      F8 (default-theme readers), F9 (user-rating and star wording), F10 (dispositions for decisions 6 and 7), F11
      (docs and comments).
- **Author fold-grounding corrections:** decision 4's figures attributed; decision 6 names `#FCFAF6`; decision 14's
  light color-blind figure restated (9.8) and alert surfaces widened to the page or a card (`AuthFormCard` on
  `layer-01`); decision 2's fallback drops the panel tone; decision 1's border row points to decision 15.
- **Other approved changes (outside the draft):** inbox entry "Supersede ADR-003's rating-token decision for movie
  scores" removed as folded into decision 18; inbox entries added for the font errand and the existing palettes'
  status-color contrast; PM told of the font split.
- **Fix check, round 1 since pass 1:** approved; launched with `adversarial-review/prompt-draft-pass1-round1.md`
  against `draft-pass1.md` and `draft-pass1-round1.md`.
- **Fix check, round 1 since pass 1 (2026-11-10):** 1 major, 5 minor, all supported. Kept:
  `adversarial-review/report-draft-pass1-round1.md`.
    - Approved by the Owner, all 6 FIX (local correction): decision 17's count restated (9 pairs for success and
      destructive, 23 for all four status colors); the success signal's undefined-role clause narrowed to production
      components; decision 11's default-theme readers completed; decision 13's docs list gains `CertificationFilter.tsx`
      and the component-styling strategy's alternating-pattern section; dark `badge` to `#433C34`; the first-paint
      clause narrowed, with the light-mode first-visit paint left to the navigation shell.
    - Shared cause: propagation after a fix changed a rule's subject or a list (F1 to F4).
    - Author fold-grounding correction: decision 4's grey figure attributed to the study's dot colors.
    - Other approved changes (outside the draft): inbox status-contrast entry corrected; inbox entry added for the
      light-mode first-visit dark paint.
- **Fix check, round 2 since pass 1:** approved (pass 2 declined on the recommendation); launched with
  `adversarial-review/prompt-draft-pass1-round2.md` against `draft-pass1-round1.md` and `draft-pass1-round2.md`.
- **Fix check, round 2 since pass 1 (2026-11-10):** 3 minor, all supported. Kept:
  `adversarial-review/report-draft-pass1-round2.md`.
    - Approved by the Owner, all 3 FIX (local correction): decision 11 gains the color-token strategy's adapter list
      and brand table; decision 13's light-order bullet gains `LayerSystemSection.tsx`'s three order strings; decision
      13 removes the unused `LightMode` and `DarkMode` exports, and the success signal's scope becomes "outside the
      development pages (`frontend/src/pages/dev/`)".
    - Shared cause: as in round 1, a fix's sweep stopped short of every reader of a changed list or rule.
    - Author sweep before stopping: theme counts, theme ids, config and CI files, and `colorPalette=` outside the
      development pages found nothing further.
    - Other approved changes: `origin/main` (563de7ab) fast-forwarded into the branch before capture, at
      project-manager.CX's request.
- **Post-settle reread (2026-11-10):** coherent; status text updated (Class `Heavy`, Readiness `formalization-ready`,
  Next); inbox has no unrouted entry naming this work; markdown lint clean.
- **Stop reason:** Owner-accepted after round 2's fixes (no round 3, on the recommendation; pass 2 not run). Round 2's
  folds are all local corrections.

## PRD review — pass 1 (2026-11-10)

- **Stage:** PRD (`prd-palette.md`, `detailed · PRD`), `Class` Heavy, cap 2.
- **Rubric:** assess-design-proportionality, design-audit (spec point), spec-review at `detailed` (with
  source-grounding and the ADR-disposition question).
- **Runner:** fresh general-purpose subagent, read-only; approved by the Owner (4:38 pm CT). Kept:
  `adversarial-review/prd-pass1.md`, `adversarial-review/prompt-prd-pass1.md`.
- **Elapsed:** about 23 minutes (reviewer). Kept: `adversarial-review/report-prd-pass1.md`.
- **Verified findings:** 3 major, 5 minor; all supported at the reviewer's grade.
- **Shared causes:**
    - Rendered behavior read from declarations, not traced through the resolved render path: F1 (merged alert
      recipe), F5 (axe baseline matching), F8 (selector label).
    - Contrast checked on some of the surfaces, states or themes an element renders in: F2 (selected pill in the
      existing palettes), F3 (chip outline on a hovered card). Same cause as the design review's pass-1 F2 to F4.
- **Dispositions (approved by the Owner, 2026-11-10):** all 8 FIX.
    - New design: F1 (alerts take the themed tint in every theme, R19; criterion 8), F2 (selected certification pill
      takes `tertiary`, R16 and decision 13; criterion 7).
    - Local correction: F3 (Goal 1's subtle-border floor at rest; R5 states the every-surface, every-theme rule, adds
      the chip outline and the dots in all five themes; decision 9 records the hovered-card dip), F4 (§ 6 type-check
      actors), F5 (`/login` baseline entry removed under Marquee; light-only scans stated; criterion 11), F6 (score
      ADR's supersession scoped to score displays, star icons keep `imdb-gold`; R18 gains the star guidance, the debug
      page's fixed golds, the `index.html` comment and the `cinexplorer-original.ts` header), F7 (GitHub logo takes
      `foreground`, R17; criterion 9), F8 (selector shows labels, R8).
- **Author fold-grounding:** measured before proposing: themed alert tints against today's Chakra fills in all five
  themes (no pass-to-fail change); `tertiary` against the filter panel in all ten variants (4.55:1 or more); dots per
  surface in all five themes (existing palettes fail only on `layer-03` and hovered panels, where no score sits, so
  R5's all-theme check covers page, card, panel and hovered card); Marquee's chip outline at rest (1.39 to 2.10:1);
  the GitHub logo's black (1.10 and 1.03:1).
- **Fix check, round 1 since pass 1:** approved; launched with `adversarial-review/prompt-prd-pass1-round1.md` against
  `prd-pass1.md` and `prd-pass1-round1.md`.
- **Fix check, round 1 since pass 1 (2026-11-10):** 3 major, 4 minor, all supported. About 18 minutes (reviewer).
  Kept: `adversarial-review/report-prd-pass1-round1.md`.
    - Approved by the Owner, all 7 FIX: F1 (new design: a neutral outline button inside an alert takes
      `border-strong-02`; R19 and decision 19 restate the existing-palette comparison with the action button's outline),
      F2 (local correction: R5 checks the alert action button's outline and label on the tints), F3 (local correction,
      at the cause: R5 becomes a per-element table of rendered pairs with their thresholds, surfaces, themes and
      checker, plus a list of accepted shortfalls with figures), F4 (selected pill drops Chakra's checked inset ring;
      criterion 7), F5 (GitHub logo measured on its `layer-02` tile; `LoadingLayout`'s exception comment removed), F6
      (decision 13 names the sub-navigation's `layer-01` and qualifies the `badge` premise for Material Design 3), F7
      (R18 adds `extensions.ts`; criterion 10's star clause scoped to gold as the score display's color or one gold
      across themes).
    - Shared cause: contrast enumerated element by element rather than as each restyled element's full set of
      rendered pairs (hosted controls, states, merged Chakra defaults): F1 to F4. Same cause as pass 1's F2 and F3 and
      the design review's pass-1 F2 to F4; F3's fix states the contract (R5's table).
    - Author fold-grounding: `button-outline`, `border-strong-02` and `border-strong-03` measured on Chakra's fills and
      on the tints over page and card in all ten variants; existing palettes' chip outline on page, card and hovered
      card; R19's failing light icons narrowed to warning icons; R19's rule narrowed to neutral outline buttons after
      reading the error boundary's `destructive`-bordered button; the email-verification dialog (on `layer-01`) and
      error-boundary heading added to R5's status-text row.
- **Fix check, round 2 since pass 1:** approved; launched with `adversarial-review/prompt-prd-pass1-round2.md` against
  `prd-pass1-round1.md` and `prd-pass1-round2.md`.
- **Fix check, round 2 since pass 1 (2026-11-10):** 1 major, 6 minor, all supported. Kept:
  `adversarial-review/report-prd-pass1-round2.md`.
    - Approved by the Owner, all 7 FIX (local correction): F1 (R19 classifies every existing-palette alert pair one
      status and base at a time: six light-mode action outlines newly fail and are accepted with their reason, nineteen
      pairs fail before and after, seven improve; R5's shortfall bullet and decision 19 restated), F2 (R16: the pill's
      focus ring uses `ring`, not the checkbox card's `colorPalette.focusRing`; criterion 7), F3 (R5's table adds the
      certification badge, the GitHub logo, the pill's focus ring and the alert's dismiss icon; decision 15 points to
      the table for the test's scope), F4 (R5 names the real status-text sites), F5 (`FloatingAlert` sets the action's
      border and the alert recipe gains no button rule; criterion 8 split), F6 (R5 holds alert titles at 4.5:1 and
      icons at 3:1), F7 (decision 19's ADR reason covers the border choice).
    - Shared cause: minimums aggregated across statuses and bases hid per-pair flips (F1, F6); the element-by-element
      cause of earlier rounds recurs in F2 and F3.
    - Author fold-grounding: every existing-palette alert pair classified per status and base on Chakra's fills and on
      the tints; the dismiss icon measured on Marquee's tints (4.85:1 light, 7.79:1 dark); the pill's `ring` and
      `tertiary` pairs confirmed in the contrast script's checks.
- **Fix check, round 3 since pass 1:** approved (7:35 pm CT); launched with
  `adversarial-review/prompt-prd-pass1-round3.md` against `prd-pass1-round2.md` and `prd-pass1-round3.md`.
- **Fix check, round 3 since pass 1 (2026-11-10):** 1 major, 2 minor, all supported. About 17 minutes (reviewer).
  Kept: `adversarial-review/report-prd-pass1-round3.md`. F1: R19's counts held only when status-colored titles were
  counted as the error boundary's heading over the page (14 / 38 / 8 with a title in every status over both bases).
  F2: R5's status-text site list missed `PasswordResetDialog`. F3: R5's table missed the toast border R17 restyles.
    - Shared cause: lists and counts built under an unstated inclusion rule or from a partial search.
    - Overtaken by `main`: project-manager.CX asked for `origin/main` (3b2eae90) before the PRD finishes; the Owner
      approved the merge (`394bb87e`). #158 gives the existing palettes new status colors and extends the contrast
      script to status text and alert text on all four surfaces in every theme, which retires decision 15's premise
      and every existing-palette figure in R5 and R19. Marquee fails three of its pairs, all dark `destructive` (3.70
      on `layer-hover-02`, 3.96 and 4.46 on its tint over `layer-03` and `layer-02`). Dispositions pending with the
      rework.
    - Approved by the Owner, 2026-11-10, with the rework against `main`: all 3 FIX (local correction). F1: R19 states
      its rule (every pair kind, each status, over the page and a card, where alerts render) and recounts on main's
      colors: every text, icon, label and dismiss pair passes; eight action outlines newly fail (accepted), twelve fail
      before and after, four improve; one sentence on panels and raised surfaces. Counts live in R19 alone. F2: R5's
      site list is replaced by the script's surface coverage. F3: R5 gains the toast border (Marquee-scoped, with the
      existing palettes' shortfall accepted) and the two other R17 restyles (error pages' main button, grid text).
    - Owner decisions in the rework: Marquee dark `destructive` becomes `#D08F93` (decision 20; same hue and chroma,
      dots' closest color-blind pair 10.9 to 7.3; `#C292A0` rejected); pairs the existing palettes do not meet are
      checked in `verify-contrast` scoped to Marquee, and the separate contrast test is dropped (decision 15).
    - Rework: R5 rebuilt on the extended script (checker column replaced by a themes column); § 6 alert placement rule
      dropped; existing-palette status-text and dot shortfalls removed (they now pass); R19 removes the script's
      native alert checks; the font precondition removed; criteria 1 and 2 restated.
    - Author fold-grounding: main's script run with the scratch Marquee adapter passes every pair with `#D08F93`;
      every figure recomputed with main's fractional compositing; R5's restyled-element claim swept against R10 to
      R19 (added the error pages' button and grid text); the detail page's score sits on `background`, so the existing
      palettes' panel outline gap stays out.
    - Kept: `adversarial-review/prd-pass1-round4.md`.

## PRD review — pass 2 (2026-11-10)

- **Stage:** PRD after the merge of `main` and the round 3 rework; last pass under the cap of 2.
- **Runner:** fresh general-purpose subagent, read-only; approved by the Owner (8:12 pm CT). Kept:
  `adversarial-review/prd-pass1-round4.md` (as reviewed), `adversarial-review/prompt-prd-pass2.md`.
- **Elapsed:** about 25 minutes (reviewer). Kept: `adversarial-review/report-prd-pass2.md`.
- **Verified findings:** 1 major, 4 minor; all supported. F1: the detail page's four `Separator`s inherit Chakra's
  raw `border` gray (1.04:1 on Marquee's light page) and its tags keep Chakra's gray inset ring. F2: decision 20's
  ADR `none` despite a weighed alternative. F3: the toast border not argued against the recipe's `border-strong-02`.
  F4: R5's chip-outline row lists `layer-02`, where no chip renders. F5: decision 8 overstated text contrast on
  hovered surfaces.
- **Shared cause:** rendered color taken from what a component names rather than from what its Chakra recipe draws
  when unoverridden (F1, F3), the same cause as pass 1's F1 (the merged alert recipe).
- **Dispositions (approved by the Owner, 2026-11-10):** all 5 FIX.
    - New design: F1, scoped to movie surfaces (Goal 4 extended; R17 adds the detail page's dividers to
      `border-subtle-01` and removes its tags' ring; R5 row; criterion 9), with a non-goal and an inbox entry ("Audit
      Chakra recipe defaults that still draw Chakra's own colors") for the rest of the app; F3, keep
      `border-subtle-01` and record why (the toaster's own light-edge override, as the theme menu and genre popover).
    - Local correction: F2 (decision 20 joins the Marquee ADR's scope), F4 (`layer-02` dropped from the row), F5
      (decision 8 names R5's surfaces).
- **Author fold-grounding:** swept every Chakra component used in production against its recipe's color tokens;
  dialogs, menus, popovers, the drawer, cards, inputs, selects and code blocks override them; remaining defaults
  outside movie surfaces (the sidebar's `border.emphasized` keyboard outline, possibly input focus rings, the error
  boundary's development-only divider) went to the inbox entry. Measured `border-subtle-01` on the page (1.31:1 or
  more in every theme) and `border-strong-02` / `border-strong-03` on `layer-03`.
- **Post-settle reread (2026-11-10):** coherent after two edits (decision 8's wrap; decision 16 names the detail
  page's recipe-default grays); `**Class:**` line present; markdown lint clean. Kept:
  `adversarial-review/prd-pass2-fixed.md`.
- **Draft check:** every draft decision is carried; departures are recorded where they arise (dark `destructive`,
  decision 20; contrast coverage after `main`'s status-text change, decision 15; the selected pill, decision 13).
- **Author sweep before the stop (2026-11-10):** read the movie card and the detail page element by element against
  their Chakra recipes. Found `MovieCard`'s `Card.Root` leaving its text to Chakra's `fg`; approved by the Owner as a
  further R17 item with an R5 row and criterion 9, Goal 4's clause scoped to the movie card and the detail page, the
  inbox entry widened (landing card, search inputs), and two consistency fixes (chip outline on `background` checked
  in all five themes; decision 20's "smallest" softened to within one 8-bit step). Lint clean; `prd-pass2-fixed.md`
  re-kept.
- **Stop reason:** pass cap reached (Heavy, 2 passes); Owner approved pass 2's fixes and the sweep's fix without a
  further fix check. Pass 2's fixes and the card-text fix have had no independent check.

## Task-list review — pass 1 (2026-11-10)

- **Stage:** task list (`tasks-palette.md`), `Class` Heavy, cap 2. Planning level `high`: skeleton, fill, grounding.
- **Before the review:** a grounding stop found that R9 and Success Criterion 10 name the color-token strategy's
  "list of theme adapters", which does not exist. Owner-approved amendment (2026-11-10): R9 drops the clause, and
  criterion 10 is superseded by criterion 12. Wording-level, so no independent pass on the amendment.
- **Rubric:** task-audit at full depth (source-grounding at artifact scope, eight categories), executability, and
  coverage and coherence against the PRD, under the task-list rules.
- **Runner:** fresh general-purpose subagent, read-only; approved by the Owner (9:18 pm CT). Kept:
  `adversarial-review/tasks-pass1.md`, `adversarial-review/prd-amended-tasks-pass1.md`,
  `adversarial-review/prompt-tasks-pass1.md`.
- **Elapsed:** about 26 minutes (reviewer). Kept: `adversarial-review/report-tasks-pass1.md`.
- **Verified findings:** 4 major, 5 minor; all supported at the reviewer's grade. The reviewer did not run the jsdom
  claims; the author's planning probe and a further probe (a `.dark` ancestor switches token values) support them.
- **Shared causes:**
    - A list or claim taken from a partial search instead of a full sweep: F1 (adapter list; the author's search
      looked for theme names, not adapter identifiers, and the amendment rested on it), F4 (alias statements). Same
      cause as the design review's pass 1 and the fix-check rounds.
    - Tests planned without checking what the current code and the rendered mode already produce: F2 (two roles equal
      in light mode), F5 (cases passing before red), F6 (an outline badge's ring would pass).
- **Dispositions (approved by the Owner, 2026-11-10):** all 9 FIX, all local corrections.
    - F1: the amendment is withdrawn (the PRD is restored to its committed text; criterion 12 is dropped from the task
      list); task 2.4 corrects the strategy's adapter list to the five real factories. F2: the floating-alert border
      test renders under a `.dark` ancestor. F3: task 2.2.d finds the `/login` element when Marquee becomes the
      default, with three branches; 5.1.a becomes conditional; the note's reversed logic is corrected. F4: task 5.4
      lists every alias statement, with a search check. F5: already-passing cases carry reconstruct-and-revert
      evidence; the `onChange` case is dropped. F6: the scored chip asserts no box shadow and a directly checked
      transparent background; 3.2 states the chip's test contract. F7: the `ThemeDebug` maps move into 2.2.a. F8: the
      redundant check lines are dropped. F9: task 6.2 proves the post-merge criteria.
- **Author fold-grounding:** F4's sweep found two more sites than the report named: the color-token strategy's
  "Deprecated Aliases (Backward Compatibility)" table and the component-styling strategy's "Deprecated Token Aliases"
  sentence; no alias role of any kind is defined under `frontend/src/theme`, so both join 5.4. F2's colors computed
  with the repository's `deriveBorderHierarchy` (dark `#908980` against `#736A5F`; light both `#7C705B`). Criterion
  10 matches the committed PRD word for word; markdown lint clean. Kept: `adversarial-review/tasks-pass1-round1.md`.
- **Fix check:** declined on the recommendation, since pass 2 re-attacks the repairs over the whole list.

## Task-list review — pass 2 (2026-11-10)

- **Stage:** task list (`tasks-palette.md`), `Class` Heavy, cap 2 (the last pass under it).
- **Rubric:** as pass 1, re-attacking pass 1's repairs after a whole read.
- **Runner:** fresh general-purpose subagent, read-only; approved by the Owner (9:51 pm CT). Kept:
  `adversarial-review/tasks-pass1-round1.md` (the reviewed version), `adversarial-review/prompt-tasks-pass2.md`.
- **Elapsed:** about 26 minutes (reviewer). Kept: `adversarial-review/report-tasks-pass2.md`.
- **Verified findings:** 4 minor, no critical or major; all supported at the reviewer's grade. All of pass 1's
  repairs withstood.
- **Shared causes:**
    - A fix's sweep stopped short (F2: a reconstruction placed before the default it depends on; F4: theme lists
      searched by id, not display name). Same cause as the design review's fix-check rounds and pass 1's F1 and F4.
    - The layer-free test cascade differs from the app's at recipe state styles (F1), a new seam.
- **Dispositions (approved by the Owner, 2026-11-10):** all 4 FIX, all local corrections. F1: 4.2 sets the selected
  pill's border and absent ring under `_checked`; 5.1.c keeps the outline button's `primary` hover and active border by
  restating it (R19 replaces only the rest border); an Implementation Note records how the two cascades differ. F2: the
  stored-`ibm-carbon` reconstruct-and-revert step moves to 2.2.a. F3: 3.3.b names the `imdb-gold` doc comment's fixed
  gold and traffic-light note. F4: 2.2.b searches by display name too and names the prose lists.
- **Author fold-grounding:** F4's display-name sweep found two lists beyond the report's (`createThemeSystem`'s shadow
  list in `theme/index.ts`, the `shadows.ts` header); `types.ts`'s per-role mapping notes are not theme lists and stay.
- **Post-settle reread (2026-11-10):** suite coherence rerun over the whole list. One correction: the Implementation
  Note claiming jsdom cannot resolve layered recipe styles now cites the testing standard instead, since pass 2's
  evidence contradicts the claim. 588 lines, six phases; markdown lint clean; the PRD has no uncommitted change.
  Kept: `adversarial-review/tasks-pass2-fixed.md`.
- **Stop reason:** pass cap reached (Heavy, 2 passes); the Owner approved pass 2's fixes without a further fix check.
  Pass 2's fixes have had no independent check.
- **Author completion sweep (2026-11-10, after the cap):** four gaps the passes did not cover, closed without a further
  pass.
    - Success Criterion 10's searches run over their whole scope (`traffic`, `default` with `Carbon`, `IBM Carbon`,
      `IMDb gold`, `F5C518`, `785F05`, `876B06`, the theme counts, `across all themes`, status-colored
      certifications, `accent`, `-foreground`). Every hit maps to a task or stays as true. Two additions: 2.2.b
      corrects the Carbon adapter header's "three systems" and "all three themes"; 3.3.b names `createExtensions`'
      standard-gold doc line and inline comment and the `standardRatingColors` rationale.
    - Focus ring: a planning probe showed that a base `focusRingColor` prop beats the recipe in both cascades, because
      `focusVisibleRing` sets the variable on the root. The probe also confirmed pass 2's F1: a base `borderColor`
      loses in the layer-free system, and a `_checked` one wins in both. The cascade note now says so. 4.2 is
      unchanged.
    - 1.2.b gains reconstruct-and-revert evidence for rows whose pairs are already checked. A rescan of every test
      subtask found no other case that passes before red.
    - 4.3 names its means: a throwaway Playwright screenshot script, dark and light, outside the repository.
    - 1.1.b says `badge` and `imdb-gold` take the table values and `on-badge` is `foreground`, instead of
      `createExtensions`' (Carbon passes `fg_muted` as `on-badge`).
    - A second batch: numeric counts (`4`, `8`, `eight` near design, theme, system, palette, adapter or variant;
      `all 4`, `all 8`), `Pajamas`, `Material` and `Primer` in the style strategies, TECHNICAL-OVERVIEW and README,
      and unfiltered `certif` under the debug pages. All hits map to 1.1.c and 2.4 or stay as true; 2.4 now names
      the overview's "integrates 4 major design systems" and "Extensible for future CineXplorer-specific theming".
  Suite coherence rerun over the changed bullets; 603 lines, six phases; markdown lint clean. Kept:
  `adversarial-review/tasks-final.md`. These edits have had no independent check.


## Criteria verification — author walk (2026-11-11)

- **Stage:** Task 6.1, author criteria walk under verification-review and validate-criteria. This is not an
  independent pass and spends no independent-pass allowance.
- **Span:** complete `main...HEAD` diff from merge base `a5a784f343550f21fd19a68538c7a0837697f900` to
  `1768cda9fde08b10393244e2fc00b7edf35362a5`, plus the resulting tree and the subsequent mechanical README
  formatting correction. The branch includes earlier merges; the four adapted palettes' values were also compared
  with `3b2eae90`, the main revision incorporated before the approved specification settled. No value changed from
  that prerequisite revision; Carbon's additional changes are comments only.
- **Preconditions:** all tasks in Phases 1–5 are complete or intentionally superseded; the PRD has no open questions.
- **Routing:** the live registry registers arc-framework and arc-offload only. CineXplorer's checks ran locally;
  host CPU-heavy commands used nicecap, the frontend suite used four workers, and Docker pytest used nice inside
  this worktree's own backend container. No registry or mode setting changed.
- **Gates, all passed:**
    - Backend: `pytest apps/`, 1,112 passed; Ruff check; Ruff format check, 268 files; Pyright, zero errors and
      warnings (26 informational diagnostics).
    - Frontend: `npm test -- --maxWorkers=4`, 71 files and 2,602 tests passed; Chakra typegen; `npm run type-check`;
      configured ESLint; changed-file Prettier check after the mechanical correction; production build.
    - Contrast CLI: five themes × two modes, 165 declared pairs, 1,378 passes, 272 explicit theme-scope skips,
      no failures or optional-token skips.
    - Browser: all five smoke specs and axe scans passed in this worktree's browsable stack; sign-up scanned the
      visible registration notice. No unmatched baseline entries were reported. No throttle reset was needed.
    - Markdown: full configured lint passed; changed documentation was checked again after the evidence edits.
    - The build emitted chunk-size and ineffective-dynamic-import advisories while exiting successfully.
- **Mechanical correction:** Prettier found only the new TSX example in the test-helper README. The baseline was
  already formatted; applying Prettier changed only indentation/wrapping in that example. No production code changed.
- **Criteria report** (`tasks-palette.md`, Success Criteria; wording unchanged):

  | Criterion | State | Evidence |
  | --- | --- | --- |
  | 1 | Met | Exact dark/light table and mapping tests; five-theme contrast CLI; native alert checks absent |
  | 2 | Met | Independent required-pair matrix, presence checks and failing-color mutations in both modes; shared CLI validator |
  | 3 | Met | Four initial-selection tests and two rendered selector tests |
  | 4 | Met | Exact meta/default/fallback inspection and no old default hex; stored-background behavior preserved |
  | 5 | Met | Both presentations, rounded thresholds, votes, neutral states, titles and inaccessible dots in passing tests |
  | 6 | Met | 8/7/5/4 tiers and both labels in combined/user-only layouts, both presentations |
  | 7 | Not met | All six badge/selected-style cases pass, but keyboard focus and ring color are unit-tested only for NR |
  | 8 | Met | Eight status/variant tint/root-color cases and a distinguishing dark action-border test |
  | 9 | Met | Required production search empty; rendered card, four divider and genre/company tag style tests pass |
  | 10 | Met | Complete stale-description/alias searches and contextual inspection; required Marquee documentation and rendered label |
  | 11 | Awaiting delivery | Fresh local smoke/axe run passes without login baseline; PR CI and post-merge staging evidence remain at their planned stages |

- **F1, minor — literal focus-coverage gap (criterion 7):** the source maps all certifications through the same JSX
  with unconditional `focusRingColor="ring"`; implementation consistency is supported. The criterion nevertheless
  explicitly asks unit tests to show the listed properties for every rating. The existing focus test covers NR
  only. Proposed FIX (local correction): parameterize that existing test across all six options, reach each
  selected checkbox by keyboard, and retain the focus/solid-outline/resolved-ring assertions. No production change
  or specification amendment is needed. Approval is pending; no finding-driven fix has been applied.
- **Bounded advisor consultation:** `/root/advisor` (Astra) considered only whether the shared-source invariant and
  one focus test satisfy criterion 7's literal wording. It recommended recording the narrow acceptance gap and
  parameterizing the existing test. The primary checked the source and accepted that interpretation. This settles
  that question; it is neither an independent verification nor a code review.
- **Independent companion:** not yet launched. Recommend it once the author gap is resolved; Class Heavy caps its
  complete passes at two. No verification pass or fix check has been spent.
- **Stop reason:** criterion 7 is not met literally; awaiting the Owner's fix/amend decision. Criterion 11 is an
  expected delivery dependency, not an implementation defect. Task 6.1 and both Proposed ADR statuses remain open.
- **Elapsed:** about 10 minutes, including the full gates, source walk and bounded advisory consultation.

## Criteria verification — approved coverage repair (2026-11-11)

- **Approval:** the Owner directed “yes, fix now” for F1, the criterion 7 coverage gap.
- **Disposition performed:** FIX (local correction), test-only. The existing selected-focus test now runs for all
  six certification options. It reaches each selected checkbox by Tab and retains the focus, solid-outline and
  independently resolved semantic `ring` assertions. No production change remains.
- **Fail-first evidence:** temporarily reconstructed the missing focus override by removing `focusRingColor="ring"`.
  All six focus cases failed behaviorally: the actual outline was Chakra gray `rgb(161, 161, 170)` rather than
  Marquee's `rgb(117, 83, 39)`. The six cases were tested together because they exercise the same shared focus rule.
  The source was restored in a finally block, and its diff against HEAD is empty.
- **Passing checks:** all 27 tests across the certification-filter and certification-badge files; frontend
  `npm run type-check`; changed-test ESLint and Prettier. Documentation lint and diff whitespace checks also passed.
- **Scope/evidence delta:** same complete work-unit diff from `a5a784f3` to `1768cda9` plus the current uncommitted
  test, README formatting and task-record changes. Criteria 1–6 and 8–10 retain the author walk's evidence; criterion
  7 now has fresh passing evidence for every rating and is marked met. Criterion 11 still awaits its planned PR CI
  and post-merge staging evidence. The earlier full suites were not repeated for this test-only expansion.
- **Task records:** added and completed Task 6.1.a; Task 6.1 stays open for the independent-companion decision and
  remaining verification lifecycle steps. Session pointer fields updated. Both new ADRs still read Proposed.
- **Review recommendation:** offer a separate fix check with declining recommended, since the repair only expands
  the same existing test body and all six assertions were proven sensitive to the missing override. Recommend the
  fresh independent verification companion over the complete work unit next. It remains unlaunched pending the
  Owner's choice; no independent pass or fix-check round has been spent.
- **Elapsed:** about four minutes for the repair and focused verification.

## Criteria verification — pass 1 (2026-11-11)

- **Approval:** the Owner approved the recommended fresh independent verification pass and the recommendation to
  omit a separate fix check of the preceding small test expansion.
- **Stage:** independent verification companion for Task 6.1; Class Heavy, cap 2. This is the first complete
  independent criteria pass, separate from the author walk and earlier planning reviews.
- **Runner:** fresh read-only general-purpose subagent `verification_pass1`, with no inherited conversation. It
  read the supplied PRD, neutral task-list contract and complete code/documentation diff, excluding the author
  completion records and criterion marks; it did not load author notes, working memory, review logs or prior reports.
- **Rubric:** all eleven unchanged Success Criteria under verification-review, validate-criteria and source-grounding.
- **Target:** merge base `a5a784f343550f21fd19a68538c7a0837697f900` through
  `1768cda9fde08b10393244e2fc00b7edf35362a5` plus current uncommitted changes. The target manifest enumerates 75
  changed paths. Source hashes matched before and after the review; the primary confirmed them again before
  applying only the closing lifecycle metadata below.
- **Kept artifacts:** in `adversarial-review/`, with SHA-256 content hashes:
    - `prompt-verification-pass1.md`: `8a64efdcd11679a584eb75927b6c4fb0a7e6470471348db6ab5258c890018e40`.
    - `report-verification-pass1.md`: `d5e0e518c1aad60701a8bd3f0f6cbd1fe8d37cf1a1ba9f661f6d2abe4b7e6933`.
    - `tasks-verification-pass1.md`: `4fc410240791cd780be43ff01f79efffed19037746d3dcf7f1c2f8d3743b1620`.
    - `prd-verification-pass1.md`: `8a49ca7501a25959c470286c34ce09f1a56ec8e12a63c6c8adaea5c1e3d7e300`.
    - `verification-pass1.diff`: `fd2d9e426ad0b9a65b29c835c64c9e7fc5bc69774811f761f4d0136fac5decc1`.
    - `verification-pass1-target.json`: `d031edccd0e63b21ae1f3800bbf74e0b1a7e36a73092a36e60deebd3be9f5567`.
- **Verified findings:** none reported; zero critical, major or minor findings. There is no finding disposition
  set and no shared cause to repair.
- **Independent result:** criteria 1–10 are source-supported. Executed in-memory probes passed all 1,378 applicable
  contrast checks with 272 scoped exclusions; the required-pair probe detected all 1,028 low-contrast foreground
  mutations across both modes. The report distinguishes inspecting component-test assertions from executing them;
  the primary's retained gate results remain the evidence for component and browser test runs.
- **Primary validation:** the report's palette values, pair scopes/compositing, score rounding, focus override,
  alert compound styles, role searches and documentation propagation agree with the source walk and the actual
  verification results. Criterion 11 remains explicitly open for the PR's smoke/axe job and post-merge staging;
  source inspection cannot prove either future result. No criterion was reworded or waived.
- **Stop reason:** converged, with no finding-driven repair or successor pass recommended. One of two complete
  criteria passes used. This is not the separate standard code review.
- **Lifecycle close:** Task 6.1 marked complete; PRD and task headers set Complete per archive-completed § 1;
  ADR-041 and ADR-042 changed from Proposed to Accepted (2026-11-11), with their independent decision bodies and
  partial-supersession links checked. Criterion 11 and Task 6.2 remain open for their planned delivery evidence.
  Session pointers updated. All changes remain uncommitted.
- **Next action:** completion preparation from archive-completed § 1b, then the separate code-review stage after
  the documentation steps. The Owner decides continuation and any commit/push.
- **Elapsed:** about eight minutes for preparation, the independent pass and primary validation.

## Completion preparation (2026-11-11)

- **Authorization:** the Owner directed continuation through completion preparation after Task 6.1.
- **Generated-code trigger:** the complete change from main contains no backend API or schema files, so § 1b's
  OpenAPI/type regeneration does not apply.
- **Hygiene mode:** maintain-task-notes § 1b reserves Mode 2 for fully checked task lists. Task 6.2 and criterion 11
  deliberately remain open for delivery evidence, so its Mode 1 fallback was used for the working record. Final
  archival readiness still waits for that evidence; no pending checkbox was marked merely for cleanup.
- **Section decisions:** metadata, overview, scope, every phase/task record and all criteria kept. Implementation
  Notes kept for source/type/cascade context and staging checks, with obsolete implementation instructions replaced
  by the realized behavior. Generic ADR-number/code-comment reminders removed as planning scaffolding. Detailed
  historical test outcomes remain. There is no companion notes file to retain, clean or delete.
- **Preservation check:** every task checkbox line and the complete Success Criteria section remained byte-identical
  across cleanup. The task header's completion date matches the new completion document's local date.
- **Completion document:** `completion-palette.md` covers the adapter/contrast work (Phase 1), default and first
  paint (Phase 2), score chips (Phase 3), neutral certifications and selected/focused pills (Phase 4), themed alerts
  and movie surfaces (Phase 5), and the completed local/independent verification with its delivery obligations
  (Phase 6). Quantitative test counts were omitted from the summary; the task records retain the exact run evidence.
- **Follow-up verification:** the live staging/CI evidence remains in criterion 11 and Task 6.2. The later light-layer
  comparison is the Owner's recorded follow-up after layout changes; this delivery preserves the approved values.
- **Checks:** changed-document Markdown lint passed; required reference files exist, there is no dangling notes
  reference, and the new document cites no path on the local machine. Diff whitespace checks passed.
- **Commit state:** seven files now hold the verification repair, mechanical README correction, accepted ADR statuses,
  lifecycle/task metadata and completion summary. All remain uncommitted, awaiting explicit commit approval before
  archive-completed § 5's separate code review. Session pointers updated.

## Commit and code-review author check (2026-11-11)

- **Approval:** the Owner explicitly approved committing the seven verification/completion files, then continuing
  to code review. One commit was authorized and created: `30c36a9a8a6c525f21ca78b90ce131e626d3c121`, `test(theme): complete palette verification records`.
- **Boundary:** the all-certification focus-test expansion and mechanical README formatting correction, with their
  completed verification task, accepted ADR statuses, task/PRD metadata, preserved criterion evidence and completion
  document. All serve the palette's verified completion. Explicit paths were staged; no personal records were staged.
- **Hook results:** pre-commit and commit-message validation both passed. The staged set contained exactly seven
  intended files. The checkout was clean after the commit; nothing was pushed.
- **Author-check rubric:** code-review-author over the complete aggregate branch change: scope, cross-task
  consistency, cleanup/dead code, documentation drift, unresolved markers, correctness and explicit failure behavior.
- **Exact subject:** `3b2eae90843f1b3cdbaff24c9bb837d7abc44fa1..30c36a9a8a6c525f21ca78b90ce131e626d3c121`, 66 changed files; binary diff SHA-256
  `a0a02f2ec87ee9b23fa61797079eb35c831a549465f11b7d61d8182ceaf14685`. Shared main had advanced to `88ddf8c3860635d5d3a92bfaee8970db1366a54d` during this session,
  so its current merge base excludes the already merged status-contrast and optional-token work. This narrows the
  inherited portion of the earlier verification target; the palette subject itself is unchanged apart from the
  retained verification/completion commit.
- **Coverage:** reviewed theme construction/default selection and mappings; contrast matrix extraction, compositing
  inputs, theme-scope accounting and missing-required-token failure; score rounding, votes and accessible labels;
  neutral certifications and checked/focused pills; alert cascade/action states; removed role and utility callers;
  shared style-test helpers and assertions; developer examples, strategies, README and completed work documents.
- **Author findings:** no actionable findings. Scope and source/test/documentation behavior are consistent. The
  production role-removal sweep found no remaining consumers of the retired utility exports or color-mode wrappers;
  the added-marker sweep found no new unresolved TODO/FIXME, unsafe-any suppression or leftover application debug
  logging. The added console output belongs to the contrast CLI's intended reporting.
- **Verification posture:** the passed task/verification checks were not rerun for a read-only author check. The
  contrast validator retains an explicit failed result for required missing colors, while named scope exclusions
  are accounted separately. This preflight is author-side and is not an independent standard code review.
- **Next decision:** recommend a fresh independent code review of the complete exact branch subject under
  code-review-standard and implementation-audit. It has not been launched; the Owner decides under
  archive-completed § 5. No independent code-review pass or fix check has been spent.
- **Session state:** pointer fields updated for the independent-review decision. Criterion 11 and Task 6.2 remain
  open for PR CI and post-merge staging. The worktree remains clean at `30c36a9a`.

## Code review — pass 1, delegated agent (local) (2026-11-11)

- **Approval:** the Owner explicitly approved the recommended fresh independent code review.
- **Runner:** fresh read-only general-purpose subagent `code_review_pass1`, with no inherited conversation. No author
  notes, working memory, review records or verification reports were loaded. The only personal inputs were the
  neutral prompt, full exact diff and immutable target manifest.
- **Rubric:** code-review-standard (`standard-review/v1`), all implementation-audit dimensions, augmented by
  repository contract coherence from the project review guidelines. The report explicitly addresses all six.
- **Exact subject:** `3b2eae90843f1b3cdbaff24c9bb837d7abc44fa1..30c36a9a8a6c525f21ca78b90ce131e626d3c121`,
  all 66 changed files and relevant resulting behavior/callers. The reviewer checked every file hash and the full
  diff; the primary repeated that binding check after the report. The checkout remained clean.
- **Kept artifacts:** under `code-review/`, with SHA-256 content hashes:
    - `prompt-pass1.md`: `f3a276c158716d4d417ddbcaa97eff4ba44d1256c0188c939740f21c127c5a36`.
    - `pass1.diff`: `a0a02f2ec87ee9b23fa61797079eb35c831a549465f11b7d61d8182ceaf14685`.
    - `pass1-target.json`: `b78d5da84938b8a020139e35e5a2ab13cf442742573d28f85ce2712624911002`.
    - `report-pass1.md`: `219e8d09e4ea918c59ba15496fcfdf86c998991063b15fd1a8e8aaa96c603d09`.
- **Verified findings:** none; zero critical, major or minor findings. No fix/defer/reject set or shared cause
  requires settlement.
- **Executed evidence:** target/hash and source-propagation checks; all ten contrast variants (1,378 passes,
  272 scoped skips, zero failures); actual merged production alert-recipe resolution; server rendering assertions
  for score boundaries/labels/decorative dots/user-only output; isolated pre-paint cases including unavailable
  storage and invalid stored values. The reviewer inspected component tests/CI wiring without claiming to have
  rerun them. The earlier full-gate results remain the actual unit/browser evidence.
- **Primary validation:** decisive source claims agree with the actual six-digit pre-paint validation/fallback,
  displayed-score classification and preserved labels, selected pill overrides, merged status/subtle compounds,
  and explicit movie-surface colors. Reviewed source is unchanged. CI/staging delivery proof remains unestablished
  at this pre-publication point; criterion 11 and Task 6.2 remain open.
- **Stop reason:** converged: complete exact-target coverage with no actionable findings under all six dimensions.
  No repair, fix check or successor pass is recommended. This is the first independent code-review pass, separate
  from the earlier independent criteria pass.
- **Elapsed:** about ten minutes for preparation, review and primary validation.

## Alignment and publication preparation (2026-11-11)

- **Alignment reference:** `origin/main` at `88ddf8c3860635d5d3a92bfaee8970db1366a54d`. Checked META-PRD's purpose,
  discovery/personal-management goals, accessibility requirement and out-of-scope list, and TECHNICAL-OVERVIEW's
  frontend theme architecture. Neither document changed between the preparation read and the post-review check.
- **Alignment result:** no material disagreement. The palette supports the discovery UI and accessibility goals;
  it introduces none of the excluded social, TV or streaming features. The adapter preserves the existing semantic
  token/recipe architecture and adds the own palette the technical overview anticipated. This change updates that
  overview's theme paragraph accordingly.
- **Publication guidance:** pull-request-format loaded; current repository guidance/template search found no
  applicable file. The owner's `.github` repository lookup returned Not Found. The repository's method override
  also records no inherited template/policy, so its default public-surface format governs.
- **Remote check:** GitHub returned no open pull request for `technical/palette`.
- **Prepared wording:** title `feat(theme): make Marquee default and restyle movie scores`, with the body describing
  the user-visible palette/chip/color corrections, the two material visual choices, the manually inspected fixture
  scenario and one commit-pinned design link. No review metadata, planning IDs or process narration is included.
  The draft is held in the session scratchpad for the Owner's wording approval before publication.
- **Next action:** present the concrete title/body and request approval to push this exact head and open its pull
  request against main. After approval, monitor the exact pushed head's CI in the same turn. No push, PR creation,
  hosted review request or merge has been performed. Session pointer fields updated.

## Post-merge live proof (2026-11-11)

- **Merge:** PR #170 merged with commit history preserved as `3206071f`; the accepted head `30c36a9a` is its parent
  and is included in main. The refreshed ADR acceptance/number check passed before the approved merge.
- **Hosted evidence:** PR smoke/axe passed in CI run 43026012637. The merge commit passed validation, automatic
  staging deployment and staging smoke in CI run 43027791715.
- **Live evidence:** read-only browser checks launched from the main checkout rendered browse and movie 687163's
  detail page in dark and light with fresh palette storage. Page backgrounds resolved to `#110E0A` and `#F2E8CE`;
  score chips retained neutral text, transparent fills, 1px outlines and decorative 8px dots. The visible PG-13
  certification resolved to neutral badge fills `#433C34` and `#DFD2B4` with the corresponding foreground text.
- **Probe correction:** the first light-mode probe waited on the underlying body background rather than the visible
  BaseLayout surface. Source inspection established BaseLayout's full-height semantic background; correcting only
  that locator made both complete mode checks pass. An exploratory networkidle wait was also unsuitable and was
  replaced with the rendered content/paint checks. No app code, palette value, custom background seed or stylesheet
  override was used to obtain the passing result. The full raw proof and explanation are retained privately.
- **Records prepared:** a two-file patch marks Task 6.2 and Success Criterion 11 complete without changing criterion
  wording, records the CI/live evidence, and updates the completion summary. Markdown lint and git apply --check
  passed. No main-checkout file has changed; all task/criterion check-off changes await explicit commit/push approval.
- **Next:** apply and commit/push the approved evidence from the clean main checkout, then hand off/end this worktree
  session before its primary-checkout removal and archival.

## Post-merge evidence recorded (2026-11-11)

- **Approval:** explicit permission to fast-forward the clean primary main checkout, apply the prepared evidence
  update and commit/push its two .arc files. The checkout was clean on main before the fast-forward; only the
  task list and completion summary changed afterward.
- **Commit:** `9dd9d400`, `docs(arc): record deployed Marquee verification evidence`, pushed to main. Task 6.2 and
  Success Criterion 11 are checked, all eleven criteria are met, and the completion summary retains only the later
  light-layer comparison as follow-up work. Criterion text was preserved.
- **Checks:** changed-document Markdown lint and whitespace checks passed; commit hooks passed with their expected
  main-branch/subject-length warnings. The push contained only the two approved .arc files. Documentation workflow
  43032041163 passed at the exact evidence commit; the .arc-only push did not redeploy the app.
- **Final source state:** primary main is clean at `9dd9d400`; the palette worktree is clean at `30c36a9a`, its
  already-merged snapshot. Post-merge check-off lives on main as the workflow requires, rather than in another push
  to the deleted remote feature branch. The private session pointer explains the differing task-list snapshots.
- **Closing boundary:** handoff and end this worktree's session before the primary checkout runs finish palette.
  Removal/archive requires its explicit approval, and the archive push is separately approved. No worktree,
  container or branch was removed by this session.
