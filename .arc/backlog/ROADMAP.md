# Roadmap: Order of Operations

**Purpose:** Internal planning artifact documenting sequencing strategy for remaining work.
Subject to change as we learn.

**Last Updated:** 2025-12-19

---

## Current Sequencing Strategy

### Phase A: Technical Foundation (Quick Wins)

Small, well-scoped infrastructure work that enables better feature development.

1. **Toast Notification System** (~2-3 days)
   - Plan: `technical/plan-toast-notification-system.md`
   - Rationale: Enables user feedback for ALL subsequent feature work
   - Scope: Chakra UI Toast (zero deps), auth/watchlist/error feedback

2. **E2E Testing Foundation** (~1 week)
   - Plan: `technical/plan-backend-modernization.md` (E2E section)
   - Rationale: Creates regression safety net for feature development
   - Scope: Playwright setup, critical user flows (auth, browse, watchlist)

3. **Celery Infrastructure** (~3-4 days)
   - Plan: `technical/plan-backend-modernization.md` (Async section)
   - Rationale: Async email avoids blocking user registration; demonstrates production patterns
   - Scope: Celery worker setup, async email sending (ZeptoMail integration)

### Phase B: Feature Work

One PRD per feature (includes both backend and frontend work together).

4. **Movie Detail Page Polish**
   - Backlog: `feature/BACKLOG-FEATURE.md`
   - Rationale: Gateway to user actions, currently rough draft
   - Scope: Layout refinement, user action controls integration

5. **UserMovieData Feature UIs** (largest)
   - Plan: `feature/plan-user-movie-data-features.md`
   - Rationale: APIs complete, frontend needed; core user engagement features
   - Scope: Ratings, reviews, library, liked movies, log modal, watchlist enhancements
   - Note: TanStack Query expansion (optimistic updates) happens naturally here

6. **Movie Lists/Collections**
   - Plan: `feature/plan-user-movie-lists.md`
   - Rationale: User organization beyond watchlist, curated system collections for discovery
   - Scope: Backend models, CRUD APIs, list pages, 4 curated system collections, sidebar integration
   - Note: Enables future recommendations via TMDB keyword overlap

7. **Person Detail Pages**
   - Backlog: `feature/BACKLOG-FEATURE.md`
   - Rationale: Extends discovery, wiki-style interlinking
   - Scope: Actor/crew profiles, filmography, TMDB integration

8. **Featured Page Hero**
   - Currently: Stub implementation
   - Rationale: Landing page first impression; showcases featured/trending content
   - Scope: Hero carousel or spotlight section, dynamic content from TMDB trending
   - Note: Relatively small scope compared to other Phase B items

9. **Recommendations System**
   - Backlog: `feature/BACKLOG-FEATURE.md`
   - Rationale: Core value proposition; needs user rating data to be effective
   - Scope: Metadata-based recommendations, "For You" page
   - Note: May benefit from Celery for computation

### Phase C: Polish & Deploy

10. **Mobile Responsiveness Pass**
    - When: Feature-complete, before deployment
    - Rationale: Ensure touch-friendly UX and responsive layouts across all features
    - Scope:
      - Touch target sizing (44px minimum per WCAG)
      - Hover-dependent interactions → mobile alternatives
      - Grid/layout adjustments for small viewports
      - Form input sizing and mobile keyboard handling
      - Modal/drawer behavior on small screens
      - Performance (lazy loading, responsive images)
    - Note: Foundation exists (Chakra breakpoints, responsive props) - this is polish, not rewrite

11. **Visual Design / UX Pass**
    - When: Feature-complete
    - Scope: Consistency audit, accessibility review, visual polish
    - Note: Can overlap with Mobile Pass (related concerns)

12. **Deployment Enablement**
    - Backlog: `technical/BACKLOG-TECHNICAL.md`
    - Scope: Hosting strategy, secrets management, migration procedures, runbook

---

## Dependency Analysis

```
Toast System ─────────► All feature work (user feedback)
E2E Testing ──────────► All subsequent work (safety net)
Celery ───────────────► Recommendations (computation)
                        Email (non-blocking registration)
UserMovieData UIs ────► Recommendations (needs rating data)
Movie Lists ──────────► Recommendations (TMDB keyword overlap)
```

---

## Scoping Decisions

### Included

| Technology               | Rationale                                                   |
|--------------------------|-------------------------------------------------------------|
| Playwright E2E           | Regression protection, demonstrates testing expertise       |
| Celery/Redis             | Real use case (async email), demonstrates async patterns    |
| TanStack Query expansion | Happens naturally during UserMovieData (optimistic updates) |

### Lower Priority (Fit During Relevant Work)

| Technology            | Rationale                                                             | When                        |
|-----------------------|-----------------------------------------------------------------------|-----------------------------|
| Routing modernization | Portfolio consistency (Next.js App Router patterns), loader functions | Phase B if touching routing |

### Skipped

| Technology    | Rationale                                              |
|---------------|--------------------------------------------------------|
| Redux Toolkit | No genuine use case currently; would be resume-padding |
| DI Framework  | Evaluate when mock paths exceed 20+ constants          |

### Not Blocking Deployment

| Item                     | Status                                    |
|--------------------------|-------------------------------------------|
| Observability/monitoring | Nice-to-have, not required for MVP deploy |
| Security hygiene docs    | Can document post-deploy                  |
| Portfolio storytelling   | Post-deploy activity                      |

---

## Open Questions

- **Search Results Filtering**: Backend supports it, frontend doesn't expose it. Include in Phase B or defer?

**Resolved:**

- ~~Featured Page Hero~~: Added as Phase B item #8 (relatively small scope).
- ~~Atomic Tasks~~: Interleave with phases. They bubble up naturally or get bundled when touching related domains.

---

## Change Log

- **2025-12-19**: Added Mobile Responsiveness Pass (Phase C #10), Featured Page Hero (Phase B #8)
- **2025-12-19**: Initial roadmap created after service-layer-modernization completion
