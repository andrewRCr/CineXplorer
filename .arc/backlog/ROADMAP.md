# Roadmap: Order of Operations

**Purpose:** The order of the work remaining before launch, and what is in and out of launch scope. Subject to change
as we learn.

**Last Updated:** 2026-11-13

---

## Goal

CineXplorer public, live and finished: the launch scope below deployed at a public URL with a demo login, and the
README matching what shipped. Scope may be cut, but what ships is finished.

Work resumed on 2026-10-30 in five stages. Stages 0–3 are complete; Stage 4 builds the launch features and the layout
overhaul.

---

## Completed

### Stage 0: Reset ✅ (2026-10-30)

The repository brought back to health: the toolchain on Node 26 and Python 3.13, CI reshaped around one required
`ci-ok` check with SHA-pinned actions and a read-only token, secrets kept out of images and CI, and branch protection
on `main`. Delivered as pull requests #10–#13 and repository settings; this stage has no archive.

### Stage 1: Process Port ✅ (2026-10-30 to 2026-10-31)

The in-repository process brought up to date with the ARC framework's methods, then made safe for parallel sessions.

- **Review and planning methods**
    - Archive: `reference/archive/2026-q4/technical/01_process-port-review/`
    - Delivered: planning audits, a size check and an independent review loop; completion split into verification and
      code review
- **Session and commit routine**
    - Archive: `reference/archive/2026-q4/technical/02_process-port-routine/`
    - Delivered: per-work-unit session notes, a capture inbox, one-concern errands with their own pull requests, and the
      commit format
- **Parallel sessions**
    - Archive: `reference/archive/2026-q4/technical/03_parallel-sessions/`
    - Delivered: sessions in git worktrees with a test-only backend stack each, and each check placed at the moment its
      failure must be fixed

### Stage 2: First Change Through the Ported Process ✅ (2026-10-31)

The salvaged score-badge work: its traffic-light colors (#21), then the low-vote badge.

- **Score badge below 10 votes**
    - Archive: `reference/archive/2026-q4/technical/04_score-badge-low-votes/`
    - Delivered: a neutral badge where fewer than 10 votes back the TMDB score, in place of a colored score

### Stage 3: Deployment ✅ (2026-10-31 to 2026-11-05)

Completes **Deployment Enablement**, item 13 of the previous roadmap, with the staging deploy and launch readiness
below. The repository went public under the MIT license on 2026-11-03, with the README brought in line with what the
app does today.

- **Email library fix, upstream** (2026-10-31)
    - Archive: `reference/archive/2026-q4/incidental/05_zoho-zeptomail-upstream-fix/`
    - Delivered: the multipart email fix merged in `django-zoho-zeptomail` 0.0.4, and CineXplorer's workaround removed
- **Staging deploy** (2026-11-03)
    - Archive: `reference/archive/2026-q4/technical/06_staging-deploy/`
    - Delivered: production images built and checked in CI, a Compose stack behind Caddy's automatic TLS on a public
      staging host, and a runbook with a rehearsed deploy, rollback and roll-forward
- **Browsable stack per worktree** (2026-11-04)
    - Archive: `reference/archive/2026-q4/technical/07_worktree-stack/`
    - Delivered: each worktree serves the full app on its own ports, with its own database and development data
- **Launch readiness** (2026-11-05)
    - Archive: `reference/archive/2026-q4/technical/08_launch-readiness/`
    - Delivered: deploys from `main` after CI passes, nightly off-server database backups with a rehearsed restore,
      scheduled cleanup, health checks with outage alerts, and sign-in by email, Google and GitHub live on staging,
      with email verification and password reset

### Earlier

- **Toast Notification System** ✅ (2025-12-25)
    - Archive: `reference/archive/2025-q4/technical/26_toast-notification-system/`
    - Delivered: Chakra UI toaster with semantic tokens, auth/watchlist/error feedback

---

## Stage 4: Launch Features and the Layout Overhaul

Started 2026-11-06.

### 1. First: E2E Smoke Tier ✅ (2026-11-07)

Five Playwright specs in Chromium cover sign-up, sign-in and sign-out, browse, movie detail, and the scroll position
restored after a reload, with an axe accessibility scan on each page they reach. CI runs them against the development
stack on every pull request, and against staging after each deploy, without sign-up. The watchlist's spec follows the
user-movie data work. Specs find elements by role and accessible name, so the overhaul doesn't break them, and every
later work unit keeps them green.

- Archive: `reference/archive/2026-q4/technical/09_e2e-smoke/`

### 2. Then, in Two Tracks

**Design track:**

1. **Palette** ✅ (2026-11-11): Marquee, CineXplorer's own default palette (antique brass on warm black, a deep-cream
   light mode), with movie scores shown as a colored dot beside a neutral number. The four existing palettes remain.
   Archive: `reference/archive/2026-q4/technical/10_palette/`
2. **Navigation shell** ✅ (2026-11-12): one responsive top bar and one Films catalog with All films, In theaters and
   Coming soon release windows; pages keep their navigation and footer while loading or showing an error.
   Archive: `reference/archive/2026-q4/technical/12_navigation-shell/`
3. **Landing page,** then the **privacy and terms pages**

**Data track:**

- **User-movie data** ✅ (2026-11-12): one consolidated layer for watchlist, watched, liked, rating and review, with
  the frontend's server state on TanStack Query. Every user feature builds on it.
  Archives: `reference/archive/2026-q4/technical/11_user-movie-data/` and
  `reference/archive/2026-q4/technical/13_frontend-server-state/`

### 3. After Those

- **Movie detail redesign:** backdrop, one action bar, a cast rail and a responsive layout; cast and crew link to
  their TMDB pages
- **Core user-movie UIs:** watched, liked, rating and review controls on cards and the detail page, the Library, and
  the watchlist as a poster grid. **Log** is their rating screen: one form for watched, the date, rating and review,
  opened from cards, the detail page and the navigation's Log button
- **Responsive and global finish:** a mobile pass, page titles, Open Graph tags, a favicon, the footer and an
  accessibility spot-check
- **Profile and Settings:** Profile made minimal, Settings removed
- **Demo account,** so visitors can try the app without registering
- **Launch:** production deployment, and the README and screenshots reconciled with what shipped, including a
  data-quality section on what the app filters out of TMDB's results

---

## Dependency Analysis

```
E2E smoke tier ─────────► every later work unit (each keeps it green)
Palette ────────────────► all layout work
Navigation shell ───────► landing page
User-movie data ────────► core user-movie UIs and Log, movie detail redesign, the watchlist's smoke spec
```

---

## Scope

### In Launch Scope

Everything in Stage 4 above.

### Not Committed

Each goes back in, in this order, as progress shows room:

1. Watchlist drag-and-drop ordering and a Next Up queue
2. Similar movies on the detail page
3. Person pages (until then, cast and crew link to TMDB)
4. Password feedback on the sign-up form
5. Search-page filters
6. Error reporting
7. Two more palettes: Gruvbox and Rouge

### Cut

- Recommendations
- Celery (its one use was async email)
- Movie lists and collections
- Journal and Favorites
- The full E2E testing foundation (replaced by the smoke tier)
- Routing modernization (already on React Router 7, working)
- Observability beyond logs, health checks and outage alerts
- A performance program
- Backend refactors such as a DI framework
- Global search expansion

---

## Change Log

- **2026-11-07**: E2E smoke tier marked complete with its archive
- **2026-11-06**: Watchlist drag-and-drop ordering and Next Up move from Cut to the top of Not Committed
- **2026-11-06**: The smoke tier's watchlist spec follows the user-movie data work
- **2026-11-06**: Rewritten at Stage 4's start: Stages 0–3 marked complete with their archives, Deployment Enablement
  (item 13) with them; Stage 4's order and the launch scope replace Phases A–C
- **2025-12-26**: Added Mobile Responsiveness Remediation (#3) as E2E follow-up; renumbered subsequent items;
  updated Mobile Pass (#11) to be conditional on remediation completeness
- **2025-12-26**: Updated E2E Testing Foundation (#2) with PRD reference and mobile discovery scope
- **2025-12-19**: Added Mobile Responsiveness Pass (Phase C #10), Featured Page Hero (Phase B #8)
- **2025-12-19**: Initial roadmap created after service-layer-modernization completion
