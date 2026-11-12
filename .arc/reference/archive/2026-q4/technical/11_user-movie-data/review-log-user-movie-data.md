# Review Log: user-movie-data

> _Pass and fix-check record for this work unit's planning reviews, kept here until the task list exists; task
> generation copies the entries into the task list's `## Review Log`._

## Design review — pass 1 (2026-11-10)

- **Artifact:** `.arc/backlog/technical/draft-user-movie-data.md` (Class Heavy, pass cap 2). Kept version:
  `adversarial-review/draft-pass1.md` (sha256 `98eb95d1a822cdd02df527f5681dc43c959633700f738d0dc66295cdd0c65d58`).
- **Rubric:** assess-draft-readiness divergence, assess-design-proportionality, design-audit, source-grounding
  (artifact scope).
- **Runner:** fresh general-purpose subagent (Claude Code), read-only by prompt; report verdict names it `independent`
  with no session files loaded. Prompt `adversarial-review/prompt-draft-pass1.md` (sha256
  `dc3db373aaece2a1037e4f722dd2bf7a31194769626dba949a80a31dd4123b4e`, role prompt); report
  `adversarial-review/report-draft-pass1.md` (sha256
  `fe36fe6204f106b0a432879df12f35703f8c6764a887382d56fa911b90c02d0e`, role report).
- **Elapsed:** sent 1:36 pm CT, returned 1:59 pm CT (about 23 minutes); verification and disposition to 2:10 pm CT.
- **Counts by verified grade:** 4 major, 11 minor, 0 not supported. Every finding's origin: the original artifact.
- **Approved dispositions** (Owner, 2026-11-10, "agreed on all"):

  | # | Grade | Finding | Action |
  | --- | --- | --- | --- |
  | F1 | major | ADR changes recorded as amendments where the rules call for supersession in part | FIX (local correction) |
  | F2 | major | Nightly prune can cascade-delete a record a user just saved | FIX (new design) |
  | F3 | major | Prune and the save-side retry serve no stated goal | FIX (new design) |
  | F4 | major | A movie TMDB removes keeps its content forever, with no alert | FIX (new design) |
  | F5 | minor | What happens to a record left with no state is unstated | FIX (local correction) |
  | F6 | minor | `sort=rating` doesn't say whose rating | FIX (local correction) |
  | F7 | minor | Review constraint breaks admin saves of records without a review | FIX (local correction), full scope |
  | F8 | minor | Seven inexact symbol and behaviour claims | FIX (local correction), full scope for (c) |
  | F9 | minor | Strategy and overview docs still teach the removed repository, routes and schema | FIX (local correction) |
  | F10 | minor | Scope keeps an `HttpError` in a method this change edits | FIX (local correction) |
  | F11 | minor | TMDB test seam unnamed | FIX (local correction) |
  | F12 | minor | Named mapping turns an unknown runtime into 0 | FIX (local correction), full scope |
  | F13 | minor | One transient error fails the night; an outage can hold the operations lock for hours | FIX (new design), full scope |
  | F14 | minor | Interim watchlist page shows only its first 100 | FIX (local correction) |
  | F15 | minor | Decision 7 credits ADR-026 with the page-number choice | FIX (local correction) |

  Open questions settled with the recommendation: F1 one new ADR superseding ADR-026 and ADR-025 in part; F4 a movie
  TMDB removes is cleared to its title with its users' records kept; F5 records left with no state are kept; F14 the
  100-item interim cap accepted.
- **Shared causes:**
  - Decision 9 never stated which rows the job keeps fresh or what becomes of a row it can't refresh: F2, F3, F4
    (major) and F13 (minor). Fixed at the cause: refresh every row and delete none, clear a 404 row to its title,
    alert on a row more than seven days past its last refresh, stop after ten failures in a row. Proportionality:
    proportionate (four cases walked: a save mid-run, one timeout, a whole-run outage, a removed movie at day 1 and
    month 7).
  - ADR dispositions not checked against the ADR text and tier rules: F1 (major) and F15 (minor). All eleven `_ADR:_`
    lines rechecked; the other nine hold.
- **Folds landed:** 2:17 pm CT. Settled version for the fix check: `adversarial-review/draft-pass1-round1.md` (sha256
  `cb9421aff1d83b097f2c609df0b2f4867fc175719d6a804ac786fe7eb3fd38b8`). Lint clean.
- **Author fold-grounding corrections:** none beyond the approved actions. Grounded at fold scope: `MovieService`
  takes `tmdb_client` (`movie_service.py:63`); `tmdb_test_builders.py` exists; no code path deletes a `Movie` row
  outside the admin; `Movie.title` is required and `poster_path`/`release_date` nullable; Django 5.2.19's
  `TextField.formfield` sets no `empty_value`.
- **Convergence:** not converged (approved fixes of confirmed major findings).
- **Conditional decisions:** fix check, round 1 since pass 1, approved; pass 2 (limit reached) approved, pending
  until the fix check resolves.
- **Stop reason:** none yet; the loop continues.

### Design review — fix check, round 1 since pass 1 (2026-11-10)

- **Kept versions:** `adversarial-review/draft-pass1.md` → `adversarial-review/draft-pass1-round1.md` (sha256
  `cb9421aff1d83b097f2c609df0b2f4867fc175719d6a804ac786fe7eb3fd38b8`).
- **Rubric:** closure, behavioral grounding (source-grounding at fold scope), propagation and completeness, new
  failure.
- **Runner:** fresh general-purpose subagent, read-only by prompt; verdict names it `independent` (fold scope), loading
  only the prompt-named kept version under `.arc/user/`. Prompt `adversarial-review/prompt-draft-pass1-round1.md`
  (sha256 `4c7ac4135d651df42b28b72b1b8a752520fade24c58ffee12019df572b0121fb`, role prompt); report
  `adversarial-review/report-draft-pass1-round1.md` (sha256
  `10450f08f33d06928e7341c356f0fc414492160063af331b6a8232d7d493e51a`, role report).
- **Elapsed:** sent 2:18 pm CT, returned 2:34 pm CT (about 16 minutes).
- **Counts by verified grade:** 2 major, 6 minor, 0 not supported.
- **Approved dispositions** (Owner, 2026-11-10, "agreed as recommended"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | major | Library's null `next_tmdb_page_start` reads as end of results under strategy-pagination | original artifact | FIX (local correction) |
  | F2 | major | Removed movie keeps its TMDB title indefinitely while the draft claims the six-month limit | pass-1 F4 fold | FIX (new design) |
  | F3 | minor | Ten-in-a-row stop doesn't bound the lock; broad-404 fault clears the catalogue | pass-1 F4/F13 fold | FIX (new design), full scope |
  | F4 | minor | Nightly logs discarded on zero-exit nights | pass-1 F4/F13 fold | FIX (new design), full scope |
  | F5 | minor | New card mapping skips the empty-release-date normalization | pass-1 F12 fold | FIX (local correction), full scope |
  | F6 | minor | ADR-026 supersession names content ADR-026 never decided | pass-1 F1 fold | FIX (local correction) |
  | F7 | minor | "Only the admin deletes a Movie row" overstates the guarantee | pass-1 F2 fold | FIX (local correction) |
  | F8 | minor | Named document lists leave further stale sites and dead `batch.py` | pass-1 F9/F8(a) folds and original | FIX (local correction) |

  Decisions settled: removed-movie policy (C), a 404 is an ordinary failure, the seven-day check alerts, and a person
  settles it in the admin (replacing pass 1's clear-to-title choice); re-entry offer declined; fix check round 2
  approved; pass 2 stays approved, pending until the rounds converge.
- **Shared causes:**
  - Decision 9's job contract (which rows it keeps fresh, what bounds it, what a row it can't refresh becomes, what a
    clean night records): pass 1 F2, F3, F4 (major), F13; round 1 F2 (major), F3, F4. Material findings in **two
    looks** (pass 1, round 1); a third stops the loop for the Owner. Fixed at the cause: the contract written first
    (seven-day guarantee read from a new `refreshed_at`, stalest first, 20-minute budget, every failure including a
    404 leaves the row unchanged, journal kept every night, stale IDs printed last). Proportionality: proportionate.
    Re-entry valve offered (derivation signal: one locus needing new design twice) and declined.
  - Removal propagation stated as site lists rather than a rule: pass 1 F9, F8(a); round 1 F8. Fixed at the rule.
  - ADR line precision: pass 1 F1 (major), F15; round 1 F6.
- **Folds landed:** 2:44 pm CT. Settled version for round 2: `adversarial-review/draft-pass1-round2.md` (sha256
  `f5cbff95022fadcc54741ff30ae200b8d873a96dc09abd36074b108bb81107e0`). Lint clean.
- **Author fold-grounding corrections:** none beyond the approved actions. Grounded: the three existing release-date
  normalizations (`batch.py:175-178`, `response_factories.py:214-218, 269-272`); `maintenance.sh`'s output handling;
  `useInfiniteMovies.ts:107-109`; nothing outside `batch.py` uses its other functions.
- **Trend:** discovering. Design pass 1: 4 → 2.
- **Stop reason:** none yet. Round 2 prompt `adversarial-review/prompt-draft-pass1-round2.md` (sha256
  `2843ece30bd00db3239d1a5c816f78dc521226705b43e7b59f327f30936bc7ec`), sent 2:45 pm CT.

### Design review — fix check, round 2 since pass 1 (2026-11-10)

- **Kept versions:** `adversarial-review/draft-pass1-round1.md` → `adversarial-review/draft-pass1-round2.md` (sha256
  `f5cbff95022fadcc54741ff30ae200b8d873a96dc09abd36074b108bb81107e0`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh general-purpose subagent, read-only by prompt; verdict `independent` with incidental exposure: it
  also read `report-draft-pass1-round1.md` and the identical kept copy `draft-pass1-round2.md`. Counts; the Owner
  declined a rerun. Report `adversarial-review/report-draft-pass1-round2.md` (sha256
  `15b47f809cb5448205dddb41fa1ba2d1b6106dad8cafa471a164d61ca4abeae7`, role report).
- **Elapsed:** sent 2:45 pm CT, returned about 3:00 pm CT (about 15 minutes).
- **Counts by verified grade:** 6 minor, 0 not supported.
- **Approved dispositions** (Owner, 2026-11-10, "agreed as recommended"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | minor | Moving a removed movie's records doesn't end the alert | round-1 F2 fold | FIX (local correction) |
  | F2 | minor | While a removed movie is unsettled, the maintenance check reports nothing else | round-1 F2 fold | FIX (local correction) |
  | F3 | minor | Decision 9's ADR line credits ADR-026 with text it lacks; tier unanswered | round-1 F2 fold | FIX (local correction) |
  | F4 | minor | Decision 2's documents rule misses three sites and reaches ADRs and archives | round-1 F8 fold | FIX (local correction) |
  | F5 | minor | "Other endpoints keep today's 500" wrong for the genre list; 502 reach unstated | round-1 F8 fold | FIX (local correction), full scope |
  | F6 | minor | Three fold-added behaviour claims name no actor | round-1 folds | FIX (local correction) |

  Decisions settled: the removed-movie policy is a dated amendment to ADR-026's Risks (not a new ADR); fix check round
  3 declined in favour of pass 2; no rerun.
- **Shared causes:** Decision 9's job contract: round 2 F1, F2, F3 (all minor). That cause now has findings in three
  looks, but material ones in two (pass 1, round 1), so the three-look stop does not fire.
- **Folds landed:** 3:02 pm CT. Author grounding: `validate_tmdb_response` (`validators.py:84-95`) and
  `get_movie_genres`; `unhandled_error` (`api_errors.py:41`); `flock -w 1800` (`bootstrap.sh:196`); the two named
  factories. No corrections beyond the approved actions. Lint clean.
- **Convergence:** converged (minor-only); fix checking ends. Response performance complete; pass 2's conditional
  permission is now usable.
- **Trend:** converging. Design pass 1: 4 → 2 → 0.
- **Stop reason (rounds):** converged.

## Design review — pass 2 (2026-11-10)

- **Artifact:** the draft (pass cap 2, limit reached). Kept version: `adversarial-review/draft-pass2.md` (sha256
  `21e882cad72a0c8bfb283d40e935fd257594879456ba38d2450218e12fe922ce`).
- **Rubric:** as pass 1; the inbox path added to the artifacts so criterion 3 can be assessed.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-draft-pass2.md`
  (sha256 `921a432d84b5e8a4172a54cb15f9412b1c581eb28c65fa0fb970249204c2de26`, role prompt). Sent 3:03 pm CT.
- **Consumption:** the conditional pass-2 permission (Owner, 2026-11-10) is consumed by this launch.
- **Report:** `adversarial-review/report-draft-pass2.md` (sha256
  `e2d9573203ff0394bc19fce224c5a6928cc9921be98906a02253d647de06d9d1`, role report); returned about 3:26 pm CT (about
  23 minutes). Runner `independent`; it loaded the prompt-named inbox and no other session files.
- **Counts by verified grade:** 7 minor, 0 not supported. Criterion 3 (inbox) assessed and clear.
- **Approved dispositions** (Owner, 2026-11-10, "agreed as recommended"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | minor | Decision 3 credits ADR-024 with route error declarations | original artifact | FIX (local correction) |
  | F2 | minor | `Movie` becomes mutable with no `updated_at` | round-1 F3 fold | FIX (local correction) |
  | F3 | minor | Save order leaves two narrow failure paths unstated | original artifact | FIX (local correction), full scope |
  | F4 | minor | "Unknown runtime or overview" undefined against TMDB's 0 and `""` | pass-1 F12 fold | FIX (local correction) |
  | F5 | minor | "Pages never overlap" holds only while the list is unchanged | original artifact | FIX (local correction) |
  | F6 | minor | New maintenance step breaks the legacy-release compatibility statement | original artifact | FIX (local correction), full scope |
  | F7 | minor | Decision 10's list leaves out the two frontend service modules | original artifact | FIX (local correction) |

- **Shared causes:** ADR lines over-crediting their ADR: pass 1 F1 (major), F15; round 1 F6; round 2 F3; pass 2 F1.
  Fixed at the cause again: all eleven `_ADR:_` lines rechecked against their ADR's text; Decision 1's line split
  the same way (ADR-025 covers the test move; plain factory functions are `none`).
- **Folds landed:** 3:31 pm CT. Settled version for the fix check: `adversarial-review/draft-pass2-round1.md` (sha256
  `7628df07f1907d26dcaf71f5a3e568ac7ab8d7921f65b942b4c849b41fe46be5`). Lint clean. Author grounding:
  `DEVELOPMENT-RULES.md:373`; `deploy/README.md:496-498` and `test_installed_operations.py:89`;
  `userMovieDataService.ts:60-61, 119, 146, 172` and `userMovieService.ts:48-57`; `MovieDetail.tsx:192-198`.
- **Convergence:** converged (minor-only). Trend: converging. Design pass 1: 4 → 2 → 0; Design pass 2: 0.
- **Loop stop reason:** converged at pass 2 (limit reached). Fix check round 1 since pass 2 approved for the
  full-scope repairs (F3, F6), then the post-settle reread.

### Design review — fix check, round 1 since pass 2 (2026-11-10)

- **Kept versions:** `adversarial-review/draft-pass2.md` → `adversarial-review/draft-pass2-round1.md`.
- **Prompt:** `adversarial-review/prompt-draft-pass2-round1.md` (sha256
  `204d1e4c323f9eeb69b2e7dfe345c9584314d3203d96b27f1fea6be53606d127`, role prompt). Sent 3:33 pm CT.
- **Report:** `adversarial-review/report-draft-pass2-round1.md` (sha256 `bec29065776ae8dfcf3137408e31813a0a630fb49b22e3752ff913648e9325f4`, role report); returned about 3:47 pm CT
  (about 14 minutes). Runner `independent` with incidental exposure: it also loaded `report-draft-pass2.md`; counts,
  and the Owner declined a rerun.
- **Counts by verified grade:** 4 minor, 0 not supported.
- **Approved dispositions** (Owner, 2026-11-10, "yes, and agreed"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | minor | Decision 10's complete-list claim still omits two files and a read's call form | pass-2 F7 fold | FIX (local correction) |
  | F2 | minor | "Gains `page`": the Library query already has `page` | pass-2 F7 fold | FIX (local correction) |
  | F3 | minor | Body check would reject an explicit-null `watched_at` on un-watch | pass-2 F3 fold | FIX (local correction) |
  | F4 | minor | Refetch obligation covers saves but not DELETE | pass-2 F5 fold | FIX (local correction) |

  Decisions settled: no further fix-check round (wording-level fixes, below the full scope); the post-settle reread
  covers the residual. Merge of `origin/main` (563de7ab, K38's third PR) approved: it fast-forwarded, no merge commit.
- **Folds landed:** 3:48 pm CT. Convergence: converged (minor-only). Trend: converging. Design pass 1: 4 → 2 → 0;
  Design pass 2: 0 → 0.
- **Stop reason (loop):** converged at pass 2 (limit reached); fix checking ended by the Owner's call with the final
  residual covered by the post-settle reread.

## Post-settle reread (2026-11-10)

- Ran under the updated draft-design stop (from 563de7ab): reread, `**Class:** Heavy` written, lint clean.
- Readiness bar: criteria 1–4 clear; no "covered by" names a superseded part of an ADR. Coherence corrections:
  formatting only (five over-width paragraphs reflowed; Decision 3's two topics split into two paragraphs). No text
  change in meaning.
- Settled draft sha256 `1d527f8b1e4ca7d2611f090345c90adde5504aea35a16290402c43da7d25b43c`.

## PRD review — pass 1 (2026-11-10)

- **Artifact:** `.arc/backlog/technical/prd-user-movie-data.md` (detailed · RFC, Class Heavy, pass cap 2). Kept
  version: `adversarial-review/prd-pass1.md` (sha256
  `3cdca2b7e140a81fc7f2f4e824db7ef5efe6d670b11071928fc826b92909fd73`).
- **Rubric:** spec-review at `detailed` (reader independence, binding completeness against the draft, coherence, ADR
  question), assess-design-proportionality, design-audit, source-grounding (artifact scope).
- **Runner:** fresh general-purpose subagent (Claude Code), read-only by prompt. Prompt
  `adversarial-review/prompt-prd-pass1.md` (sha256
  `3802b9e4ea8a8bcef9266002b5546d36922127255cd764700f7dc280b5157cad`, role prompt). Sent 4:39 pm CT.
- **Pre-pass author checks:** proportionality `proportionate`; spec-review and the draft check clean after four
  advisor-raised corrections (after-merge criterion, 401 grounding, save-limit reasons, D5's removed schemas). Owner
  answers settled at this stage: review bound 10,000 characters; any valid `watched_at`; save limits 30/minute and
  1,000/day; the bound as a database constraint and admin rule, reversible migrations, and the save ADR recording the
  limits.
- **Report:** `adversarial-review/report-prd-pass1.md` (sha256
  `0463ab1849382f7a94b88b55e7fd17e0943817be2ed7b044d98241baa7e17057`, role report; findings verbatim, withstood
  summarized); returned about 5:01 pm CT (about 22 minutes). Runner `independent`; it loaded only the named prompt
  under `.arc/user/`.
- **Counts by verified grade:** 1 critical, 1 major, 9 minor, 0 not supported. Every finding's origin: the original
  artifact. Verified at source: `ninja/throttling.py` `UserRateThrottle.get_cache_key` and settings' middleware (no
  `request.user` for bearer sign-in); `test_csrf_protection.py:73-75`, `test_session_auth.py:47, 88, 179`;
  `ninja/params/models.py` body parsing; `deploy/README.md` rollback order and `bootstrap.sh` job installation;
  `Watchlist.tsx` and `useUserMovieData.ts` `useEffect` fetches.
- **Shared cause:** API-boundary claims written from intent, not traced through Django Ninja's request handling: F1
  (critical), F5, F6. Material in this look: F1.
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed"):

  | # | Grade | Finding | Action |
  | --- | --- | --- | --- |
  | F1 | critical | Save limits count bearer-token users per IP address | FIX (local correction) |
  | F2 | major | Tests in other apps call removed routes; no CSRF test on new writes | FIX (local correction) |
  | F3 | minor | Criterion 3's search trips on unrelated helpers; wrong archive path | FIX (local correction) |
  | F4 | minor | Goal 5 claims a hard cap where D6 gives a per-day rate | FIX (local correction) |
  | F5 | minor | PATCH contract misses Ninja's own responses | FIX (local correction) |
  | F6 | minor | Unbounded Library `page` overflows to a 500 | FIX (local correction), page cap 1,000,000 |
  | F7 | minor | "Exactly two queries" doesn't name its scope | FIX (local correction) |
  | F8 | minor | Daily-limit test needs a clock § 6 Testing didn't allow | FIX (local correction) |
  | F9 | minor | Rollback bullet has the runbook's order wrong | FIX (local correction) |
  | F10 | minor | ADR-026's "up to a day" and "one query per page" left stale | FIX (local correction) |
  | F11 | minor | D10's `useEffect` fetches not named as a rule exception | FIX (local correction) |

- **Folds landed:** 5:27 pm CT. Settled version for the fix check: `adversarial-review/prd-pass1-round1.md` (sha256
  `bcc64e1f892cff76d81927acacc6a2207c57abbc7337a64b18a81c9211aa27fe`). Lint clean. Author fold-grounding:
  `operation.py` runs authentication before throttles, so `request.auth` is set when a throttle keys; Ninja's
  `BodyModel.get_request_data` (400 on an unparseable body, `None` on no body); the runbook's reversal with the newer
  image before the switch; `bootstrap.sh` installs a target's own job scripts when it supplies both.
- **Convergence:** not converged (approved fixes of a confirmed critical and a confirmed major finding).
- **Conditional decisions:** fix check, round 1 since pass 1, run on the Owner's "agreed" with the recommendation;
  pass 2 (limit reached) undecided until the fix check resolves.

### PRD review — fix check, round 1 since pass 1 (2026-11-10)

- **Kept versions:** `adversarial-review/prd-pass1.md` → `adversarial-review/prd-pass1-round1.md`.
- **Rubric:** closure, behavioral grounding (source-grounding at fold scope), propagation and completeness, new failure.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-prd-pass1-round1.md`
  (sha256 `ca2dd87fef25592fa71112758378fc4610aa56b2794675bd2c5225c7302e39d6`, role prompt). Sent 5:30 pm CT.
- **Report:** `adversarial-review/report-prd-pass1-round1.md` (sha256 `02638446550d750568b7af1837dfde1a02e5c545da1e0b45debf0c8057048618`, role report; condensed); returned about
  5:43 pm CT (about 13 minutes). Runner `independent`; it loaded only the prompt and `prd-pass1.md` under
  `.arc/user/`.
- **Counts by verified grade:** 1 major, 6 minor, 0 not supported. Origins: F1 the original artifact, surfaced by the
  F5 fold's completeness claim; F2–F7 pass-1 folds (F10, F7, F4, F5, F11, F2/F3). Verified at source:
  `ninja/operation.py` (`_get_values` inside the try that `on_exception` closes); Django's `HttpRequest.body`
  size check; psycopg 3.2.13's NUL `DataError`; the Tier 2 rules and the realization clause in
  `strategy-adr-methodology.md`; `core/tests/test_helpers.py:218-224`.
- **Shared causes:**
  - API-boundary behaviour not traced through Django Ninja and the database: pass 1 F1 (critical), F5, F6; round 1 F1
    (major). Material in two looks (pass 1, round 1); a third stops the loop for the Owner.
  - A fold applied at its named site without sweeping the same rule elsewhere: round 1 F3, F4, F5, F6, F7 (minor).
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed as recommended"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | major | "One known 500" false: oversized body and NUL in a review also 500 | original artifact (via F5 fold) | FIX (local correction) |
  | F2 | minor | ADR-026 amendment "corrects" consequences, which Tier 2 excludes | pass-1 F10 fold | FIX (local correction) |
  | F3 | minor | ADR-026 amendment drops "in the service" | pass-1 F10 fold | FIX (local correction) |
  | F4 | minor | § 6 Security keeps the absolute-bound wording | pass-1 F4 fold | FIX (local correction) |
  | F5 | minor | "An empty body" survives in D6's save order | pass-1 F5 fold | FIX (local correction) |
  | F6 | minor | D10's exception covers reads only | pass-1 F11 fold | FIX (local correction) |
  | F7 | minor | Criterion 3 misses a removed route in a docstring | pass-1 F2/F3 folds | FIX (local correction) |

  Decisions settled: a review containing a NUL character is a 422 (the admin form already refuses one); the
  oversized-body 500 is listed as a known undeclared 500 and captured in the inbox as an errand (413 for the whole
  API); the ADR-026 amendment is a realization note adding learnings, not a correction; fix check round 2 skipped in
  favour of pass 2 (limit reached).
- **Folds landed:** about 6:45 pm CT. Lint clean. Author fold-grounding: Django's `forms.CharField` adds
  `ProhibitNullCharactersValidator`, so the admin form refuses NUL; the realization clause under
  `strategy-adr-methodology.md` § Accepted.
- **Trend:** discovering. PRD pass 1: 2 → 1.
- **Stop reason (rounds):** none; pass 2 follows.

## PRD review — pass 2 (limit reached) (2026-11-10)

- **Artifact:** the PRD. Kept version: `adversarial-review/prd-pass2.md` (sha256 `3fec4c0ed577d0353dfe70ffc4f49b77557c6ebca3737fca4a8092a84bc1f88e`).
- **Rubric:** as pass 1.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-prd-pass2.md`
  (sha256 `3e3382a7a710fbf2313338baeccfb9df0f4357239d36129c6c3a3bc0e55d05c0`, role prompt). Sent 6:50 pm CT.
- **Consumption:** the Owner's approval of pass 2 ("agreed as recommended") is consumed by this launch.
- **Report:** `adversarial-review/report-prd-pass2.md` (sha256 `205790724e51883d625641d4cebb3024f1dafe7096d05ac99629f299d4819d62`, role report; condensed); returned about 7:14 pm
  CT (about 24 minutes). Runner `independent`; it loaded only the named prompt under `.arc/user/`.
- **Counts by verified grade:** 1 major, 5 minor, 0 not supported. Origins: F1 the pass-1 F1 fold (the save limits'
  mechanism); F2–F6 the original artifact (F3 the round-1 F1 fold). Verified at source: `ninja/throttling.py`
  (`cache.get` then `cache.set` in `allow_request`/`throttle_success`); `backend/gunicorn.conf.py` (gthread, 2
  workers × 4 threads); `settings_test.py` sets no `CACHES`, so tests use Redis, whose `add` and `incr` are
  atomic; Ninja reads a body only for operations with a body parameter; the old frontend's `PATCH ${endpoint}/${id}`.
- **Shared causes:** API-boundary behaviour not traced through Django Ninja and the database: pass 1 F1 (critical),
  round 1 F1 (major), pass 2 F1 (major). Material findings in **three looks**: sustained non-convergence; the loop
  stops for the Owner's decision on the save limits' mechanism.
- **Trend:** sustained non-convergence. PRD pass 1: 2 → 1; PRD pass 2: 1.
- **Approved dispositions** (Owner, 2026-11-10, "agreed, A"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | major | Save limits undercount concurrent saves | pass-1 F1 fold | FIX (new design): exact fixed-window counters |
  | F2 | minor | An old tab's PATCH to `/{id}` saves another movie | original artifact | FIX (local correction), risk accepted |
  | F3 | minor | Oversized-body 500 only for the PATCH | round-1 F1 fold | FIX (local correction) |
  | F4 | minor | Existing reviews over 10,000 characters fail the migration | original artifact | FIX (local correction), truncate |
  | F5 | minor | Removed-movie procedure has no living home | original artifact | FIX (local correction) |
  | F6 | minor | After-merge criterion can fail on a null runtime | original artifact | FIX (local correction) |

  Decision on the sustained cause (Owner): option (a), one throttle class counting each user's saves in fixed clock
  windows with Redis's atomic `add` and `incr`, keyed on `request.auth`; its looks count afresh from here. Fix check
  round 1 since pass 2 run on the Owner's "agreed" with the recommendation.
- **Folds landed:** 7:18 pm CT. Settled version: `adversarial-review/prd-pass2-round1.md` (sha256 `644d7c5400131aa52637a11c75485960afe22b7e6a69943928209c3fbbddac8a`). Lint clean.
  Author fold-grounding: `settings_test.py` sets no `CACHES`, so tests use Redis; Django's `RedisCache.add` and
  `incr`.
- **Stop reason (loop):** pass cap reached (pass 2, limit reached); sustained non-convergence on the API-boundary cause
  settled by the Owner's decision above. Fix checking continues over the folds.

### PRD review — fix check, round 1 since pass 2 (2026-11-10)

- **Kept versions:** `adversarial-review/prd-pass2.md` → `adversarial-review/prd-pass2-round1.md`.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-prd-pass2-round1.md`
  (sha256 `b808d8a7b9df2144aedaf3212e760cfbae8aa5b622a6c2c915aa400cc2e9102c`, role prompt). Sent 7:21 pm CT.
- **Report:** `adversarial-review/report-prd-pass2-round1.md` (sha256 `1e4f8d88aa330afb66ff983eabcc2711a1f45e0e6d8a862b29e7f74b4d32346f`, role report; condensed); returned about
  7:33 pm CT (about 12 minutes). Runner `independent`; it loaded only the prompt and `prd-pass2.md` under
  `.arc/user/`.
- **Counts by verified grade:** 1 major, 3 minor, 0 not supported. Origins: F1 and F2 the pass-2 F1 fold; F3 the
  pass-2 F2 fold; F4 the pass-2 F4 fold. Verified at source: Django's `RedisCacheClient.incr`, `add` and
  `get_backend_timeout`; `Operation.run` runs throttles outside its `try`; `AuthRateThrottle.get_cache_key`.
- **Shared causes:** the save limits' mechanism (counted afresh from the Owner's decision): round 1 since pass 2 F1
  (major), F2. Material in one look since the decision.
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | major | Counter can raise on a missing key, escaping to an HTML 500 | pass-2 F1 fold | FIX (local correction) |
  | F2 | minor | Not all of Ninja's rate throttles key on `request.user` | pass-2 F1 fold | FIX (local correction) |
  | F3 | minor | A stale tab sends no deletes | pass-2 F2 fold | FIX (local correction) |
  | F4 | minor | Truncating after converting can leave a whitespace-only review | pass-2 F4 fold | FIX (local correction) |

  Decisions settled: counting never raises (expiry rounded up to whole seconds, at least one; a missing counter starts
  again at one; a cache error lets the save through); truncate before converting; fix check round 2 since pass 2 run
  on the Owner's "agreed" with the recommendation.
- **Folds landed:** 7:33 pm CT. Settled version: `adversarial-review/prd-pass2-round2.md` (sha256
  `fa0a07ad8701774fa270c2dc0117355b43af1e0e0eb8c9cd3df8d0da507481cf`). Lint clean.
- **Trend:** settling. PRD pass 2: 1 → 1.

### PRD review — fix check, round 2 since pass 2 (2026-11-10)

- **Kept versions:** `adversarial-review/prd-pass2-round1.md` → `adversarial-review/prd-pass2-round2.md`.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-prd-pass2-round2.md`
  (sha256 `81eff11588ac4e8456189f9f4f609c94a0022575b5cc2120575569294a282162`, role prompt). Sent 7:35 pm CT.
- **Report:** `adversarial-review/report-prd-pass2-round2.md` (sha256 `cbaf1c2ff67bb9bd0f2470c3ebcace6225842b08587f06fe898fe980dd72cbf5`, role report; condensed); returned about 7:46 pm CT (about 12 minutes). Runner
  `independent`; it loaded only the prompt and `prd-pass2-round1.md` under `.arc/user/`.
- **Counts by verified grade:** 5 minor, 0 not supported. Origins: the round-1 folds (F1's verification and
  propagation, F4's restatement). Verified at source: `get_backend_timeout` truncation; `enable_throttling_for_test`
  overrides `settings.CACHES`; `_check_throttles` only allows or answers 429. Found in verification and joined to
  F2: the `enable_throttling` marker swaps the cache to `LocMemCache`, whose expiry isn't truncated, so the
  last-second case proves nothing there; the save-limit tests must keep Redis.
- **Convergence:** converged (minor-only).
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | minor | The last-second test can't catch its bug; the restart path is untested | round-1 F1 fold | FIX (local correction) |
  | F2 | minor | Save-limit tests replace the cache unstated; the existing marker swaps out Redis | round-1 F1 fold | FIX (local correction) |
  | F3 | minor | Fail-open on a cache error not carried to four statements of the limit | round-1 F1 fold | FIX (local correction) |
  | F4 | minor | The migration bullet says "empty reviews" only | round-1 F4 fold | FIX (local correction) |
  | F5 | minor | New framework claims don't name their code | round-1 F1 fold | FIX (local correction) |

  Decisions settled: fix checking stops here (minor-only, local corrections), on the Owner's "agreed" with the
  recommendation; next, the post-settle reread.
- **Folds landed:** 7:50 pm CT. Lint clean. Author fold-grounding: `Operation.run` calls `_run_checks` (which calls
  `_check_throttles`) before its `try`; `SimpleRateThrottle.allow_request`, `throttle_success` and
  `UserRateThrottle.get_cache_key` in `ninja/throttling.py`; no `handler500` in `backend/config` or `backend/apps`.
- **Stop reason (loop):** converged (fix check round 2 since pass 2, minor-only); fix checking stopped on the Owner's
  approval. The final repairs are the residual the post-settle reread covers.

### PRD post-settle reread (2026-11-10)

- **Scope:** spec-review's common reader checks and coherence slice over the whole settled PRD.
- **Result:** coherent; no contradiction among the goals, design, decisions, cross-cutting sections and criteria. One
  correction inline: § 6 Testing "Save limits" now says throttling is enabled without the `enable_throttling` marker
  (D6's "unless a test enables throttling" could be read as that marker). Seven paragraphs rewrapped, no word changed
  (word sequence compared). `**Class:** Heavy` present; lint clean.
- **Settled PRD:** sha256 `e898f98063200e6e69162ccc4d733c03958278bc574d9e94022cdb2afcc66846` at 7:52 pm CT, before
  the commit.

## Task-list review — pass 1 (2026-11-10)

- **Artifact:** the task list (Class Heavy, pass cap 2), generated at the `high` planning level: 6 phases, 22 parent
  tasks, 636 lines. Kept version: `adversarial-review/tasks-pass1.md` (sha256
  `2e9a21fd861173b03ef1ead161ea6574b43340db364604bc577c0b245e4b4318`).
- **Author checks before the pass:** each phase grounded top-down with task-audit at full depth and source-grounding;
  the suite-coherence pass; the Success Criteria compared with the PRD's, whitespace and list markers normalized
  (identical); markdown lint clean.
- **Rubric:** task-audit at full depth (grounding floor and eight categories), executability, fidelity to the PRD, and
  conformance to the task-list rules, over the PRD and the task list.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-tasks-pass1.md`
  (sha256 `ff21b588feab874fddfd8dc617a13fb78a60c01b47a52ec9af4d0064515fafbd`, role prompt). Sent 8:46 pm CT on the
  Owner's "yes, let's run it".
- **Report:** `adversarial-review/report-tasks-pass1.md` (sha256 `6eb09fd9d1d087a7c4f7e857baf7c86f3223de416c175109b3279c587b783cd3`, role report; condensed); returned about
  9:11 pm CT (about 25 minutes). Runner `independent`; it loaded only the named prompt under `.arc/user/`.
- **Counts by verified grade:** 6 major, 9 minor, 0 not supported. Every finding's origin: the original artifact.
  Verified at source: `service_factory.py` passes `repository=` and `movie_service=`, and `api.py` builds its
  service at import; `get_all_filtered` applies no state filter; Criterion 9's "API tests show" against 3.1.a/3.2.a;
  `strategy-service-layer.md` lines 8, 17, 19, 320, 323–324, 503, 505 and `STRATEGY-INDEX.md` 18–19; `README.md`
  14 and 56; `ninja/operation.py` `_check_throttles` (`allow_request` then `wait()` on each shared instance);
  `test_installed_operations.py` imports `test_nightly.DOCKER`, which exits 92 on an unknown command;
  `frontend/tests/mocks/handlers/user-movies.ts` gives three flags. F10's pending-trigger behaviour is traced, not run.
- **Shared causes:** (a) a task's own checks depending on a change a later task makes: F1, F2, F4, with the five
  ordering defects the author's grounding fixed and three more found before the offer; (b) removal sites listed from
  the author's enumeration rather than derived from a search for each removed concept: F5, F7, F14.
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed", with both cause-level sweeps):

  | # | Grade | Finding | Action |
  | --- | --- | --- | --- |
  | F1 | major | 1.2.b breaks the factory's import until 1.2.c | FIX (local correction): one subtask |
  | F2 | major | 2.3.c tests a Library exclusion before the Library has it | FIX (local correction): moved to 3.1.b |
  | F3 | major | Criterion 9's API evidence planned only as service tests | FIX (local correction): 3.1 and 3.2 merged |
  | F4 | major | First-save movie tests name no entry point and lose their home | FIX (local correction): into 2.2 |
  | F5 | major | Repository and batch sites missed in the service-layer docs | FIX (local correction) |
  | F6 | major | Concurrency test doesn't force overlap; its red is an `AttributeError` | FIX (local correction) |
  | F7 | minor | `README.md` claims a repository pattern | FIX (local correction), no PRD amendment |
  | F8 | minor | Already-passing cases labelled "FAIL initially" | FIX (local correction), plus a general note |
  | F9 | minor | Stub covers success only and lives in the wrong app | FIX (local correction) |
  | F10 | minor | Migration-test note misses deferred FKs and `--reuse-db` | FIX (local correction) |
  | F11 | minor | Command's non-zero exit with stale IDs last not specified | FIX (local correction) |
  | F12 | minor | Throttle instance shared across requests not mentioned | FIX (local correction) |
  | F13 | minor | Fake Docker can't show the previous release's step failing | FIX (local correction) |
  | F14 | minor | `user-movies.ts` MSW handler missed | FIX (local correction) |
  | F15 | minor | 1.2's Goal omits the changed exception classes | FIX (local correction) |

- **Folds landed:** 9:18 pm CT (Owner's approval 9:14 pm CT); the sweep folds at 9:22 pm CT. Settled version for the
  fix check: `adversarial-review/tasks-pass1-round1.md` (sha256
  `a1ffa25d8e4b0315338d3de5a1fc63a241c5d051e8a70e51534f0f89ed76c45b`), 670 lines. Lint clean; the Success Criteria
  section untouched and still the PRD's. Renumbering: 1.2.c folded into 1.2.b (the old 1.2.d is now 1.2.c); 3.1 and
  3.2 merged into 3.1 (a service query test, b API tests, c one implementation); the old 3.3 and 3.4 are now 3.2 and
  3.3; every "until 3.2.b" now reads 3.1.c. Author fold-grounding: `apps/movie/helpers.py` builds
  `MovieEnrichmentService()` with no arguments, so 1.2.b's constructor change leaves it valid; only `api.py` imports
  the three record-ID schemas.
- **Cause sweeps:**
  - (b) Concept searches over the living files for "repositor", "batch" and `user-movie-data`. Every remaining
    "repositor" and "batch" hit is a general rule (the service-layer diagram and dependency table, the testing
    methodology, DEVELOPMENT-RULES) or already on the list. The `user-movie-data` search found three prose sites the
    symbol search can't match, now named: `movieInteractionService.ts`'s header (5.1.d), and
    `strategy-testing-methodology.md`'s create-route example and its TMDB note (2.3.e); 5.1.e now also searches route
    prose.
  - (a) Each subtask stepped through against only earlier tasks, with targeted searches. 2.3.c's payload test would
    pass on arrival after 2.3.b's schema change, so it moved into 2.3.b as exact-field assertions (no other test reads
    `id` or `title` off a payload's `user_movie_data`; the one construction site, `MovieEnrichmentService`, is already
    2.3.b's). 2.2.b's red now explicitly comes after 2.2.c, against a reconstructed read-then-create save. 3.1.b names
    its already-passing 401. 1.3.c's constraints break no surviving writer: the model and the old schemas default
    `user_review` to `None`, `seed_dev_data` writes no record, and no test writes an empty review or a rating of 0.
- **Convergence:** not converged (approved fixes of six verified major findings).
- **Stop reason:** none yet. Fix check, round 1 since pass 1, run on the Owner's "yes" (9:25 pm CT).

## Task-list review — fix check, round 1 since pass 1 (2026-11-10)

- **Artifact:** the folds to the task list. Kept versions: before, `adversarial-review/tasks-pass1.md`; after,
  `adversarial-review/tasks-pass1-round1.md` (sha256 `a1ffa25d8e4b0315338d3de5a1fc63a241c5d051e8a70e51534f0f89ed76c45b`,
  identical to the live task list).
- **Rubric:** closure, behavioral grounding (source-grounding at `fold` scope), propagation and completeness, new
  failure.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt
  `adversarial-review/prompt-tasks-pass1-round1.md` (sha256
  `020c50dd5f2f797ac490d9e51f22f13c4a3df7991904fcb8979b88a46f606a28`, role prompt; the pass-1 account with
  findings, approved actions and changed loci, no author conclusions). Sent 9:25 pm CT on the Owner's "yes".
- **Report:** `adversarial-review/report-tasks-pass1-round1.md` (sha256
  `da0e53b1b6eb7d34773d9f5f825b32a9a08be0694ea4b2ccecf317fee4687564`, role report; condensed); returned about
  9:48 pm CT (about 23 minutes). Runner `independent`, with one file named as loaded beyond the prompt: the condensed
  pass-1 report (reviewer output, no author conclusions). Under source-grounding's rule that is incidental exposure,
  and the report counts.
- **Counts by verified grade:** 0 critical, 0 major, 7 minor, 0 not supported. Origins:
  - the folds: F2 (1.2.c), F4 (1.1.a), F5 (4.3.a), F6 and F7 (3.1.b), and F1's 2.3.c list;
  - the original artifact, missed by pass 1 and the sweeps: F1's 2.4.a and 4.1.a, and F3 (line 231).

  Verified at source:
  - today's `PATCH /{id}` and `DELETE /{id}` share the new routes' path shape, and `UserMovieDataUpdateSchema` bounds
    `user_rating` (`ge=1, le=10`);
  - `strategy-service-layer.md` line 17 (the contents entry) and line 231;
  - `create_mock_error_response` against `create_mock_tmdb_error_response`, and `base_api_client.py`'s 504
    `network_error`;
  - `test_nightly.run_job` creates only `repo/infrastructure`, and `test_installed_operations.py` line 114 calls
    `fixture.run` with the default `check=True`;
  - Criterion 6 ends on the CSRF clause;
  - `batch.py` builds `TMDBApiClient()` at import, and `test_watchlist_endpoint.py` patches TMDB at the class today.
- **Convergence:** converged (minor-only).
- **Shared cause:** a fold applied at its named site without sweeping the same rule into neighbouring subtasks or
  fixtures: F1, F5, F6. Material in this look: none (minor-only).
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | minor | Already-passing cases under-listed in 2.3.c; 2.4.a and 4.1.a unlisted | pass-1 F8 fold; original | FIX (local correction) |
  | F2 | minor | 1.2.c drops the contents entry for the section it keeps | pass-1 F5 fold | FIX (local correction) |
  | F3 | minor | `_build_enriched_movies` composition row outlives the method | original artifact | FIX (local correction) |
  | F4 | minor | 1.1.a names a helper whose error shape the client never returns | pass-1 F9 fold | FIX (local correction) |
  | F5 | minor | Shared fake Docker breaks `test_nightly`; installed run raises | pass-1 F13 fold | FIX (local correction) |
  | F6 | minor | 3.1.b names Criterion 6's CSRF clause | pass-1 F2 fold | FIX (local correction) |
  | F7 | minor | 3.1.b's red run calls TMDB for real | pass-1 F3 fold | FIX (local correction) |

- **Folds landed:** 9:51 pm CT. Lint clean; 680 lines. Author fold-grounding: `create_mock_error_response` takes
  `status_code`, `error_message`, `error_details` and `error_category`; `test_installed_operations.py` runs
  backup and maintenance in one loop with the default `check` and asserts the maintenance success ping in its ping
  list. Kept version for pass 2: `adversarial-review/tasks-pass2.md` (sha256
  `0494ae4cd68113f77c2aa038a5c0f9664574fb7283965e74a94cb48a42962ec9`).
- **Trend:** converging. Task-list pass 1: 6 major → 0 major (7 minor).
- **Stop reason (rounds):** converged (minor-only); pass 2 (limit reached) run on the Owner's "yes".

## Task-list review — pass 2 (limit reached) (2026-11-10)

- **Artifact:** the whole task list after pass 1 and its fix check. Kept version: `adversarial-review/tasks-pass2.md`
  (sha256 `0494ae4cd68113f77c2aa038a5c0f9664574fb7283965e74a94cb48a42962ec9`), 680 lines.
- **Rubric:** as pass 1 (task-audit at full depth with its grounding floor, executability, fidelity to the PRD,
  conformance to the task-list rules), over the PRD and the whole task list.
- **Runner:** fresh general-purpose subagent, read-only by prompt. Prompt `adversarial-review/prompt-tasks-pass2.md`
  (sha256 `68563467b66c182f1188f349ed814d9eb2b15286a5955440a874a9e355ced749`, role prompt: pass 1's prompt with the
  account of pass 1 and its fix check as context, not the frontier). Sent 9:52 pm CT on the Owner's "yes".
- **Report:** `adversarial-review/report-tasks-pass2.md` (sha256
  `f6b39fe4e540fb3b1ed4c96ad5e34e05119127be58472b4b72a71d7a8667ffb6`, role report; condensed); returned about
  10:20 pm CT (about 28 minutes). Runner `independent`; it loaded only the named prompt under `.arc/user/`.
- **Counts by verified grade:** 0 critical, 0 major, 5 minor, 0 not supported. Every finding's origin: the original
  artifact (F1's 3.1.a sat beside the fix-check F7 fold, which reached only 3.1.b). Verified at source:
  - `batch.py`'s module-level `TMDBApiClient()` and the service's call at line 311;
  - Django 5.2.19: `BaseModelForm._post_clean` calls `full_clean(exclude=..., validate_unique=False)`, whose
    `validate_constraints` defaults to true; `TextField.formfield` passes no `strip`, and `forms.CharField` defaults to
    `strip=True` and always adds `ProhibitNullCharactersValidator`;
  - PRD D4's "stored as sent, surrounding whitespace included";
  - `UserMovieDataService.delete(user, record_id)`; `get_by_tmdb_id` already raises on a missing record, so the read
    has no name clash;
  - `test_create_user_movie_data_invalid_movie_id_returns_404`.
- **Convergence:** converged (confirmed minors only, once the dispositions are approved).
- **Approved dispositions** (Owner, 2026-11-10, "yes, agreed"):

  | # | Grade | Finding | Origin | Action |
  | --- | --- | --- | --- | --- |
  | F1 | minor | 3.1.a's red run reaches TMDB through the batch module's client | original artifact | FIX (local correction) |
  | F2 | minor | 1.3.d: two refusals pass on arrival; D4's "stored as sent" untested | original artifact | FIX (local correction) |
  | F3 | minor | No test that `updated_at` moves on the two `QuerySet.update()` writes | original artifact | FIX (local correction) |
  | F4 | minor | Two methods named `delete` during 2.2.c–2.3.d | original artifact | FIX (local correction): `delete_by_record_id` |
  | F5 | minor | The PATCH's TMDB-failure responses lose their API-level test | original artifact | FIX (local correction) |

  Decisions settled: the fix check is skipped (minor-only, local corrections), on the Owner's "agreed" with the
  recommendation; next, the post-settle reread.
- **Folds landed:** 10:22 pm CT. Lint clean. Author fold-grounding: Django 5.2.19's `TextField.formfield` passes no
  `strip`, so the default admin field strips; `get_by_tmdb_id` already raises on a missing record, so only `delete`
  clashes; today's `PATCH /{id}` answers an unknown TMDB ID with the no-record 404, listed among 2.3.c's
  already-passing cases.
- **Trend:** converged. Task-list pass 1: 6 major, 9 minor → fix check 7 minor → pass 2: 5 minor.
- **Stop reason (loop):** converged at pass 2 (limit reached); fix checking stopped on the Owner's approval. The final
  repairs are the residual the post-settle reread covers.

### Task-list post-settle reread (2026-11-10)

- **Scope:** Step 9's suite-coherence pass over the whole settled task list against the PRD: coverage, order of
  inputs, cross-task interfaces, no change claimed twice, exit criteria each phase can show; boundary fit.
- **Result:** coherent. Three corrections inline:
  - 1.2.b's interim-homes bullet says 2.2.c renames `delete`.
  - 3.1.c removes 3.1.a's replacement of the batch module's client, which 3.2.a's removal of `batch.py` would
    otherwise break.
  - One 3.1.b bullet was rewrapped, with no word changed.

  The Success Criteria still match the PRD's (normalized comparison). Boundary: 693 lines and 6 phases, under the
  marks. Lint clean.
- **Settled task list:** sha256 `d60358839d42d3c88cdb0ea4736439db95bc2507a12e09395b4406eda3caa2c6` at 10:23 pm CT,
  before the commit.

## PRD amendment at activation (2026-11-10)

- **Change:** D6's note on undeclared responses. A PATCH body past Django's 2.5 MB upload limit now answers an
  undeclared 413 (main's API-wide `RequestDataTooBig` handler in `apps/core/api_errors.py`, merged in `cdbc2a11`)
  rather than the known 500 the PRD listed. Dated line under the PRD's new `## Amendments` section.
- **Review:** planning-review's `amendment` artifact at wording level, so the independent pass was omitted. No
  decision is settled, so no ADR disposition. The PRD's other 2.5 MB mention (D4's bound rationale) still holds.
  No task or success criterion changes; 2.3.c's "exactly D6's statuses" still holds, since an exception handler adds
  nothing to the OpenAPI schema. Owner's decision at activation (2026-11-10).


## Verification — author criteria walk (2026-11-11)

- **Runner:** primary agent; author validation, not independent review. Two read-only scouts mapped evidence;
  criterion judgments and check execution remained with the primary.
- **Rubric:** `validate-criteria` through `verification-review`, over the PRD and every Success Criterion.
- **Scope:** `tasks-user-movie-data.md` > Success Criteria > Implemented (1–13), plus the explicit timing of
  Proven after merge (1). No Delivery Plan. No criterion text or acceptance goal changed.
- **Shared span:** complete `main...8346cb6d` diff, base `a5a784f343550f21fd19a68538c7a0837697f900`, plus this
  walk's documentation edits; reachable tree `8346cb6dd97d5684290d52e50f55789f18dad5d4` plus those edits.
  The last main integration, also the local origin/main, is `7d3578dca82998f215bd587533a67afed9993c67`;
  implementation comparisons also used that ancestor to distinguish inherited changes.
- **Gates:** 1,220 backend tests pass with 96.31% coverage; 999 frontend tests pass; Ruff lint and format,
  Pyright (0 errors/warnings), ESLint, Chakra typegen, TypeScript and markdown pass. Five Chromium smoke tests pass
  on the worktree's browsable stack. Eight nightly/installed-operations tests pass. Contrast passes 968 pairs;
  production build passes, reporting its existing chunk-size and mixed-import advisories.
- **Generated contract:** regenerated schema and TypeScript match the committed files byte-for-byte by git diff.
  Committed OpenAPI inspection confirms the exact four route response sets and shared error references.
- **Historical evidence:** archived backend at `8e3d1376` ran in an ephemeral Docker container, using a test database;
  all 44 rewritten service cases pass before fold commit `a75fa1cb`. No current source or development data changed.
- **Retained run logs:** `verification-backend.log`, `verification-frontend.log`, `verification-ruff.log`,
  `verification-ruff-format.log`, `verification-pyright.log`, `verification-eslint.log`, `verification-typegen.log`,
  `verification-types.log`, `verification-markdown.log`, `verification-e2e.log`, `verification-deploy.log`,
  `verification-generated-types.log`, `verification-contrast.log`, `verification-build.log`, and
  `verification-before-fold.log`. Live save, Library, refresh and browser scenario logs were also inspected;
  their implementation remains at the verified head. No live staging operation ran.
- **Criteria report** (loci under Success Criteria):

| Locus | State | Evidence |
| --- | --- | --- |
| Implemented > 1 | [x] | `test_library_service.py` pins two queries at 200 records and no TMDB; `test_watchlist_endpoint.py` pins stable endpoint count; `test_user_movie_data_api.py` sets fields from empty/full state and clears nullables. Full backend run passes. |
| Implemented > 2 | [x] | Historical 44-case run at `8e3d1376` passes before `a75fa1cb`; current tests and helpers replace no repository, QuerySet or MovieService. |
| Implemented > 3 | [x] | Deleted repository/batch modules and tests; clean tracked-name search under the criterion's exclusions; all route literals inspected use TMDB IDs; constructor takes only TMDB. |
| Implemented > 4 | [x] | No HttpError in changed paths; committed response sets exactly match D6; error refs share ErrorResponseSchema; malformed detail/credits endpoint cases pass as 502. |
| Implemented > 5 | [x] | Direct ORM constraint cases and both migration apply/reverse tests pass, including all three review-cleanup inputs. |
| Implemented > 6 | [x] | Save API and authentication suites pass lifecycle, omission/null/validation/body/date/state/ownership/authentication and enforced-CSRF cases. |
| Implemented > 7 | [x] | Two real-transaction first saves overlap at TMDB and succeed with one Movie, one user record and both fields. |
| Implemented > 8 | [x] | Real Redis bearer/session limits, simultaneous saves, both window edges, deleted counter, refused connection and isolation tests pass. |
| Implemented > 9 | [x] | Library API matrix passes filters, all sorts/directions, nulls/ties, bounds, card/user payload, state omission and page envelopes with null cursor. |
| Implemented > 10 | [x] | Mapping tests prove unknown normalization and genre derivation; service tests prove missing/stored save requests and no writes on failure; detail tests prove stored-only refresh. |
| Implemented > 11 | [x] | Command tests prove order, budget, unchanged failure rows, counts/staleness; eight deploy-script tests prove sequencing/output and previous-release failure. README contains the operating procedure. Live refresh reported two rows and zero failures. |
| Implemented > 12 | [ ] | Local frontend behavior, browser smokes, regenerated contract and equivalent drift command pass. Hosted CI's type-drift job has not run, so the complete criterion is not yet proven. |
| Implemented > 13 | [x] | Pagination/service/technical references and response docstring inspected; removed-symbol search and markdown lint pass. |
| Proven after merge > 1 | [ ] | Explicitly due after merge: stored movie before deploy, nightly heartbeat/journal, then populated Library response on staging. No claim of staging proof. |

- **Summary:** 12 Implemented criteria met; one awaits hosted CI evidence. The post-merge criterion remains due at
  its specified stage. No implementation gap was identified by this author walk. This is not a standard code review.
- **Independent review:** not run. Recommend fresh-context verification pass 1 against the unchanged criteria,
  withholding these judgments and marks; Heavy cap is two complete passes. Owner decision pending.
- **Stop reason:** author walk complete; await independent-pass decision and retain the CI-dependent criterion
  open. Task 6.1 and document completion statuses remain open. Elapsed author walk and gates: about eight minutes.


## Criteria verification — pass 1 (2026-11-11)

- **Authorization:** Owner approved independent verification pass 1 with “yes”, after the author walk.
- **Runner:** fresh read-only general-purpose subagent `/root/verification_pass1`, with no inherited conversation;
  input withheld the author's criteria walk, criterion marks, review logs and retained execution artifacts.
- **Rubric and scope:** all 13 Implemented Success Criteria and the explicitly post-merge criterion, governed by
  the full PRD; complete pinned diff `a5a784f343550f21fd19a68538c7a0837697f900...8346cb6dd97d5684290d52e50f55789f18dad5d4`
  and reachable tree at the latter commit. Uncommitted criterion marks/evidence were withheld as author conclusions;
  no implementation or criterion wording differed from the target.
- **Kept inputs and report:**
  - `adversarial-review/prompt-verification-pass1.md`, role prompt, sha256
    `72a171ce7afe78d59cf6a0f973545f39a46bda05bdf8a08da9ae2d6e99feafd2`.
  - `adversarial-review/verification-pass1-tasks.md`, role artifact (task markers removed), sha256
    `4a06e0ddac3b60dbc61be04e198ced539bd0c85f0d0f2d2a377de26a1b8d05ad`.
  - `adversarial-review/report-verification-pass1.md`, role report, sha256
    `77266d61fd7269e66d313cfede0b48637514e502eb4ce66c968426ff1c335640`.
- **Verified counts:** 0 critical, 0 major, 0 minor, 0 unsupported. No dispositions, repair batch or shared defect
  cause exists. No finding-driven edits were made.
- **Primary assessment:** every criterion has a coverage entry. Spot-check of installed Ninja confirms both
  throttle windows run and maximum wait controls Retry-After. The independent generator comparison agrees with
  the primary's actual regeneration/no-diff result. Source coverage supports the report; it establishes no new
  suite execution or staging/CI proof.
- **Evidence limits:** the independent reviewer did not see or rerun the historical checkpoint or current gates.
  The preceding author walk retains actual passing runs for both. Neither pass observed hosted CI or staging,
  and Implemented > 12 remains unchecked for CI. Proven after merge > 1 stays unchecked until its staging run.
- **Stop reason:** converged for the independent source-defect pass (zero findings); the complete work-unit
  verification remains open for the named lifecycle evidence. No successor or fix check is indicated by this
  pass. This is criteria verification, not the separate standard code review.
- **Timing:** sent about 6:15 am CT; returned about 6:22 am CT (about seven minutes). Heavy review cap: two
  complete passes; one used. No further pass is authorized.


## Code review — pass 1, delegated agent (local), with author findings (2026-11-11)

- **Authorization:** Owner approved completion preparation and the separate code review after criteria pass 1.
- **Target:** `a5a784f343550f21fd19a68538c7a0837697f900...8346cb6dd97d5684290d52e50f55789f18dad5d4`, plus the exact three
  documentation overlays in `adversarial-review/code-pass1-target.json`. Ref names moved to `88ddf8c3` during review;
  the reviewer used the literal hashes. All overlay hashes still match at report storage.
- **Rubric:** standard-review/v1 through code-review-standard and implementation-audit, all five dimensions plus
  repository contract coherence. The author also ran code-review-author's aggregate preflight.
- **Runner:** fresh non-author, read-only general-purpose subagent `/root/code_review_pass1`, no inherited conversation,
  author findings, suspected weak spots or self-verification briefing. It reports complete coverage of all 102
  changed tracked files and the untracked completion draft, including inherited changes and deleted-test seams.
- **Kept artifacts:**
  - `adversarial-review/prompt-code-pass1.md`, role prompt, sha256 `176b9dd30da24735702b74c71e106ee05436aa2b3827e3705bf2fccd75067204`.
  - `adversarial-review/code-pass1-target.json`, role target, sha256 `24b8c6887a08f35825ac28fcfda2f3a9be1742c290daaa804d93befd028a42e7`.
  - `adversarial-review/report-code-pass1.md`, role independent report, sha256 `edcbe5d1f0959e417761a0166c3c480a0fd90eb71daad161297f7dc1a3ddc5ec`.
  - `adversarial-review/report-code-author.md`, role author report (contains A1 and A2).
  - `adversarial-review/advice-code-card-storage.md`, role bounded advice, advisor `/root/advisor_storage_limits`.
- **Independent counts:** 0 critical, 0 major, 0 minor, 0 unsupported; no source-coverage gap reported. Its clean
  source conclusion does not supersede the primary's concrete reproduction or establish runtime gates.
- **Primary findings:** A2 is canonical F1, major; A1 is canonical F2, minor. Neither came from the independent
  evaluator. No implementation fix, commit or publication occurred. Complete dispositions remain proposed:

| Label | Origin | Grade | Proposed disposition | Boundary |
| --- | --- | --- | --- | --- |
| F1 | Author boundary probes (A2) | major | FIX (local correction) | Enforce only existing title/poster_path lengths at shared storage mapping; UpstreamError on rejection; skip persistence for unstored details; regress all writer paths and refresh exit semantics. |
| F2 | Author preflight (A1) | minor | FIX (local correction) | Remove only two orphaned batch-policy comment lines from the Ruff configuration. |

- **Shared cause (F1):** the shared storage mapper admits two unrepresentable text fields, propagating to first save,
  detail and nightly refresh; detail additionally attempts persistence for absent rows. No shared cause joins F2.
- **Verification evidence:** 255-character controls pass twice; seven 256-character composition probes fail with
  DataError, including first save, stored/unstored detail and interrupted refresh. A no-row assertion precedes both
  unstored failures. Logs: `code-review-card-storage.log`, `code-review-card-storage-composition.log`,
  `code-review-unstored-storage.log`, `code-review-card-storage-boundary.log`. Tests run in an ephemeral Docker
  container against a test database. The original configuration-discovery failure remains in its invocation log.
- **Advice:** bounded correction is inside D3/D8/D9 and needs no PRD amendment; preserve unstored detail display,
  do not truncate, migrate storage, extend numeric validation or catch all database errors. The follow-up settled
  the empirical no-row correction. Advisor advice is not an independent review or authorization.
- **Preparation:** completion record is Draft with Prepared date; ADR-041 acceptance is dated 2026-11-11; task
  status stays open. Markdown and diff checks pass. The full ADR check still sees Proposed at committed HEAD;
  parser/uniqueness checks pass for the working record, and the full check must rerun after its commit.
- **Alignment:** META-PRD vision/out-of-scope and TECHNICAL-OVERVIEW at recorded origin/main `88ddf8c3`; no material
  disagreement. Dependency/CI integrations on main did not change this reviewed source target.
- **Stop reason:** suspend response for complete-set approval. Recommend both bounded corrections with focused
  regression checks, then offer a fix check and a further complete look because the mapping repair crosses writers.
  No fix check or successor pass is authorized. CI and staging evidence remain open separately.
- **Elapsed:** about 13 minutes from independent prompt creation through review/primary grounding and report
  storage; independent runtime was not separately measured.


### Code pass 1 — approved author-finding corrections (2026-11-11)

- **Approval:** Owner “yes, agreed” approved F1 and F2 with focused regression checks. This released implementation
  and task checks, not a commit, publication, fix check or successor review.
- **Performed dispositions:** F1 FIX (local correction, full verification scope); F2 FIX (local correction,
  comment-only). All approved response work is implemented; no disposition was changed.
- **F1:** the shared storage mapper runs only the existing title/poster_path model field validators and translates
  Django validation failure to UpstreamError. Movie detail validates the response as before and attempts card
  mapping/persistence only for an existing stored row. No truncation, numeric rule, migration or broad database
  exception catch was introduced. First-save and nightly paths consume the same mapper without separate fixes.
- **F2:** removed the two orphaned batch-policy comment lines from the Ruff configuration.
- **Red/green evidence:** 17 coupled regression cases were written together across four test files. Twelve failed
  behaviorally before production changes. The five already-passing 255-character/null cases then failed under a
  narrow over-restrictive guard; the exact production implementation was restored before further checks.
  All 63 tests across the four files pass. The two affected apps pass 657 tests; strict Pyright has zero errors,
  warnings or information diagnostics. Ruff, formatting, markdown and diff checks pass. Both covering Chromium
  smokes (movie detail and Back to Results) pass.
- **Retained evidence:** `card-storage-fix-red.log`, `card-storage-fix-green.log`,
  `card-storage-fix-valid-boundary-red.log`, `card-storage-fix-related.log`, `card-storage-fix-types.log`,
  and `card-storage-fix-smokes.log`. The full verification run predates these corrections; the affected surfaces
  were rerun, while the unaffected frontend suite/build/contrast/deploy checks were not repeated.
- **Repair snapshot:** `adversarial-review/code-pass1-approved-fixes.patch` and its source hashes in
  `adversarial-review/code-pass1-approved-fixes-target.json` bind the uncommitted repair for a possible fix check.
- **Task state:** 6.2 checked complete; 6.1 remains open for hosted CI evidence. Completion draft updated without
  claiming CI or staging proof. ADR acceptance remains prepared but uncommitted; the HEAD-only ADR check still
  needs the acceptance commit.
- **Response state:** approved fixes performed, independent repair verification not yet authorized. Recommend fix
  check round 1 for the shared mapping repair, then decide the further complete review after that check settles.
  The old independent clean source result does not cover this new repair target. No new pass is recorded here.


## Code review — fix check, round 1 since pass 1, delegated agent (local) (2026-11-11)

- **Authorization:** Owner approved fix check round 1 with “yes” after both corrections were implemented.
- **Runner:** fresh read-only general-purpose subagent `/root/code_fix_check_round1`, no inherited conversation;
  personal reads limited to the neutral prompt and the two exact repair artifacts. No author verification report,
  session notes, advisor record or execution claims supplied.
- **Target:** before `8346cb6dd97d5684290d52e50f55789f18dad5d4`, after the seven SHA-bound paths in
  `adversarial-review/code-pass1-approved-fixes-target.json`. The reviewer checked identity twice. The primary
  rechecked every hash at storage; no source changed during this look.
- **Rubric:** closure, behavioral grounding, propagation/completeness and new failure over the entire approved
  repair range and its surrounding source/PRD context.
- **Kept artifacts:**
  - `adversarial-review/prompt-code-pass1-round1.md`, role prompt, sha256 `c66d3e0f6b356782f05db9ca02cc273ca4db1d2ef07e0fae057e8645fab99712`.
  - `adversarial-review/code-pass1-approved-fixes.patch`, role repair range, sha256 `0208258441939345aeb7390ecb31cefb67cb668b04254fafb0039e5af962e3c6`.
  - `adversarial-review/code-pass1-approved-fixes-target.json`, role target, sha256 `ce4689a9a5b15def640024ff86228a1649cfc9b0ffcbf43b5649c544b11fa6d4`.
  - `adversarial-review/report-code-pass1-round1.md`, role report, sha256 `680568b6523a4d195699184c455920eaf6c971bb8e32d93529b676da81a38f21`.
- **Verified counts:** 0 critical, 0 major, 0 minor, 0 unsupported. No new disposition or repair is needed.
- **Closure:** F1 and F2 closed for their approved scope. The shared mapping rejects the two unsupported text
  lengths before a write in first save, stored detail and nightly refresh; ordinary unstored detail validation
  remains separate. The comment-only TOML edit changes no parsed configuration value.
- **Grounding and limits:** evaluator inspected actual assertions, unchanged original regression bodies and all
  caller paths. Its narrow real-field/schema characterization covered Unicode, empty/null and length boundaries.
  A host full-import probe could not execute due to unavailable libpq dependencies; no suite execution is claimed.
  Primary spot-check independently confirms identical parsed TOML and the unchanged source hashes. Actual Docker
  integration evidence remains the preceding 657-test run, two covering smokes and their documented task gates.
- **Shared cause:** F1's single mapping boundary is repaired across its three writers; no new instance or cause
  was identified. F2 remains separate comment cleanup.
- **Response performance:** complete; approved repairs author-grounded and independently checked. The round
  converged with no residual repair. No additional fix-check round is indicated.
- **Trend:** converging. Code pass 1 companion author checks: 1 major → fix check round 1: 0 material. The complete
  non-author pass itself had zero findings; this round covers the subsequently repaired range, not a new full pass.
- **Next decision:** recommend a fresh complete code review pass 2 over the updated aggregate because the material
  storage-mapping correction followed pass 1. This recommendation authorizes no new pass. CI and staging evidence
  remain open separately, and no commit or publication is authorized.
- **Stop reason:** fix-check chain converged; await the complete-pass decision. Elapsed: about 6 minutes
  from prompt creation through result storage.


## Code review — pass 2, delegated agent (local) (2026-11-11)

- **Authorization:** Owner approved a fresh full pass 2 with “yes”, following fix-check round 1.
- **Runner:** fresh read-only general-purpose subagent `/root/code_review_pass2`, no inherited conversation.
  Prior approved findings/repairs were supplied as context; author verification claims, reports, review logs and
  session notes were withheld. Personal reads were restricted to the prompt and two exact target artifacts.
- **Target:** complete aggregate from `a5a784f343550f21fd19a68538c7a0837697f900` through
  `8346cb6dd97d5684290d52e50f55789f18dad5d4`, plus the ten SHA-bound working-tree overlays, including the
  untracked completion draft. All 102 changed tracked paths and the untracked target were covered. Evaluator and
  primary rechecked HEAD, each overlay and byte-for-byte patch identity before the renumbering recorded below.
- **Rubric:** standard-review/v1 and implementation-audit, all five dimensions plus repository contract coherence.
  The report explicitly accounts for every dimension and the complete exact target, not just the repairs.
- **Kept artifacts:**
  - `adversarial-review/prompt-code-pass2.md`, role prompt, sha256 `09db7a08bdf1e8fe0d82ebe5128604003ed95fdce92121711ff3f7020822d1d7`.
  - `adversarial-review/code-pass2-target.json`, role target, sha256 `2c3aaceeeb5b08016825740f10a34dddb11f9fc734bc296e8171cd0553c4b75f`.
  - `adversarial-review/code-pass2.patch`, role aggregate diff, sha256 `b40402d4cb7c69bdccd74a34338c7dad9d7f0304c809f8b8aaf5f808aa48d90a`.
  - `adversarial-review/report-code-pass2.md`, role report, sha256 `528c3943e15ce715733b8114e069b55e3579f48f379adcd9673cae465cd30d86`.
- **Verified counts:** 0 critical, 0 major, 0 minor, 0 unsupported. No source-coverage gap or new disposition remains.
- **Grounding:** complete source coverage includes concurrency, ownership, constraints/migrations, Library reads,
  throttles, detail/refresh/maintenance, frontend/generated contracts, inherited changes and the approved repairs.
  Actual behavioral execution remains the primary's separately recorded checks; no new execution claim comes from
  this source review. F1 and F2 remain closed for their approved scope; no new instance or shared cause appeared.
- **Trend:** converged. Pass 1's author companion found one major and one minor, fix-check round 1 found no material
  defect in the approved repairs, and complete pass 2 finds no findings. Non-author pass 1 itself reported none;
  the primary's later reproduction supplied the material signal that required repair and re-review.
- **Alignment re-check:** META-PRD vision/out-of-scope remains unchanged. TECHNICAL-OVERVIEW at current recorded
  origin/main `3206071fb36999b0f9dd769810702f2f7b9e3d4e` now names Marquee as the default beside four adapted palettes. This change adds no
  styling policy or product scope disagreement to the movie-data work; the implementation continues to use
  semantic roles. Other newly recorded main changes concern dependency tooling.
- **Stop reason:** converged after a complete whole-target pass with no critical or major finding. End local review;
  no further pass or repair is indicated. Await explicit commit approval, then separately approved publication.
- **Remaining evidence:** Implemented criterion 12 still needs hosted CI type-drift evidence; staging refresh proof
  remains due after merge. Completion stays Draft and task 6.1 stays open. The accepted ADR needs its commit before
  the HEAD-only ADR check can see it.
- **Elapsed:** about 10 minutes from prompt creation through result storage and the final main alignment check.

### Post-review reference integration (2026-11-11)

- During the current-main check, `3206071f` contains ADR-041 for Marquee and ADR-042 for score dots. The completion
  workflow's number-collision rule requires renumbering this work's save decision.
- Renamed this change's decision to ADR-043, updated its heading, the ADR-025/026 status citations, and the task and
  completion records. The decision body is byte-identical; application/test/config source remains identical to
  full pass 2. No archival or raw review artifacts were rewritten to conceal their original reviewed identities.
- ADR-043 is free on the recorded main tree, remains Accepted (2026-11-11), and has unique local numbering.
  Markdown and reference checks cover this bookkeeping delta; no additional full code-review claim is made for it.


### Reviewed work committed (2026-11-11)

- Owner explicitly approved committing the reviewed corrections and completion preparation.
- `b31ec597` — reject unstorable card text before writes. Contains the seven reviewed source/test/config paths
  and the complete 6.2 repair record; no checkbox was separated from its implementation.
- `c5995ab5` — record verification and accept the save contract. Contains the remaining criterion evidence,
  completion draft and ADR-043 acceptance/reference integration.
- Normal pre-commit and commit-message hooks pass for both. The committed ADR-record check against origin/main
  passes with no problems. All reviewed repair source hashes are unchanged; the working tree and index are clean.
- No push or pull request was requested by this approval. Next is publication preparation and approval of its
  exact title/body. Hosted CI and post-merge staging evidence remain open; task 6.1 is not marked complete.


### Main integration before publication (2026-11-11)

- Owner explicitly approved merging main revision `9dd9d400` into this branch, resolving README with both the
  service-testing description and Marquee palette description, and running integration checks.
- Merge commit `b6783c1059a1478ea4dcb6b2b6d023faf71ee8cb` has the reviewed `c5995ab5` head and approved main revision as its parents. README was
  the only conflict and matches the prepared combined resolution. The auto-merged MovieCard change adds main's
  semantic foreground; its save behavior and the approved storage-boundary repair remain unchanged.
- Refreshed frontend dependencies from the merged lockfile, rebuilt/restarted only the worktree backend with
  the updated Python tool lock, refreshed the frontend container's dependency volume and restarted its server.
  Database and Redis volumes were preserved.
- Integration checks pass: 1,237 backend tests, 96.16% coverage; 2,609 frontend tests; all five Chromium smokes;
  Ruff lint/format, full Pyright (0 errors/warnings), ESLint, Chakra typegen, TypeScript, markdown, contrast and
  production build. API/schema regeneration has no diff. Unchanged deployment-script tests were not repeated.
- Normal merge-commit hooks pass. The debug-print advisory points at the contrast-report CLI's intended output;
  commit-message length is within the enforced limit. Committed ADR records pass against origin/main. Worktree clean.
- Exact integration results and logs retained under the work unit's publication evidence folder; the task list
  and completion draft record the current passing integration. No new source fix or full-review claim was added.
- PR title/body are drafted and await approval of their exact public wording. No push, PR creation, hosted review
  request, staging action or merge to main ran under this local integration approval. Hosted CI and post-merge
  staging proof remain open.

## Publication and CI correction (2026-11-11)

- Owner approved publication of `b6783c1059a1478ea4dcb6b2b6d023faf71ee8cb` with the presented title/body.
  Pushed the branch and opened PR #173: https://github.com/andrewRCr/CineXplorer/pull/173.
- CI run `43055091005`: backend tests, frontend, images, docs and API types pass. Backend checks
  (job `130642289095`) fail on eight unnecessary reportCallIssue suppressions in UserMovieData constraints;
  the local shared venv has django-types 0.22.0, while the lock and CI use 0.24.0.
- Reproduced all eight errors with Python 3.13.18, the exact locked development dependencies and pinned Pyright
  1.1.414. Removed the eight suppressions and stale explanation; the same check passes with zero errors/warnings
  and 26 informations. Ruff lint/format pass. AST comparison proves runtime code unchanged.
- API types job `130642288032` proves Implemented criterion 12 at the published head. Full CI remains failed;
  browser smoke was still pending at the failure stop. No hosted review requested or merge performed.
- Correction and evidence updates are uncommitted pending explicit commit/push approval. Task 6.1 stays open.

### CI correction published and verified (2026-11-11)

- Owner explicitly approved committing and pushing the three-file correction/evidence update.
  Commit `0c3be00a5962e28810628b447aa6399868e1bec9` passed normal hooks and was pushed to PR #173.
- CI run `43107100580` passes all required jobs, including `ci-ok`, backend checks/tests, frontend,
  API types, images, docs and end-to-end smoke. PR remained open at the exact head after collection.
- Verification metadata now closes Task 6.1 and marks the task list and PRD Complete. The completion document
  remains Draft for the post-merge staging criterion. These three documentation updates await commit approval.
- No hosted review requested and no merge performed.

### Final verification metadata published (2026-11-11)

- Owner approved committing/pushing the three verification documents. Commit
  `c426c177c14f7b180c11e67339390c0110d557f6` passed normal hooks and was pushed to PR #173.
- CI run `43109418385` passes every required job, including `ci-ok`; the PR head was rechecked and matches.
  Deployment and staging smoke are skipped on this pull-request run; no staging proof is claimed.
- Task 6.1, the task list and PRD are Complete; completion metadata remains Draft for post-merge staging proof.
- PR review route awaits the Owner’s choice. No hosted review requested and no merge performed.

### Additional PR review skipped by approval (2026-11-11)

- Owner approved skipping an additional PR review after the completed independent feature review and
  comment/document-only follow-ups. No hosted request was posted.
- Pre-merge preparation: fetched origin; ADR records check passes (43 numbered, 3 changed from merge base
  `9dd9d400`). PR #173 is open at `c426c177c14f7b180c11e67339390c0110d557f6`, mergeable,
  with no review threads and successful `ci-ok`.
- Staging credentials are not set in this session and no retained evidence identifies a saved staging movie.
  Ask the Owner to confirm the test account’s saved title/TMDB ID before the merge deploys. Explicit merge
  approval is still required; no staging commands or merge performed.

### Staging prerequisite confirmed (2026-11-11)

- Owner confirms watchlist persistence for Funny Games (1997), TMDB ID 10234, following the staging
  test-account save/refresh procedure. This identifies the movie that must survive deployment and nightly refresh.
- Owner also reported a search/detail year discrepancy. Public staging responses reproduce search
  `1998-03-11` versus detail `1997-09-11`; search requests `region=US`, already present on main.
  Propose a separate inbox capture, with no change to this branch. Neither capture nor merge is approved yet.
- No staging server command, merge, or post-merge refresh proof has run.

### Approved merge (2026-11-11)

- Owner explicitly approved merging PR #173 and capturing the date discrepancy as an inbox errand.
  Captured the errand in the primary inbox after a fresh read, preserving existing entries.
- Refreshed origin/main and ADR checks; exact head `c426c177c14f7b180c11e67339390c0110d557f6`
  remained open/mergeable, `ci-ok` succeeded, and the complete review-thread list was empty.
- Merged with method merge and expected-head SHA guard. GitHub returned merge commit
  `1cd9f8a0bef99c19d06ef5df167a06031d9a002b`, merged=true.
- Monitoring automatic main CI/deploy/smoke; no manual staging command or refresh proof claimed.

### Automatic deployment verified (2026-11-11)

- Main merge commit `1cd9f8a0bef99c19d06ef5df167a06031d9a002b` passes all CI jobs in
  run `43111144670`, including `ci-ok`, Deploy staging and Staging smoke.
- Public staging health returns HTTP 200 with status healthy after deployment.
- Saved staging movie is Funny Games (1997), TMDB ID 10234, confirmed by the Owner before deployment.
  The release-year inconsistency is captured as an errand in the primary inbox on approval.
- The post-merge criterion remains unchecked: await the scheduled maintenance heartbeat/journal with refresh
  count at least one and no stale IDs, then verify the test account’s Library vote fields for movie 10234.
  The documented timer runs at 10:30 am UTC (4:30 am CT); no manual staging command was run.
- Closure proceeds from the primary checkout after this worktree session ends. No branch deletion, archive,
  or additional commit/push is authorized or performed.

### Post-merge maintenance proof (2026-11-11)

- The Owner relayed the PM's recommendation to start the documented nightly maintenance service manually.
  Accepted that interpretation: the criterion tests the service's outcome after deployment, not the timer trigger.
- Declared a one-off staging hold, confirmed deployed commit `1cd9f8a0`, and ran the documented service
  from an ordinary SSH shell outside the operations lock. Invocation `c5eac3be609f4500a3926750dbe10ec6`
  runs from 4:36:26 pm to 4:36:38 pm CT, with `Refreshed: 6; failed: 0`, no stale IDs,
  `Result=success` and `ExecMainStatus=0` after its success-heartbeat step. The script uses curl --fail
  for the heartbeat, so its successful completion proves the success ping was accepted.
- Real HTTPS GET `/api/user-movie-data/movies?page_size=100` returns HTTP 200 for the unique active owner
  of saved movie 10234, retaining its watchlist state with vote_average 7.312 and vote_count 2224.
  Authentication used an in-memory 90-second AccessToken without a persisted session/token record.
  The first probe stopped before making a request because it incorrectly assumed a non-staff owner;
  the actual owner has staff access enabled, and the corrected probe verified that same account.
- The maintenance timer remains active for its normal next run. Released the staging hold after verification.
- All runtime criterion evidence is complete. Prepared and linted a two-file patch marking the post-merge
  criterion and completion metadata complete. No tracked files changed: the primary checkout applies it after
  this worktree session ends, with explicit confirmation for the relayed commit/archive proposal.

### Closing operations approved (2026-11-11)

- Owner directly approved the prepared two-file post-merge proof commit/push and archival cleanup, including
  the archive commit/push. This confirms the earlier relayed proposal; the approval persists for that scope.
- This worktree session hands off before removal. The primary checkout applies the linted proof, commits/pushes
  it, runs finish after this session ends, inspects the public archive and pushes the archive commit.
- No tracked changes remain in this worktree. The proof patch is prepared outside git; the task list
  retains its one post-merge unchecked box until the approved primary-checkout patch is applied.
