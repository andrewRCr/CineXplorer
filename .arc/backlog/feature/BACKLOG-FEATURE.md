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
