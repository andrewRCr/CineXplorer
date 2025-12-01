# Feature Backlog

**Purpose:** Organized collection of feature ideas that will become work units.

**Structure:** Use domain-based sections. When scope is defined, graduate to:

- `plan-{name}.md` (planning/analysis phase)
- `prd-{name}.md` (ready for task generation, delete plan file)

Then **delete** the item from this file (no strikethrough clutter).

**This file contains ONLY non-atomic ideas** - simple one-offs go to `active/ATOMIC-TASKS.md`.

---

## User Authentication & Profiles

<!-- Feature ideas related to user accounts, login, profiles -->

## Discovery & Search

- **Language Filter** - Filter movies by original language. TMDB returns `original_language` in list responses (no extra
API calls needed). Implementation: Add to AdvancedMovieFilters dropdown. Options: "Any Language" (default), "English",
"Non-English", or full language selector (ISO 639-1 codes). Simple win - data already available in responses. Could
combine with existing genre/year/rating filters. Priority: HIGH (low effort, high value)

- **Certification/Rating Filter (Consider)** - Filter by content rating (G, PG, PG-13, R, etc.). TMDB supports filtering
via `certification_country` + `certification` params. Caveat: Certification NOT returned in list responses (can filter
but can't display without N+1 API calls). UX consideration: Must specify country (US=MPAA, GB=BBFC, etc.) - either
default to US or let user select their region's system. Movies without certification data in selected country would
be excluded. Priority: MEDIUM (adds parental control value, but country selection adds UX complexity)

- **Featured Page Hero Implementation** - Rich hero-style Featured page at `/featured` replacing current stub. Research
needed: TMDB trending/popular endpoints (`/trending/*`, `/movie/popular`), industry patterns (TMDB, Letterboxd, Netflix
hero sections, horizontal scrolling). Content strategy: trending movies, popular this week, featured collections, new
releases. Layout patterns: hero sections, horizontal scrolls, grid layouts. Should complement Browse/Now Playing/Upcoming
pages. Currently has functional stub with navigation links. See ADR-002 for architectural context. Priority: MEDIUM
(enhances landing experience, but stub is functional)

- **Person Detail Pages (Actors/Crew)** - Actor and key crew profile pages with biography, filmography, and wiki-style
interlinking between movies and people. TMDB API supports this. URL pattern: `/person/{tmdb_person_id}`.
Mirror MovieDetail page structure. Priority: MEDIUM (enhances discovery)

## Notifications & Alerts

<!-- Feature ideas for user notifications, email, push -->

## User Movie Data

- **Movie Detail Page Polish** - Current page is functional but rough draft. Needs: polished layout and design, user
action controls integration (watchlist/rating/review/liked features), cast/crew member links, related movies section.
Priority: HIGH (core feature, gateway to user actions)

- **"For You" Recommendations Page** - Personalized movie recommendations using metadata-based recommendation engine.
Algorithms: genre matching, director/actor preferences, rating similarity. Display with explanations
("Because you liked X"). Requires substantial user rating data to be effective. Leverage TMDB keywords for
improved matching. Priority: HIGH (core value proposition of app)

## Unsorted

<!-- Temporary holding area - sort into sections during weekly review -->
