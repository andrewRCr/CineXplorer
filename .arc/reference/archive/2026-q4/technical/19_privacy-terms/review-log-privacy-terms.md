# Review Log: privacy-terms

## 2026-11-19 · Design draft · Design review — pass 1 (limit reached)

- **Rubric:** assess-draft-readiness (divergence, ADR dispositions), assess-design-proportionality, design-audit,
  source-grounding; fresh read-only reviewer subagent; runner independent.
- **Reviewed version:** `draft-pass1.md` (sha256 `25cd54a0…`); settled after folds: `draft-pass1-round1.md`
  (sha256 `c3c6cf33…`).
- **Findings by verified grade:** 5 major, 7 minor; all 12 confirmed at source, none refuted.
- **Approved dispositions (Owner, all fix, local correction):**
    - F1 the request log never records usernames (middleware order); the server-log sentence drops the claim.
    - F2 email verification and provider sign-in set a `messages` cookie with the address or username; row rewritten.
    - F3 the change record keeps removals, entry-made rating rows and timestamps; History shows additions.
    - F4 Home's line reworded to mirror the policy's short version ("name, email address and basic profile").
    - F5 the keep-true rule covers any statement made untrue and the terms; two missing storage keys added.
    - F6 token-refresh limit added; F7 `sessionid` row drops "without signing in"; F8 `h3` for all subsections;
      F9 heading ids and in-page links; F10 `none` dispositions name categories; F11 rendering risk accepted with a
      fallback; F12 the PRD carries both complete texts, forecast 1,700–2,300 lines.
- **Other approved changes:** the sign-up notice reads "agree to the Terms of Service and acknowledge the Privacy
  Policy".
- **Shared cause:** the first grounding pass inventoried the code by delegated lookups and spot checks rather than
  tracing each claimed path (F1, F2, F3, F5's storage keys); one look.
- **Captured outside this work:** "Stop setting a `messages` cookie the app never shows" and "Decide what the request
  log's user context should do", both to the inbox's Errand section.
- **Stop reason:** pass cap reached (Light, 1); fix check round 1 offered and approved.
- **Elapsed:** about 14 minutes (review), plus verification and folds.

## 2026-11-19 · Design draft · Design review — fix check, round 1 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure; fresh read-only reviewer
  subagent; runner independent.
- **Versions:** `draft-pass1.md` (sha256 `25cd54a0…`) to `draft-pass1-round1.md` (sha256 `c3c6cf33…`); settled after
  folds: `draft-pass1-round2.md` (sha256 `44b1eb66…`).
- **Findings by verified grade:** 4 major, 3 minor; all confirmed at source. Fixes 3, 4, 5, 7, 8, 9, 10 and 12 of
  pass 1 closed.
- **Approved dispositions (Owner, all fix, local correction):**
    - F1 user IDs are logged on more account events than sign-up and sign-in; the "only" goes and the events
      sentence names them.
    - F2 email sign-up also sets the `messages` cookie; the row names sign-up, verification and provider sign-in.
    - F3 the terms' opening becomes "you agree to them. The Privacy Policy explains how we handle your data.", to
      match the sign-up notice's "acknowledge".
    - F4 allauth's default limits listed, counted by IP and by hashed email address; policy wording adds the address.
    - F5 the refresh limit counts password sign-ins per IP; F6 `[C6]` observed after sign-up alone; F7 the fallback
      adds static content for Home.
- **Shared cause:** enumerating behavior from searches rather than tracing every path (F1, F2, F4); second look with
  this cause (pass 1: F1, F2, F3, F5).
- **Stop reason:** round 2 offered and approved.
- **Elapsed:** about 11 minutes (review), plus verification and folds.

## 2026-11-19 · Design draft · Design review — fix check, round 2 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure; fresh read-only reviewer
  subagent; runner independent.
- **Versions:** `draft-pass1-round1.md` (sha256 `c3c6cf33…`) to `draft-pass1-round2.md` (sha256 `44b1eb66…`).
- **Findings by verified grade:** 1 major, 4 minor; all confirmed at source. All seven round-1 findings closed.
- **Approved dispositions (Owner, all fix, local correction):**
    - F1 the app's verification resend consumes no allauth limit; only sign-up counts against the per-address
      cooldown.
    - F2 "where known" restored; F3 the refresh limit counts per IP (only password sessions renew); F4 the sign-up
      method is `register_user`; F5 the terms' opening change moves under decision 11.
- **Shared cause:** enumerating behavior from searches rather than tracing every path (F1); third look with this
  cause.
- **Trend:** Design pass 1: 5 → round 1: 4 → round 2: 1 major; sustained non-convergence on one shared cause, with
  no design decision moved in three looks.
- **Stop reason:** stopped for the Owner's decision at the third look of one cause. The Owner chose to end the loop
  after these fixes, reframe decision 6 as the changes found so far, ground every sentence of both texts at the PRD
  stage (tracing each path at source), and ratchet the Class from Light to Heavy on the scale trigger. This loop's
  findings go to the PRD review as context.
- **Elapsed:** about 9 minutes (review), plus verification and folds.

## 2026-11-19 · PRD · PRD review — pass 1

- **Rubric:** assess-design-proportionality, design-audit, and spec-review at the `detailed` form with
  source-grounding over the PRD, both texts and the grounding map; fresh read-only reviewer subagent; runner
  independent. The design loop's findings were given as context, not as the search frontier.
- **Version:** `prd-pass1.md` (sha256 `7f0dc976…`).
- **Findings by verified grade:** 7 major, 4 minor; all confirmed at source. One reviewer major (the smoke-spec count
  documents) verified as minor: two stale counts, no behavior.
- **Approved dispositions (Owner, all fix):**
    - F7 (new design) the keep-true rule names the areas of code the texts describe, and the ADR names the PRD's
      grounding map.
    - F1 (local correction) the pages open at their top, or at a fragment's heading below the top bar; the smoke spec
      checks both.
    - F2 the short version says GitHub sends every address on the account, of which one is kept; Home's line stays.
    - F3 revoking access at Google or GitHub changes nothing on the site; unlinking or deleting is by request.
    - F4 a GitHub sign-in with no verified primary address leaves its token in the session until a later sign-in or
      expiry; disclosed, with the code fix captured as an inbox errand.
    - F5 the cookie section's opening names `messages`; no banner, with the true reason (Owner: keep the cookie's
      removal as its errand).
    - F6 the provider-held sentences listed with their confirmations; backups in western North America (R2 location
      hint WNAM); Cloudflare Email Routing confirmed; the sender domain backs no sentence.
    - F8 the smoke-count requirement names all four documents; F9 the text column's width and the tablet exclusion
      defined; F10 a requirement to re-trace the texts against `main` before merge; F11 eight loosely stated
      sentences and map rows corrected.
- **Shared cause:** sentences carried over from the approved texts weren't traced to the end of their paths, and
  the grounding map's topic rows hid the gaps (F2, F3, F4, F5, F6, F11). It is the design review's cause at a fourth
  look. Fix at the cause (approved): the map gets one row per sentence that states what the site or a provider does,
  each traced at source by the primary.
- **Stop reason:** none yet; fix check round 1 since pass 1 approved (Owner, as recommended), then pass 2.
- **Elapsed:** about 20 minutes (review), plus verification.

## 2026-11-19 · PRD · PRD review — fix check, round 1 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure; fresh read-only reviewer
  subagent; runner independent.
- **Versions:** `prd-pass1.md` (sha256 `7f0dc976…`) to `prd-pass1-round1.md` (sha256 `9f7813f0…`); settled after
  folds: `prd-pass1-round2.md` (sha256 `9a7f5573…`).
- **Findings by verified grade:** 1 major, 2 minor; all confirmed at source. Pass 1's F1–F6 and F8–F11 closed; F7
  closed in part.
- **Approved dispositions (Owner, 2026-11-20, all fix, local correction):**
    - F1 the keep-true rule's list of code areas is rebuilt from every path the grounding map cites: it adds the
      movie lists, which catalog routes need an account, the saved film details, the containers' log retention, the
      packages, scripts and images the browser loads, and the footer's attribution.
    - F2 the grounding map gains entries for the five uncovered sentences and for those a sentence split of both texts
      found; its preamble says how rows group sentences and claims; decision 6 adds the changes a paragraph comparison
      with the approved texts found.
    - F3 the provider facts record the bucket's location as the R2 dashboard shows it, and the Zoho log's fields; the
      texts drop the providers' consent behavior on a later sign-in.
- **Shared cause:** lists stated complete were written from recall rather than derived from their source (F1, F2;
  pass 1's F6 and F8). Fix at the cause: each list derived from its source (the rule's areas from the map's paths, the
  map's coverage from a sentence split, decision 6 from a paragraph comparison, the provider facts from the map's
  provider marks).
- **Trend:** PRD pass 1: 7 → round 1: 1 major; converging.
- **Stop reason:** none yet; round 2 since pass 1 approved (Owner, as recommended), then pass 2.
- **Elapsed:** about 16 minutes (review), plus verification.

## 2026-11-20 · PRD · PRD review — fix check, round 2 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness (the rule's areas, the map's sentence
  coverage and decision 6's changes, each against its source), new failure; fresh read-only reviewer subagent; runner
  independent.
- **Versions:** `prd-pass1-round1.md` (sha256 `9f7813f0…`) to `prd-pass1-round2.md` (sha256 `9a7f5573…`); settled
  after folds: `prd-pass2.md` (sha256 `8805f5b6…`).
- **Findings by verified grade:** 0 major, 5 minor; all confirmed at source. Round 1's F1–F3 closed.
- **Approved dispositions (Owner, 2026-11-20, all fix):**
    - F1 (local correction) the map and the rule name `backend/requirements/`, where the backend's packages are
      locked, in place of `backend/pyproject.toml`.
    - F2 (local correction) the "Remember me" token and marker last until sign-out or, once the sign-in has run out,
      until the next visit; the map names the code that removes them.
    - F3 (local correction) the account-event, `csrftoken` and `refresh_token` entries name a locus for each claim,
      and every map row was swept for the same gap and every lifetime traced to the code that ends it. The sweep
      corrected four more sentences in the texts: the films shown and the abuse-limit counts last a set time after the
      last request, not the first; a password removed on a Google link still leaves a password reset; and Google's
      page for removing an app is now its linked apps. It also added loci for the database's host, the providers that
      receive Google data, the email-only claim, the TMDB image request, the deletion cascade and the tokens left
      after deletion, and recorded the `messages` cookie's overflow into the session (about 260 sign-ups or 5,900
      sign-ins in one browser session).
    - F4 (new design, small) the rule's list adds the provider facts, and a change to one of the site's provider
      settings updates the texts first in a pull request of its own; Google's and GitHub's help pages join the
      provider facts.
    - F5 (local correction) decision 6 names the sign-in-in-progress marker.
- **Shared cause:** round 1 derived the rule's list from the map's paths, and the map's preamble promised a locus for
  every claim, without the map's rows first being checked against those stronger promises (F1, F3, F4); F2 repeats
  pass 1's cause, a lifetime written without tracing the code that ends it. Fix at the cause: the row sweep with
  lifetime tracing (F3).
- **Trend:** PRD pass 1: 7 → round 1: 1 → round 2: 0 major; converging.
- **Stop reason:** none yet; pass 2 next (limit reached), approved with round 1's dispositions; no round 3 (Owner, as
  recommended).
- **Elapsed:** about 12 minutes (review), plus verification and the sweep.

## 2026-11-20 · PRD · PRD review — pass 2

- **Rubric:** assess-design-proportionality, design-audit, spec-review at `detailed` with source-grounding at
  artifact scope; fresh read-only reviewer subagent; runner independent; prior loops' findings as context only.
- **Version:** `prd-pass2.md` (sha256 `8805f5b6…`); settled after folds: `prd-pass2-round1.md` (sha256
  `0229c898…`).
- **Findings by verified grade:** 1 major, 5 minor; all confirmed at source (F1 against Google's API Services User
  Data Policy, read directly).
- **Approved dispositions (Owner, 2026-11-20, all fix):**
    - F1 (new design, small) the keep-true rule holds a change that uses personal data in a way the published policy
      doesn't describe until account holders are told and asked to consent where required (always for Google data);
      decision 8 gives the reason, and the map's notice-of-changes entry points to the rule.
    - F2 (local correction) backups are taken nightly and before each deploy; the on-server copies sentence covers a
      failed upload and a copy made or downloaded to repair or restore the site, and "Your choices" excepts them from
      its 30 days; the map and the rule name `deploy.sh` and the deploy runbook.
    - F3 (local correction) a failed request's contents are "removed before the report is kept", since the browser
      sends them and the server drops them; the browser-side leak is captured in the inbox as an errand.
    - F4 (local correction) the Google sharing bullet adds the username the reset email names.
    - F5 (local correction) the Email section names the site as the sender of its list and adds the Owner's notices
      about the service itself.
    - F6 (local correction) the map's Caddy entries and the rule's server bullet name `frontend/Dockerfile`, which sets
      the Caddy version.
- **Shared cause:** traces stopped a step short of where the data starts (`backup.sh`'s other caller, the image that
  sets Caddy's defaults, the browser side of the error report, the reset email's body: F2, F3, F4, F6), and the texts'
  own commitments were mapped without a check against the rule and the other text (F1, F5). Fix at the cause: each
  affected claim traced from its source, and every _commitment_ entry checked against the rule and the terms, which
  found nothing beyond F1 and F5.
- **Trend:** PRD pass 1: 7 → round 1: 1 → round 2: 0 → pass 2: 1 major; the new major is a rule gap, not grounding.
- **Stop reason:** limit reached (Heavy, two passes); an approved major fix withholds convergence, so fix check round 1
  since pass 2 runs (Owner, as recommended), then approval.
- **Elapsed:** about 20 minutes (review), plus verification.

## 2026-11-20 · PRD · PRD review — fix check, round 1 since pass 2

- **Rubric:** closure, behavioral grounding, propagation and completeness (the rule's areas, the map's coverage and
  decision 6's changes against their sources), new failure; fresh read-only reviewer subagent; runner independent.
- **Versions:** `prd-pass2.md` (sha256 `8805f5b6…`) to `prd-pass2-round1.md` (sha256 `0229c898…`); settled after
  folds and the post-settle reread: `prd-settled.md` (sha256 `c31735b1…`).
- **Findings by verified grade:** 0 major, 5 minor; all confirmed at source. Pass 2's F2–F6 closed; F1's step added.
- **Approved dispositions (Owner, 2026-11-20, all fix, local correction, as recommended):**
    - F1 the on-server copies sentence covers any failed backup, not only a failed upload.
    - F2 decision 6 says the error-report clause is added, not corrected, and lists the Cloudflare bullet's dropped
      "nightly".
    - F3 the rule, decision 8 and the map state the new-use hold one way: no merge until the people whose data it uses
      are told, and the new use only for those who consent where consent is required.
    - F4 the visitor-IP and IP-limit entries name Caddy and the proxy-count settings; § 6 says how the address is set.
    - F5 the Owner's service notices go through the same email provider (Owner's choice, as recommended).
- **Shared cause:** each fix was checked against its finding but not re-derived from its source or searched across
  the PRD. Fix at the cause: each fix re-read its source and every other statement of the same fact before writing.
- **Trend:** PRD pass 1: 7 → round 1: 1 → round 2: 0 → pass 2: 1 → round 1 since pass 2: 0 major; converged.
- **Stop reason:** converged with the limit reached; no further fix check (Owner, as recommended). Post-settle
  reread and lint clean; next, approval and the commit.
- **Elapsed:** about 10 minutes (review), plus verification.

## 2026-11-20 · Task list · Task list review — pass 1

- **Rubric:** task-audit at full depth (grounding floor and the eight categories), executability, coverage of R1–R16,
  Success Criteria copied unchanged; fresh read-only reviewer subagent; runner independent.
- **Versions:** `tasks-pass1.md` (sha256 `d73218e8…`) reviewed; after fixes `tasks-pass1-round1.md`
  (sha256 `80783c57…`).
- **Findings by verified grade:** 3 major, 6 minor; all checked at source, 8 confirmed, F4's pin shown right by the
  PRD review's records.
- **Approved dispositions (Owner, 2026-11-20, as recommended):**
    - F1 fix: the landing check requires the heading in view, its top at the bar's bottom or a few pixels below.
    - F2 fix: the re-trace moves before verification (new 3.5); 4.1 leaves Success Criterion 3 open through § 1 and
      marks it at § 8 once the last commit sets the dates and later merges are traced; 4.2 proves the post-merge
      criteria (§ 9).
    - F3 fix: 3.4 checks the number on `origin/main` and Proposed; the records check runs at § 8 after acceptance.
    - F4 no change: the PRD's last three review passes record reading `origin/main` at `099a75df`.
    - F5 fix: 1.2 runs `sign-in.spec.ts`; the Phase 3 check adds `phone-width.spec.ts`.
    - F6 fix: the opening position lives in the shared document pieces.
    - F7 fix: the table wrapper keeps cells wrapping and is a focusable named region.
    - F8 fix, swept: 3.1.a's signed-in case is a guard that passes from the start; 1.1.a's and 2.1.a's absence
      checks run once the title has rendered.
    - F9 fix: Won't Do names the error-report change instead of the inbox.
- **Shared cause:** checks were written without asking whether each could fail before the change (F1, F8), and
  merge-time steps were placed by the list's order rather than where the completion workflow runs them (F2, F3).
- **Trend:** task list pass 1: 3 major, 6 minor.
- **Stop reason:** none yet; approved major fixes withhold convergence, so a fix check is offered.
- **Elapsed:** about 14 minutes (review), plus verification.

## 2026-11-20 · Task list · Task list review — fix check, round 1 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure; fresh read-only reviewer
  subagent; runner independent.
- **Versions:** `tasks-pass1.md` (sha256 `d73218e8…`) to `tasks-pass1-round1.md` (sha256 `80783c57…`); after fixes
  `tasks-pass1-round2.md` (sha256 `b899fda0…`).
- **Findings by verified grade:** 1 major, 3 minor; all confirmed at source. Pass 1's F1, F3 and F5–F9 and the core
  of F2 closed.
- **Approved dispositions (Owner, 2026-11-20, all fix, as recommended):**
    - F1 Success Criterion 1's CI half stays open through § 1 with Criterion 3 and is marked from the pull request's
      first green smoke run; the criteria's preamble names both.
    - F2 4.1 states the merge-time order: trace, the ADR records check, then the dating commit last, carrying the
      trace's record, the criteria's marks and 4.1's check; a later commit means dating again.
    - F3 Phase 3's exit criterion and mode line return to the specs its check task runs.
    - F4 1.3.a's 360×800 step and 3.1.a's signed-in case are guards that say how each is seen failing once.
- **Shared cause:** pass 1's causes were fixed where named but not swept: the merge-timing cause across every
  criterion and commit it governs (F1, F2), and the can-it-fail cause across every check (F4). Both sweeps done with
  these fixes; an ADR-accepted criterion is marked at § 1 by precedent, so Criterion 5 is unchanged.
- **Trend:** task list pass 1: 3 major, 6 minor → round 1: 1 major, 3 minor.
- **Stop reason:** none yet; an approved major fix withholds convergence, so fix check round 2 is offered.
- **Elapsed:** about 9 minutes (review), plus verification.

## 2026-11-20 · Task list · Task list review — fix check, round 2 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness (the merge-timing and can-it-fail sweeps),
  new failure; fresh read-only reviewer subagent; runner independent.
- **Versions:** `tasks-pass1-round1.md` (sha256 `80783c57…`) to `tasks-pass1-round2.md` (sha256 `b899fda0…`); settled
  after folds and the post-settle reread: `tasks-settled.md` (sha256 `07e46ed4…`).
- **Findings by verified grade:** 0 major, 2 minor; both confirmed at source (F2 by the primary's width arithmetic,
  agreeing with the reviewer's browser measurement). Round 1's four findings closed.
- **Approved dispositions (Owner, 2026-11-20, both fix, as recommended):**
    - F1 each merge-time trace fetches `origin` and covers everything since the last trace; after approval a fresh
      fetch reruns the order from the trace when `main` changed a mapped path, a commit is needed, or the day slips.
    - F2 1.3.a's guard is seen failing by also stopping the cells from wrapping, since wrapped cells fit the page's
      padding at 360px.
- **Shared cause:** each fix was checked against its finding but not against what follows it: `main` moving after
  the trace (F1) and the table's real width (F2).
- **Trend:** task list pass 1: 9 (3 major) → round 1: 4 (1 major) → round 2: 2 minor; converged.
- **Stop reason:** converged; no further fix check and no second pass (Owner, as recommended). Post-settle
  suite-coherence reread found two broken line wraps, reflowed; lint clean. Next, approval and the commit.
- **Elapsed:** about 11 minutes (review), plus verification.

## 2026-11-20 · Verification · Criteria verification, pass 1

- **Rubric:** the complete work unit and each implemented and proven-live success criterion. Fresh read-only Codex
  reviewer. Criterion markings and author verification evidence were withheld from the supplied task list.
- **Version:** base `d39b39d1`, HEAD `161a600d` and tracked working-tree changes, diff SHA-256 `bcced26c5714…`.
  Rechecked the hash after the pass.
- **Findings by verified grade:** 3 major, 1 minor. All fail source accuracy (Implemented Criterion 3).
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major). The duplicate-email Google flow attempts to resolve a missing headless password reset URL
      before it sends the account-exists email. The worktree reproduced the exception. Remove the promise from
      the policy and update its grounding, then capture the mail URL repair in the inbox.
    - F2 fix (major). Django admin deletion previews render the related viewing entry IDs and change fields and
      times from model display strings. Extend the admin access disclosure to cover those previews.
    - F3 fix (major). Django admin records object IDs and display names with each entry linked to the acting
      administrator. Disclose audit records as data that can survive account deletion and has no scheduled expiry.
    - F4 fix (minor). Access tokens expire in five minutes. Refresh tokens expire in 14 days. Describe the two
      lifetimes and name the expired database records that nightly maintenance clears.
- **Shared cause:** the first admin disclosure traced the record detail but omitted how Django previews deletions
  and records admin actions (F2, F3).
- **Response:** all four wording corrections are in the PRD and privacy page. The settings repair is captured in the
  inbox. Verified the rendered documents against the appendices, 18 focused unit tests, five legal-page Chromium
  scenarios, lint and type checking.
- **Stop reason:** corrections applied. Recommend a focused fix check before considering another complete pass.
- **Elapsed:** about 10 minutes, including source checks of the returned findings.

## 2026-11-20 · Verification · Criteria verification, fix check round 1 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the four approved
  corrections. Fresh read-only Codex reviewer. Scoped from the approved change account and current source because
  the earlier reviewed copies were unavailable.
- **Version:** base `d39b39d1`, HEAD `161a600d` and tracked working-tree changes, diff SHA-256 `4b3179f7d8ab…`.
  The checkout matched the digest before and after the check.
- **Closure:** pass 1's F1 and F2 closed. The reviewer checked the copy correction and the primary verified the
  mail repair inbox entry. F3 and F4 need the corrections below. Comparing the page source with the appendices,
  the reviewer found matching text and link targets.
- **Findings by verified grade:** 1 major, 1 minor, both fail source accuracy (Implemented Criterion 3).
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major). Deletion ends access to the account. The stored session can outlive it, and a later OAuth
      attempt can save the same record again and move its expiry. Distinguish account access from session expiry in
      the policy and map.
    - F2 fix (minor). Django admin also logs when each action took place and the labels of fields changed in an
      account edit. Include that metadata in the retention bullet and acknowledge that a username generated from
      Google data can remain in an admin activity record after the linked account is deleted.
- **Trend:** criteria pass 1: 3 major → fix check round 1: 1 major.
- **Response:** both corrections are in the PRD and privacy page. An exact copy of each reviewed file precedes the
  repairs in `adversarial-review/`: `prd-verification-pass1-round1.md` (`30eb91512aad…`) and
  `privacy-policy-verification-pass1-round1.tsx` (`e6588cbfd64b…`). Both rendered pages matched the appendices.
  The 18 focused unit tests, lint and type checking passed. The browser rerun awaits runner capacity.
- **Stop reason:** corrections applied. Recommend another focused fix check. Chromium could not be placed while the
  local host was reserved and no runner matched the worktree browser command.
- **Elapsed:** about five minutes, plus source checks of the returned findings.

## 2026-11-20 · Verification · Criteria verification, fix check round 2 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the two approved
  corrections. Fresh read-only Codex reviewer, using both exact before-and-after pairs.
- **Version:** base `d39b39d1`, HEAD `161a600d` and tracked working-tree changes, diff SHA-256 `40cc8aa8ede3…`.
  Reviewed copies: `prd-verification-pass1-round2.md` (`550c2897101d…`) and
  `privacy-policy-verification-pass1-round2.tsx` (`bf7533f2be5c…`). Prompt `prompt-verification-pass1-round2.md`
  (`9f15df1221f6…`) and report `report-verification-pass1-round2.md` (`d2a15d2f27b1…`).
- **Closure:** round 1's audit metadata and Google username finding closed. The account-deletion passage now
  distinguishes access from record retention. The session expiry rule still needs to reach the GitHub disclosure.
  The reviewer found that the page markup and both appendices match.
- **Findings by verified grade:** 1 minor, failing source accuracy (Implemented Criterion 3).
- **Approved disposition (Owner, 2026-11-20):** F1 fix (minor). Apply the last-save expiry rule to a pending
  GitHub sign-in, identify when a subsequent OAuth callback clears the pending profile and token, and state when
  expired session rows are removed. `redirect_to_signup` writes the pending data, the browser callback returns a
  redirect, and `stash_state` can save that same session before a later callback reaches `pre_social_login`.
- **Trend:** criteria pass 1: 3 major → fix check round 1: 1 major → fix check round 2: 0 major.
- **Response:** corrected the disclosure and its grounding. The updated passage matches Appendix A. All 18 focused
  unit tests passed, along with lint and type checking. The Chromium rerun still awaits a runner.
- **Stop reason:** correction applied. The Owner closed the fix-check rounds after the minor wording correction and
  approved the second complete pass (2026-11-20).
- **Elapsed:** about five minutes, including source verification.

## 2026-11-20 · Verification · Criteria verification, pass 2 (limit reached)

- **Rubric:** the complete work unit and every implemented and proven-live success criterion. Fresh read-only Codex
  reviewer, with the task-list verification evidence and criterion marks withheld.
- **Version:** base `d39b39d1`, HEAD `161a600d` and tracked working-tree changes, diff SHA-256 `5295d30d86c3…`.
  `prd-verification-pass2.md` (`6c416ec2b49a…`), `privacy-policy-verification-pass2.tsx` (`9b4aecad1b6a…`),
  `terms-of-service-verification-pass2.tsx` (`40a67d2ccb3a…`), prompt `prompt-verification-pass2.md`
  (`6b8df8da5361…`) and report `report-verification-pass2.md` (`7443f393bb8d…`).
- **Findings by verified grade:** 2 major and 4 minor. All checked against source. The reviewer matched both page
  components to their appendices. The exact-subject Chromium rerun still awaits an eligible runner.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major, Criterion 3). Allauth saves the session with the pending GitHub profile and token when it
      consumes OAuth state. If the later callback returns a server error, Django skips the save that would clear
      the pending data. Qualify the disclosure and its grounding.
    - F2 fix (major, Criterion 3). Django admin uses `q` for searches, including account names and addresses. The
      normal request logger redacts `query` but preserves `q`. Disclose admin search logging in the policy and map,
      and capture normal admin search redaction as a follow-up.
    - F3 fix (minor, R1). Both public pages inherit OAuth error navigation and the profile-read renewal failure
      redirect. Keep both pages public through those code paths and cover error queries and rejected credentials.
    - F4 fix (minor, Criterion 3). `User.updated_at` timestamps full saves of the user record. Email verification
      can change `EmailAddress.verified` without saving `User`. State the timestamp's scope.
    - F5 fix (minor, Criterion 3). Google and GitHub social sign-ups bypass password-account verification and
      welcome email. Qualify the policy and grounding accordingly.
    - F6 fix (minor, testing strategy). The legal journey reaches signed-out Home before either legal page. Scan
      Home with axe after readiness as the strategy requires for every distinct reached page.
- **Shared cause:** the policy and grounding map described the usual flow before checking adjacent data and request
  paths, including failed session saves, admin query parameters, and provider-specific account creation.
- **Trend:** criteria pass 1: 3 major → fix check round 1: 1 major → fix check round 2: 0 major → pass 2: 2 major.
- **Response:** applied all six dispositions. The admin search redaction is in the inbox. The four legal-route
  regressions failed before the fix (run `d7b678635bd6467e89a90b76d696b532`). After the fix, all 238 focused tests,
  type checking, lint and formatting passed. All 26 Chromium scenarios passed, including the signed-out Home scan
  and both legal pages (run `6579060d717c40c2825493fcd23fb19d`). Both rendered texts matched the amended appendices.
- **Stop reason:** full-pass limit reached. Corrections applied and checked. Recommend a focused independent fix
  check of the six dispositions.
- **Elapsed:** about twelve minutes, including source verification.

## 2026-11-20 · Verification · Criteria verification, fix check round 1 since pass 2

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the six
  approved corrections. Fresh read-only Codex reviewer, using the exact previous and settled artifacts.
- **Version:** base `d39b39d1`, HEAD `161a600d` and tracked working-tree changes, diff SHA-256 `4d1861315b0f…`.
  Settled copies: `prd-verification-pass2-round1.md` (`b8c79b94e612…`),
  `privacy-policy-verification-pass2-round1.tsx` (`7104b6c8b58e…`) and
  `terms-of-service-verification-pass2-round1.tsx` (`40a67d2ccb3a…`).
  Prompt `prompt-verification-pass2-round1.md` (`b0fc1cd378a6…`) and report
  `report-verification-pass2-round1.md` (`8c8cc6d4b200…`).
- **Closure:** direct entry with an OAuth error and failed renewal leave both legal pages open. The timestamp and
  sign-up email qualifications hold, and both footer journeys scan signed-out Home. The policy already discloses
  admin search logging, and the redaction follow-up is captured. Both rendered texts matched their appendices in
  the reviewer's render probe. The reviewer incidentally saw additional inbox entries, which supplied no evidence.
- **Findings by verified grade:** 1 major, 3 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major, Criterion 3). A canceled OAuth callback consumes state and can save the session before it
      reaches pending-sign-up clearance. Qualify the policy and grounding for cancellation and any failure before
      clearance is saved.
    - F2 fix (minor, R1). A delayed successful provider session read can navigate from either legal page to the
      return path captured at Login. The primary repeated this in Chromium by releasing a held session response
      after each document opened. Keep each document open during sign-in completion, with regression coverage.
    - F3 fix (minor, F2 propagation). Document the deferred redaction alongside the PRD's other logging items
      in Non-Goals and Technical Considerations.
    - F4 fix (minor, Criterion 3). Name the allauth reset request function and mail adapter call in the map's
      password-reset row.
- **Shared cause:** a session save serves both OAuth state and later application data, and settling a provider
  sign-in affects both identity and navigation. Each pair needs its conditions stated separately.
- **Trend:** criteria pass 1: 3 major → 1 → 0; pass 2: 2 major → 1 after the focused check.
- **Response:** applied all four dispositions. Both delayed provider-return regressions failed before the fix
  (run `43521ec31b254dd2a1105b4ea699a984`) and passed after it. All 247 related tests passed
  (run `1ae85e6e789045dd85f27f5a0b1a3b42`) and all 12 Chromium scenarios passed
  (run `28831f2720a34f01b0e33f3cb0c89d58`). In a separate Chromium probe, a completed provider session appeared
  in the navigation bar while each legal route stayed open. Both pages matched their appendices, and lint,
  formatting and type checking passed.
- **Stop reason:** repairs applied and checked. Recommend a focused independent check of these four repairs.
  The full-pass cap is reached.
- **Elapsed:** about seven minutes, including source verification.

## 2026-11-20 · Verification · Criteria verification, fix check round 2 since pass 2

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the four
  approved corrections. Fresh read-only Codex reviewer, with six exact before-and-after pairs.
- **Version:** base `d39b39d1`, HEAD `161a600d` and tracked working-tree changes, diff SHA-256 `e783a0b42c9a…`.
  Reconstructed the previous runtime and strategy files and matched the full prior diff digest (`4d1861315b0f…`).
  The kept before and after copies use `-verification-pass2-round1` and `-verification-pass2-round2`.
  Prompt `prompt-verification-pass2-round2.md` (`c2dc0050882b…`) and report
  `report-verification-pass2-round2.md` (`87ac6ec707d3…`).
- **Closure:** round 1's pending GitHub data, deferred admin search redaction and password-reset send path all
  hold at source. Both legal texts match the appendices. The redirect is fixed after the router commits the legal
  location. Provider sign-in that completes before the commit can still redirect.
- **Findings by verified grade:** 1 minor, failing R1.
- **Approved disposition (Owner, 2026-11-20):** F1 fix (minor). Browser history can reach either legal URL
  while React Router still supplies the Login route to the mounted effects. Both effects can override that choice.
  Guard the provider completion in the auth hook and the signed-in navigation in Login using the current browser
  destination. Cover both pages with the response timed to the history update. The primary reproduced both
  redirects in the real Chromium app with a session reply triggered by the history update and traced the writes
  to the Login effect and the auth hook.
- **Shared cause:** browser history and the committed React route can differ briefly during the transition.
- **Trend:** criteria pass 1: 3 major → 1 → 0. Pass 2: 2 major → 1 → 0.
- **Response:** both auth effects check the live browser destination. The two regression cases failed before the
  fix (run `ac90950ef9ed4aa7bb62d187241445ef`) and passed after it. The Chromium timing probe released the response
  during each footer click's history update. Both paths stayed in place as the signed-in profile appeared, and
  the held documents rendered once released. All 12 smoke scenarios passed
  (run `3b4c8a0b7b514ec98b61997fe9a16334`), and lint, formatting and type checking passed. The first related run
  timed out in an existing auth test while waiting for Library data (run `2d495ca1214f44899fc0795d48deeaee`).
  The unchanged retry passed all 276 tests (run `143afb1c6bcb4a25b060c9d4ce098162`).
- **Stop reason:** the Owner closed the focused rounds on 2026-11-20 after the author verified the final timing
  repair in the reproduced browser ordering. The full-pass cap is reached.
- **Elapsed:** about seven minutes, including source verification.

## 2026-11-20 · Local verification and completion preparation

- The full frontend test, lint and Chromium runs passed earlier in local verification (runs
  `4581dfad20d04033a6c56e6881e6d4df`, `138889fd758741d1a680285640da791c` and
  `e826b4feae7642529c55921adf638c49`). The later corrections have focused evidence in Tasks 4.1.a through 4.1.g.
  The final App regression file passed independently after preserving both the fast-return and pending-route
  fixtures (run `4c3e13e3d24445b18a3ce8e06f8e60c0`).
- ADR-052 is dated and accepted. The branch changes no backend API or generated frontend API files.
- The completion record is prepared. The local smoke scenarios pass, and the CI smoke and merge-day
  source trace and dates remain due before merge. Staging and Google Branding are recorded after deployment.

## 2026-11-20 · Pre-push code review · Author check

- **Version:** base `d39b39d1`, head `7395bb969053b81f18b4b92111ecab00081bdcc6`, aggregate diff SHA-256
  `556492be75ec…`. Reviewed the branch scope, integration, documentation, cleanup, and error handling.
- **Findings by verified grade:** 1 minor. A pending account action can override either legal destination,
  failing R1.
- **Evidence:** on the worktree's real Chromium app, held a response at the network boundary until each legal
  page opened. Password sign-in took both pages to Watchlist. Registration and logout took them to Login.
  Email verification and password reset rewrote both addresses to Login while the legal document remained on
  screen. The latter two probes dismissed the pending dialog before following the footer link. All ten
  combinations used synthetic account data and intercepted replies.
- **Approved disposition (Owner, 2026-11-20):** protect the selected legal destination at completion of
  password sign-in, registration, email verification, password reset and sign-out. Keep auth state changes
  and ordinary completion feedback. Preserve sign-out's final session reconciliation. Add focused regression
  coverage and repeat the Chromium probes on both destinations.
- **Response:** applied the fix to all five actions. Registration, verification and reset give completion feedback
  on the legal page. Sign-out reloads that page for the fresh session read. The five browser regressions failed
  before the fix (runs `5653fb2dab8840a399a4c2fdad411e90` and `c1d07b3d87094f0180bff302a1986ff0`) and passed
  afterward. Repeated all ten Chromium probes successfully. The 238 related tests passed
  (run `261e85a2bd38455e933ca84bd2cdb846`), as did type checking, lint and formatting. The first combined browser
  run hit the worktree's registration rate limit (run `8260dd3c95c74440bba3aa0d43403574`). Cleared the single
  worktree registration throttle key and reran the unchanged suite. All 17 scenarios passed
  (run `5959dbaf44ac4fcfbf0002eb21dded51`).
- **Stop reason:** repair verified and committed on the Owner's approval in `e2b07d41`. Both Git hooks
  passed. Awaiting a decision on the independent pre-push review of the full branch diff.

## 2026-11-20 · Code review · Pass 1, delegated agent (local)

- **Rubric:** standard code review over the complete branch diff, with the project review guidelines. The
  independent reviewer considered all six dimensions and all 35 changed files using source, locked dependencies,
  and lightweight probes. The author report and personal notes were withheld.
- **Version:** base `d39b39d16bc079565b7887cb6b42d0d59a3716ac`, head
  `e2b07d41265ba67f079124c374ad0b291ca47c69`, diff SHA-256
  `a526d395d987762f12b0915cbd203779496a208eb7658e69c27d558117eb7f43`.
  Prompt `prompt-code-pre-push-pass1.md` (`19142e374828…`), report `report-code-pre-push-pass1.md`
  (`4c364a852489…`). The head and diff digest matched after review.
- **Findings by verified grade:** 1 major, 1 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major, correctness, compatibility and verification). Failed credential renewal on a legal page
      clears stored tokens but skips the full load that resets cached authentication. The primary signed in
      with a synthetic password session in Chromium, opened each legal document while an authenticated API
      request was held, then rejected that request and its renewal. Both URLs stayed in place and tokens were
      cleared, while each account menu still showed the old profile. Reuse the same-URL reload on current-session
      renewal failure, under the existing authority check. Cover settled session state and the retained URL.
    - F2 fix (minor, correctness and intent). The renewal endpoint uses Ninja's user throttle, which takes
      `request.user.pk` for a Django session or the IP address for an anonymous request. Django's session and
      authentication middleware still run on the route with `auth=None`, and renewal sends cookies. Describe
      both keys in the policy and its source map.
- **Response:** added the same-URL reload after the interceptor clears current-session credentials. The two
  interceptor cases failed before the fix (run `5a1844c09de64fcdba262cdb385fb031`) and passed afterward.
  The first broader run reproduced an intermittent Library-data timeout (run `23bfdb9697b44cdead9b143fee5e50a6`).
  The unchanged retry passed all 249 tests (run `bb3a071cd0814148ac2667ee383b6b4a`). Type checking, lint and
  formatting passed. The edited privacy paragraph matches Appendix A, and a probe of Ninja's installed
  throttle verified both keys. Chromium could not be placed while the host was reserved
  (runs `6d6b7319f6e345329d4ae8f923cac817` and `6edb9360844942778201e41983fe3ec7`).
  After the host became available, both regression cases passed within the 19-scenario legal, sign-in,
  and sign-up run (`fe713cba3422444f8598a3a1be955753`). The account menu returned to signed-out state while
  each legal URL stayed in place. The Chromium-rendered pages matched both PRD appendices.
- **Stop reason:** both repairs verified. Awaiting Owner approval of the focused independent fix check.
- **Elapsed:** about ten minutes, including author source checks and browser reproduction.

## 2026-11-20 · Code review · Fix check round 1 since pass 1, delegated agent (local)

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the two repairs.
  The independent review covered all seven changed files using the original committed files and current tree.
- **Version:** HEAD `e2b07d41265ba67f079124c374ad0b291ca47c69` plus the tracked working tree. Repair diff SHA-256
  `2a780df882dc43f5f17c2220c03d041afd9efa33d0949b8f1f7ff5170cf9df54`, aggregate SHA-256
  `5f1360741b469d8033a8def73e72eb80a7c0e2c99ed6e20b19429a6a2cf35a4e`. Both matched after review.
  Prompt `prompt-code-pre-push-pass1-round1.md` (`06981d25c945…`), report
  `report-code-pre-push-pass1-round1.md` (`851e6b6375d9…`).
- **Closure:** both fixes withstood the check. The reviewer exercised both renewal paths, saw a reload of the legal
  path with its query and fragment, and confirmed the existing sign-in redirect elsewhere. The reload starts with
  a fresh query cache and session read. The rendered legal paragraph and its map agree on both rate-limit keys,
  which the reviewer verified using the locked throttle. The browser regression source was checked. Task-list
  notes surfaced during a search and were excluded from review evidence.
- **Findings by verified grade:** zero.
- **Trend:** code pass 1 had one major finding. Both findings closed in the focused repair check.
- **Stop reason:** focused check complete. Recommend a second full pre-push pass on the resulting commit because
  pass 1 found a material authentication issue.
- **Elapsed:** about five minutes.

## 2026-11-20 · Code review · Pass 2, delegated agent (local)

- **Rubric:** standard code review over the full branch diff. The independent reviewer considered all six
  dimensions and all 35 changed files. The author report and personal notes were withheld.
- **Version:** base `d39b39d16bc079565b7887cb6b42d0d59a3716ac`, head
  `2dd13a791ce802df6e97afa724b5e9ff4a44144a`, diff SHA-256
  `5f1360741b469d8033a8def73e72eb80a7c0e2c99ed6e20b19429a6a2cf35a4e`.
  Prompt `prompt-code-pre-push-pass2.md` (`fca091474599…`), report `report-code-pre-push-pass2.md`
  (`8c812df49a94…`). The head and diff digest matched after review.
- **Closure from pass 1:** the reviewer confirmed both renewal reconciliation and the two rate-limit keys.
- **Findings by verified grade:** 1 major, 2 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major, correctness, scope and verification). Starting OAuth without a CSRF cookie waits for
      initialization. If the visitor follows a legal link during that wait, the hook can still submit the provider
      form. The primary reproduced this with Google from Privacy and GitHub from Terms in Chromium, intercepting
      the POST locally. Check the live destination before writing OAuth state and submitting the form. Test
      both paths with the CSRF reply held.
    - F2 fix (minor, documentation and verification). The completion summary overstates sign-out. It takes the
      visitor to Login when invoked, and reloads a legal URL if the visitor opens one before the request finishes.
      Narrow the summary to describe that case.
    - F3 fix (minor, correctness and compatibility). Both cold document loads with a percent-encoded hyphen in a
      valid section fragment opened at the top without focusing the heading. The same plain fragments focused
      their headings below the top bar in Chromium. Decode valid section fragments and keep the top fallback for
      malformed or unknown ones. Cover both documents.
- **Trend:** code pass 1 had one major finding. Its focused fix check had zero. Code pass 2 found one major
  issue in OAuth initiation.
- **Response:** added the URL check after CSRF initialization, decoded section fragments, and clarified the
  sign-out summary. Both OAuth tests recorded an unwanted submission before the fix (run
  `91c0f05e0aff43a0b2cd5fae1d0afe71`). Both encoded links missed their target position in Chromium (run
  `d2de27df41d84a8eba9818ff7d999084`). All four passed after the fixes. The browser probe confirmed both provider
  forms and markers were skipped and malformed and unknown fragments opened at the top.
- **Verification:** all 152 related tests (run `bf61310c310242dc8489fd4802d7cd0c`), 232 focused tests (run
  `a03e5b99bb0c4a59aa7bb1e536579562`), and 21 Chromium scenarios (run `399c3a69255d4a20b5c749718bb445a5`)
  passed. Lint, formatting and type checking passed. The existing idle-renewal test timed out in two focused
  runs (`fe025d29247e4178ad5f803b28b19731` and `4ac5507d965f4e398e09cb8b55353a99`) while waiting for the
  Library hook to observe a populated cache. Its test fakes the interval used by that wait, a suspected cause.
  The test passed in isolation (run `be10762c24394c5b8736f087bcae83c8`) and on the unchanged focused rerun.
- **Stop reason:** the approved repairs are verified locally. Awaiting Owner approval of a focused independent check.
- **Elapsed:** about eight minutes, including author source checks and browser reproduction.

## 2026-11-20 · Code review · Fix check round 1 since pass 2, delegated agent (local)

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the three
  repairs. The fresh reviewer compared the before and after of all seven changed files and used lightweight
  source probes. Whole-branch source supplied context.
- **Version:** HEAD `2dd13a791ce802df6e97afa724b5e9ff4a44144a` plus the tracked tree. Repair diff SHA-256
  `9f301f850ca3ac422915b0a1959d50493494581fd3b5ed8ed314c51061987d8d`, aggregate SHA-256
  `c469007b4d0709b253e3520850766feb6b5479b8917e4764d3f1550d633023ad`. Both matched after the check.
  Prompt `prompt-code-pre-push-pass2-round1.md` (`a4266e90da0c…`), report
  `report-code-pre-push-pass2-round1.md` (`40663b5217f3…`).
- **Closure:** OAuth initiation skips the form and markers on both legal routes and retains the normal Login
  flow. Both encoded section links resolve and focus their legal headings. The sign-out wording and OAuth
  guidance need the remaining precision and propagation below.
- **Findings by verified grade:** 3 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (correctness and failure behavior, verification quality, R1 and R3). Fragment lookup runs in the
      whole page. In Chromium, an encoded ID for the wide navbar's Search films control gave that control
      focus through the document's effect. Limit resolution to headings in the current legal document. Add a
      browser regression for an encoded ID that belongs to the shared layout.
    - F2 fix (repository contract coherence). The wording implies that opening a legal page any time during
      sign-out is enough to cause a reload. The final branch in `useAuth.logout` reads the current pathname.
      Say that sign-out opens Login, then reloads a legal URL if that URL is open when the request settles.
    - F3 fix (repository contract coherence). The OAuth endpoint section contains a copyable example that
      submits the form after CSRF setup without checking the current URL. Point the initiation example to
      the existing hook example in Frontend Integration and retain the endpoint contract table.
- **Trend:** code pass 1 had one major, then zero in its fix check. Pass 2 had one major, then zero in this
  fix check. The complete passes found different authentication failures. This round found one minor
  fragment behavior issue and two documentation corrections.
- **Response:** scoped fragment lookup to the current document's h2 and h3 headings. The new browser regression
  recorded focus on the navbar search box with the document still scrolled down (run
  `7d87e54496444c699c702043ed5762a0`). It passed after the fix, as did both encoded section links. A separate
  cold-navigation probe confirmed both routes open at the top for encoded navbar IDs, malformed fragments, and
  unknown sections. The sign-out summary names the page open at settlement. The OAuth endpoint section points
  to the existing hook example.
- **Verification:** all 26 related tests (run `1c0e6d66dc1a481f9608f38889668b04`) and 15 legal-page Chromium
  scenarios (run `510e574f48214f489ccc9b031d4f02de`) passed. Lint, formatting and type checking passed, and the
  authentication guide's link points to its existing OAuth Flow Implementation heading.
- **Stop reason:** the approved repairs are verified locally. Awaiting Owner approval of a focused follow-up
  check because the heading lookup changes behavior.
- **Elapsed:** about five minutes, including author source checks and browser reproduction.

## 2026-11-20 · Code review · Fix check round 2 since pass 2, delegated agent (local)

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the three
  follow-up repairs. Source inspection and lightweight probes covered the exact five-file repair delta.
- **Version:** HEAD `2dd13a791ce802df6e97afa724b5e9ff4a44144a` plus the tracked tree. Predecessor SHA-256
  `9f301f850ca3ac422915b0a1959d50493494581fd3b5ed8ed314c51061987d8d`, follow-up patch SHA-256
  `c044b242ff58b73a1bebb23baf23b1931949d267d613517d0ae0ffdf13797e87`, current tracked diff SHA-256
  `62fcfbcc2e7f4fbfbc20ab1d064d3a092a9b13a0acd2b42d10da4b4cd64ae9d5`, and aggregate SHA-256
  `f965724fc5eda3a6b222f392ce2980a5c285674ed12cea6f456fd5321941699d`.
  The predecessor was reconstructed and matched its earlier digest. The other digests matched during the review
  and the reverse-apply check passed. Prompt `prompt-code-pre-push-pass2-round2.md` (`b6946bd64c21…`),
  report `report-code-pre-push-pass2-round2.md` (`5322a5b1af6b…`).
- **Closure:** valid fragments resolve only to legal headings. The sign-out condition matches the live route at
  settlement. The endpoint guide points to the guarded OAuth hook.
- **Findings by verified grade:** 2 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (correctness and failure behavior, repository contract coherence). The hook prose and 4.1.j imply
      that opening a legal page at any point during CSRF setup cancels submission. `initializeOAuth` reads
      `window.location.pathname` after setup and returns before constructing the form if a legal route is open
      then. State the timing in both places. The guard and settled behavior need no runtime edit.
    - F2 fix (repository contract coherence). The sign-out completion summary and the 4.1.k fragment summary
      describe supported behavior without naming its source actors. Name `logout` in `useAuth` and
      `LegalDocument`, consistent with the source-grounding method's actor rule.
- **Trend:** code pass 1 found one major, then zero in its fix check. Pass 2 found one major, then zero in each
  focused round. Round 2 leaves documentation precision and attribution only.
- **Response:** the authentication strategy and 4.1.j describe the live URL check after CSRF setup.
  The completion summary names `logout` in `useAuth`, and the task summaries name `LegalDocument`.
- **Verification:** traced each revised claim through its named source. Markdown lint passed on all three
  changed documents, `git diff --check` passed, and the frontend diff matched the independently checked version.
- **Stop reason:** both wording corrections are verified. The Owner agreed to end the focused rounds and
  proceed toward a complete pass on the resulting commit. The Owner approved commit `6efefdef`, and the
  committed repair diff matched the verified seven-file batch. Approval of the complete pass is pending.
- **Elapsed:** about six minutes including exact predecessor reconstruction and source checks.

## 2026-11-20 · Code review · Pass 3, delegated agent (local)

- **Rubric:** standard code review across all six dimensions and all 37 changed files. The independent runner
  inspected source and used lightweight probes, with the author records and verification evidence withheld.
- **Version:** base `d39b39d16bc079565b7887cb6b42d0d59a3716ac`, head
  `6efefdef7c8c2656c895b691304b1de21379d0f8`, diff SHA-256
  `dd4935ff3ceb45b55d61fdf5d21c3ccbae637ed493a5fa2b35ee8a8039a5944e`.
  Prompt `prompt-code-pre-push-pass3.md` (`50938d3df753…`), report
  `report-code-pre-push-pass3.md` (`61d0d849be84…`). The head, digest and clean tracked state matched.
- **Closure from pass 2:** the reviewer found the OAuth initiation guard, encoded fragment lookup, sign-out
  settlement wording and guarded OAuth example in place. Both rendered bodies matched their appendices in
  the reviewer's source comparison.
- **Findings by verified grade:** 2 major, 2 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major, trust boundaries and compatibility). An incomplete Google sign-up can persist access and
      refresh tokens in the database-backed session although tokens are disabled for linked accounts. With allauth
      65.21.1, the primary used a synthetic Google response without an email and fixture tokens. The real headless
      flow returned HTTP 302 and left both tokens in the modified session. Django middleware saves a modified
      nonempty session for that response. The probe made no provider call and wrote no session row. Amend the
      rendered policy and Appendix A to distinguish linked-account storage from pending sign-in, with its clearance
      and expiry. Correct Appendix C for both profile intake paths and pending session storage.
    - F2 fix (major, correctness and verification). The Login signed-out notice can replace the new legal URL
      with Login when the anonymous read settles before the router commits the legal route. In Chromium, with the
      session reply held, an ordinary click with a slow legal import settled cleanly. A controlled history-first
      transition using each real footer href reproduced the overwrite for both destinations. Limit signed-out
      notice cleanup to its live Login entry and add regressions for both destinations. The existing logout
      browser case covers the earlier logout request and does not reach this notice cleanup.
    - F3 fix (minor, correctness and verification). Keyboard activation of either Home footer link left focus
      on the persistent footer. The next Tab scrolled down again in Chromium. Give the document's opening heading
      focus on ordinary in-app arrival and cover both keyboard journeys. Keep the existing anchor and fallback
      positioning.
    - F4 fix (minor, scope and maintainability). The retention section and map imply tracking records and entries
      are kept until account deletion. The authenticated record and entry deletes and the record's cascading
      relationships support deletion while the account remains. Amend the rendered retention paragraph and
      Appendix A to describe remaining records, and cite the deletion paths in Appendix C.
- **Trend:** pass 1 found one major (focused check zero), pass 2 found one major (both focused checks zero), and
  pass 3 found two major. The sign-out notice is another navigation writer that outlives its route, like the
  delayed OAuth submit. The Google session persistence is a separate disclosure error. Neither calls for a new
  design to correct.
- **Response:** corrected the rendered privacy policy and its map, collecting the shared pending sign-in rules
  under retention. `Login` checks the live browser URL before clearing the signed-out notice and preserves the
  history entry metadata. `LegalDocument` focuses its title on fresh in-app navigation without a fragment.
  The four browser cases failed before the repairs (run `ef8af36de62a4fe39b536cf1e07a1556`).
- **Verification:** all 24 related Chromium scenarios passed after the repairs (run
  `9b51b64241d6479993fe7030c7b5e660`), including 17 in the legal spec. The rendered policy and terms matched
  their appendices in order, including link destinations, text formatting and the cookie table.
  The first related unit run exposed the signed-out notice fixture's unsynchronized mock browser location.
  With the fixture aligned, all 143 tests passed (run `b51e78a8feb44e5f83ea4a6e6252e0d1`). ESLint passed after
  using React Router's navigation enum. Formatting, Markdown lint and type checking passed (type-check run
  `60a908987d874601a56b462a6b62a855`).
- **Stop reason:** the four approved repairs are verified locally. Awaiting Owner approval of the focused
  independent fix check.
- **Elapsed:** about ten minutes including the independent pass and primary source and browser probes.

## 2026-11-20 · Code review · Fix check round 1 since pass 3, delegated agent (local)

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across all four
  repairs. The independent reviewer checked the nine-file delta, its source paths and whole-branch context.
- **Version:** HEAD `6efefdef7c8c2656c895b691304b1de21379d0f8` plus the tracked tree, repair diff SHA-256
  `67a2fcc854cfadc2b47a041e4481caba7790f7312c9b3b44ff9e1e77f11d587c`, aggregate SHA-256
  `d9cd68d40fbf3eec0da3a13eee6ce6fefa5704e04d88954a288c43517790deea`. Both digests matched.
  Prompt `prompt-code-pre-push-pass3-round1.md` (`d7c5643c819e…`), report
  `report-code-pre-push-pass3-round1.md` (`332dac3e570c…`).
- **Closure:** pending Google session storage and the shared session rules hold at source. The signed-out URL
  guard preserves both destinations and the normal notice. Keyboard focus and valid fragments resolve within
  the document. The tracking deletion descriptions match the authenticated entry and record deletes.
- **Findings by verified grade:** 1 major, 2 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (major, correctness and repository contract coherence). The signed-out Home line and R9 still
      state receipt of the name, email and basic profile without the policy's qualification. The locked
      `SocialLogin._lookup_by_socialaccount` matches provider and ID before the email fallback, so
      `_authenticate` can sign in an existing linked account when the response lacks an email. Qualify
      the signed-out Home wording and its test and R9. Scope D6's pending sign-in summary to new accounts
      for both providers.
    - F2 fix (minor, verification quality). In a local Chromium probe, the timing test's navbar and footer
      conditions passed and the Privacy page opened while the Login module was still held. Wait for the
      Login view to mount before changing history. Confirm it stays mounted through the anonymous
      update while the browser is on the legal URL, then deliver the router transition. Show that the
      stronger cases fail with the guard removed and pass with it restored.
    - F3 fix (minor, correctness). Undo sends prior field values from its toast, but it carries no change-row
      identity. `record_changes` can remove the latest differing row for that film and field. Distinct
      toast IDs and the account-change guard allow an older toast from the same signed-in account to run.
      Qualify both rendered statements and their PRD source rows so they describe the latest relevant row.
- **Trend:** pass 1 found one major, then zero. Pass 2 found one major, then zero in both focused checks.
  Pass 3 found two major, and this focused check found one major in propagation of the intake disclosure.
- **Response:** qualified the Home disclosure, scoped pending provider sign-in to new accounts in D6, and updated
  the Undo wording and source map. The revised timing tests require the Login title before the browser URL changes
  and after the anonymous session read, while the router is still on Login.
- **Verification:** the revised Home test failed on the previous wording (run `24f2667d52eb40e084eb0f49a6814ed2`).
  Both strengthened browser tests confirmed that Login was mounted and then caught the overwritten URL with the
  guard removed (run `ed51bfb70c024d779aed34ba8c39199f`). The original guarded file was restored byte for byte.
  All 160 related tests (run `c1d3acd7f1c04c83bdfa81104adbb8dc`) and 17 legal-page Chromium scenarios (run
  `c7babeda76a14f529cf238ecd7ae886c`) passed. Both rendered documents matched their appendices, and rendered
  Home text and its link matched R9. Lint, formatting and type checking passed.
- **Stop reason:** the three approved repairs are verified locally. Awaiting Owner approval of the focused
  follow-up check.
- **Elapsed:** about eight minutes including primary source and browser confirmation.

## 2026-11-20 · Code review · Fix check round 2 since pass 3, delegated agent (local)

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across the three
  follow-up repairs. The independent reviewer checked the exact seven-file repair delta and its dependencies.
- **Version:** HEAD `6efefdef7c8c2656c895b691304b1de21379d0f8` plus the tracked tree. Predecessor SHA-256
  `67a2fcc854cfadc2b47a041e4481caba7790f7312c9b3b44ff9e1e77f11d587c`, follow-up patch SHA-256
  `6894abdcc00768c2a4b8d1d87cfaa69665d2032c5794683e8e8d8fc4c85ba46f`, current tracked diff SHA-256
  `cc8cf350cc35d620148f80e2acfb678a85ffe66dbaeffcb562498f2fab7f739e`, and aggregate SHA-256
  `97b2625b74e92acb87841fe6175736f2e5901ab5783ee954b3d9c46ab69509b6`.
  The predecessor matched its earlier digest after reconstruction. The current digests matched after review.
  Prompt `prompt-code-pre-push-pass3-round2.md` (`a5a70fcb2d8c…`), report
  `report-code-pre-push-pass3-round2.md` (`3d47a56ab9c2…`).
- **Closure:** Home, its test and the requirement agree with the qualified disclosure. The signed-out notice
  tests wait for the mounted Login view through the anonymous session update. An isolated check of the
  guard preserved both legal URLs. Both policy passages and maps describe the latest change to the restored
  mark or rating. The independent reviewer checked both guarded and unguarded outcomes in memory.
- **Findings by verified grade:** zero.
- **Trend:** code pass 1 had one major, then zero. Pass 2 had one major, then zero in both focused rounds.
  Pass 3 had two major, then one in the first focused check and zero in this round.
- **Stop reason:** the focused repairs held. The Owner approved commit `d0b3fe2c`, and the committed repair diff
  matched the verified twelve-file batch. Recommend a new complete pre-push review of the resulting head
  because the last complete pass found two major issues. Approval of the complete pass is pending.
- **Elapsed:** about five minutes including predecessor reconstruction.

## 2026-11-20 · Code review · Pass 4, delegated agent (local)

- **Rubric:** standard code review over all 37 changed files and all six dimensions. The Owner requested a
  fresh Astra reviewer at xhigh. The reviewer had the tracked source and pinned scope, with author evidence
  withheld.
- **Version:** base `d39b39d16bc079565b7887cb6b42d0d59a3716ac`, head
  `d0b3fe2c1af167d905ed2a1e943c5d9c6e251ef0`, diff SHA-256
  `97b2625b74e92acb87841fe6175736f2e5901ab5783ee954b3d9c46ab69509b6`.
  Prompt `prompt-code-pre-push-pass4.md` (`5b9573f28a36…`), report
  `report-code-pre-push-pass4.md` (`c6cccfbe311c…`). The head, clean tracked state and digest matched.
- **Closure from pass 3:** both page bodies matched their appendices. Google profile intake and pending session
  storage, Home's provider wording, tracking deletion and Undo, keyboard title focus and the signed-out URL
  cases held.
- **Findings by verified grade:** 3 major, 2 minor.
- **Approved dispositions (Owner, 2026-11-20):** correct the published privacy wording, applicable PRD
  summaries and Appendices A and C. Apply these corrections as one batch and verify the rendered text.
    - F1 fix (major, trust boundaries and compatibility). The public API documentation loads styles and script
      from jsDelivr and declares favicons hosted by Django Ninja. Production exposes the path through Caddy.
      The worktree HTTP response contains both hosts, and a Chromium probe using a separately fetched public
      bundle confirmed jsDelivr is requested. The probe intercepted the browser's external requests.
      Disclose the requests and their IP and browser data, and correct the source map's external-host inventory.
    - F2 fix (major, correctness and failure behavior). Allauth registers `EmailAddressAdmin`.
      `EmailAddress.__str__` returns the address. Django copies it into the administrator's audit event on a
      direct edit or deletion. The event can survive deletion of the affected account. Add the address to the
      Google, audit and account-deletion disclosures and their grounding.
    - F3 fix (major, trust boundaries and compatibility). The locked allauth `record_authentication` stored
      both fixture provider IDs, provider names, timestamps and the local account ID in a database-session
      payload. No database row was written by the probe. Django's normal provider login keeps those fields
      and the session model has no user foreign key. Include the identifiers in the provider and session
      disclosures and explain the retention already described after account deletion.
    - F4 fix (minor, correctness and failure behavior). The navbar passes the search page's query through
      the sign-in return path. The allauth provider stores it in redirect state and saves the database session.
      The callback consumes state, and later attempts can prune old state. Unused state may remain until the
      session is cleared, even when it can no longer be used. Incomplete signup may also serialize the return
      path with the pending login. Disclose search text in the return address and describe both lifetimes.
    - F5 fix (minor, correctness and failure behavior). Caddy proxies `/static/*` to Django. The request
      logger runs before WhiteNoise and logs requests for Django-served assets, including admin files.
      Restrict the asset exemption to files served directly by Caddy and correct the source map.
- **Trend:** the first three complete passes found one, one and two major issues. Pass 4 found three major.
  All five findings in this pass concern disclosure accuracy. The prior behavioral repairs held.
- **Response:** updated the rendered policy, Appendix A, Appendix C and the affected PRD summary. The return
  address disclosure distinguishes the ten-minute usable window, the stored attempt's cleanup and the address
  copied with an incomplete signup. Both providers' disclosures name the identifiers that can remain after
  account deletion. The admin audit paragraph and deletion summary include email addresses. The documentation
  lists its external asset hosts, and the asset logging language names files served by Django and Caddy.
- **Verification:** all 23 related tests (run `c9465ebcff13465782c52820b80d848c`) and 17 Chromium scenarios
  (run `5ae1fb87b9c14d16bfdf04e57c25560a`) passed. Both rendered texts matched their appendices, including
  the cookie table, inline emphasis and links. An in-memory probe through the installed `stash_state` and
  `unstash_state` confirmed that the expired attempt's return address can remain stored and that a matching
  callback or a later sign-in prunes it. Lint, formatting and type checking passed (type-check run
  `729ac9d4031d49e4823d81bc9c0e0b96`).
- **Stop reason:** the Owner agreed to make pass 4 the last full pre-push pass. The five corrections are verified
  locally. Awaiting Owner approval to run the focused independent source and wording check.
- **Elapsed:** about nine minutes including independent review and primary source and local probes.

## 2026-11-20 · Code review · Fix check round 1 since pass 4, delegated agent (local)

- **Rubric:** closure, behavioral grounding, propagation and completeness, and new failure across all five
  disclosures. The reviewer checked the exact three-file delta and traced reachable production and dependency
  paths with lightweight read-only probes.
- **Version:** HEAD `d0b3fe2c1af167d905ed2a1e943c5d9c6e251ef0` plus the tracked tree. Repair SHA-256
  `07cb7b0d623b9e807f651e299e633e4805a25caf9adf086d6416aa6f421d2209`, aggregate SHA-256
  `d07959375bebb58d669f4226dc83e0f5ff1fcfeac3baa91f9ed2d5b4fd93b88e`. Both matched after review.
  Prompt `prompt-code-pre-push-pass4-round1.md` (`f9d635c9900e…`), report
  `report-code-pre-push-pass4-round1.md` (`1e871071a8ce…`).
- **Closure:** the disclosed hosts, retention of admin email data and provider session identifiers, return-address
  lifetime, and Django-served static file logging held. The reviewer compared both policy texts with their
  appendices before and after the repairs.
- **Findings by verified grade:** 3 minor.
- **Approved dispositions (Owner, 2026-11-20):**
    - F1 fix (correctness and failure behavior). The locked `EmailAddressAdmin.make_verified` calls
      `EmailAddress.set_verified`, emits a signal, and does not call Django's log methods. Scope the
      public statement to the standard add and edit forms and delete action. Name the bulk action's
      separate save path in Appendix C.
    - F2 fix (correctness and failure behavior). The map's universal request-log claim misses the
      production console handler's `HealthCheckFilter`. A fixture probe suppressed routine start and
      success lines for a health check and passed the Django admin asset request. Qualify D6 and
      Appendix C while retaining the Django and Caddy asset boundary.
    - F3 fix (repository contract coherence). The Google-account-ID map entry calls it the provider ID.
      Allauth passes both `provider` and `uid` in `record_authentication`. Name `uid` as the Google
      account identifier in the affected row.
- **Trend:** passes 1 through 4 found one, one, two and three major issues. The focused check after pass 4
  found zero major issues and three wording or attribution refinements.
- **Response:** scoped the audit disclosure to the standard forms and delete action, named the allauth
  bulk verification path in Appendix C, documented the health-check log filter in D6 and Appendix C,
  and identified Google's account ID as `uid` in the session record.
- **Verification:** traced the wording to the installed allauth and production logging paths. Chromium
  matched both rendered documents to their appendices. All 23 related Vitest tests
  (`fcd87333cf1641dca8c85a6f8a6ee718`) and 17 legal-page Chromium scenarios
  (`ba0e0d531ba1493da962ade51c630dcd`) passed. Type checking
  (`c7d66786c0da4ccdadbf45f967868473`), lint and formatting passed.
- **Stop reason:** the Owner approved closing the focused rounds after these corrections and targeted
  verification. Pass 4 was the last full review. The corrections await commit approval.
