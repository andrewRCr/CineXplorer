# Feature Backlog

**Purpose:** Organized collection of feature ideas that will become work units.

**Structure:** Use domain-based sections. When scope is defined, graduate to:

- `plan-{name}.md` (planning/analysis phase)
- `prd-{name}.md` (ready for task generation, delete plan file)

Then **delete** the item from this file (no strikethrough clutter).

**This file contains ONLY non-atomic ideas** - simple one-offs go to `active/ATOMIC-TASKS.md`.

---

## User Authentication & Profiles

- **Username Requirement Evaluation** - Consider whether username should remain required on registration. Current state:
username required, users can login with username OR email. Context: App positioned as "Letterboxd without the fluff"
(movie discovery minus heavy social/content creep), but stretch goal is forward-compatibility with minimal social
features (follows, shared lists) if scope expands later. Options analyzed: (A) Keep required (current) - forward-compatible
with social; (B) Make optional with email prefix auto-generation - REJECTED (privacy exposure, collision handling);
(C) Make optional with display name/UUID fallback - simpler UX but migration pain if social added. Recommendation: Keep
current approach - migration from email-primary to username-primary would force existing users to pick usernames.
Related: first_name/last_name fields exist but aren't on registration form (decluttering decision). Priority: LOW
(current approach works, this is a "nice to revisit" consideration)

## Discovery & Search

- **Search Results Filtering** - Add year/rating filters to search results page. Backend `search_movies()` already
supports `year_min`, `year_max`, `rating_min`, `rating_max` parameters - frontend just doesn't expose them yet.
Implementation notes: Create frontend `SearchParams` type (parallel to `BrowseParams`) for consistency with
`SearchServiceParams` backend type. Could reuse existing filter components from browse. Priority: MEDIUM (improves
search UX, backend support already exists)

- **Global Search Expansion** - When people/keywords features are more fully implemented, revisit navbar search to
support multiple entity types. Consider: movie/people toggle (radio, movie default), keyword search inclusion, or
keeping it simple with just movie/people. Letterboxd's global search is bloated (podcasts?); we should be more
focused. Evaluate when people/keyword implementations clarify how we want these features to work. Priority: LOW
(dependent on other features being implemented first)

- **Browse-Level Quick Movie Finder** - Consider re-adding a movie-specific search/finder to the browse bar IF global
search becomes multi-entity. Letterboxd has "Find a film" (typeahead → direct to detail) alongside their global
search. Only makes sense if global search serves different purpose (multi-entity). If global search stays movie-only,
this would be redundant. The `ExpandableSearchInput` component (preserved in components/common/) could be reused.
Evaluate alongside Global Search Expansion decision. Priority: LOW (dependent on Global Search direction)

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

<!-- Temporary holding area - sort into sections at the drain -->
