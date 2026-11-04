# Data Quality Strategy

**Version:** 1.1 | **Updated:** 2026-11-04 | **Status:** Active

## Purpose

Authoritative reference for CineXplorer's data quality filtering system. Covers the two-pass
filtering architecture, the 5-stage backend filter pipeline, vote count and completeness policies,
and TMDB API quirks. Use when debugging filter behavior, adjusting quality thresholds, or
understanding why certain movies are excluded.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Two-Pass Filtering](#two-pass-filtering)
3. [Backend Filter Pipeline](#backend-filter-pipeline)
4. [Vote Count Policy](#vote-count-policy)
5. [Completeness Policy](#completeness-policy)
6. [TMDB API Quirks](#tmdb-api-quirks)
7. [Content Pool Depletion](#content-pool-depletion)
8. [Key Files Reference](#key-files-reference)

---

## Architecture Overview

### The Problem

TMDB contains millions of movie entries, but not all are suitable for display:

- Incomplete metadata (missing posters, overviews, genres)
- Unreleased films with no ratings
- Mislabeled content (adult films marked as non-adult)
- Data quality varies significantly by content type

### The Solution

A **two-pass filtering** architecture:

1. **TMDB API filters** - Initial filtering via API parameters (certification, genres, year, etc.)
2. **Backend hygiene filters** - Second-pass cleanup for data quality issues TMDB doesn't catch

```
User Request: Browse R-rated Action movies
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Pass 1: TMDB API Filters                                    │
│ - certification=R, certification_country=US                 │
│ - with_genres=28 (Action)                                   │
│ - sort_by=popularity.desc                                   │
│ → Returns 20 movies per page                                │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Pass 2: Backend Filter Pipeline (5 stages)                  │
│ 1. Language Script Filter                                   │
│ 2. Blacklist Filter                                         │
│ 3. Completeness Filter                                      │
│ 4. Year Filter                                              │
│ 5. Rating Filter                                            │
│ → Returns 15-20 movies (some filtered out)                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
Buffer mechanism compensates if < 20 results
(see strategy-pagination.md)
```

---

## Two-Pass Filtering

### Pass 1: TMDB API Filters

Applied via query parameters to TMDB's `/discover/movie` endpoint.

| Parameter                  | Example           | Purpose                     |
|----------------------------|-------------------|-----------------------------|
| `certification`            | `R`               | MPAA rating filter          |
| `certification_country`    | `US`              | Required with certification |
| `with_genres`              | `28,12`           | Include genres (AND logic)  |
| `without_genres`           | `99`              | Exclude genres              |
| `primary_release_date.gte` | `2020-01-01`      | Year range start            |
| `primary_release_date.lte` | `2025-12-31`      | Year range end              |
| `vote_average.gte`         | `7.0`             | Minimum rating              |
| `sort_by`                  | `popularity.desc` | Sort order                  |
| `with_original_language`   | `en`              | Language filter             |

### Pass 2: Backend Hygiene Filters

Applied in `apply_data_quality_filters()` after TMDB response.

Why needed:

- TMDB can't filter on "has poster" or "has overview"
- TMDB has mislabeled content we want to exclude
- Historical validation (fake release dates)
- Vote count thresholds for rating reliability

---

## Backend Filter Pipeline

Located in `filters.py:apply_data_quality_filters()` (lines 159-215).

### Stage 1: Language Script Filter

**Purpose:** Detect mislabeled content (e.g., Japanese film claiming to be English).

```python
def _passes_language_script_filter(movie, language_filter) -> bool:
    if not language_filter:
        return True  # No filter = pass all

    # Check if title contains characters inconsistent with claimed language
    # e.g., "en" language but title has Japanese characters
    return not has_script_mismatch(movie.title, language_filter)
```

**When it activates:** Only when user specifies a language filter.

### Stage 2: Blacklist Filter

**Purpose:** Exclude specific TMDB IDs known to be problematic, mostly adult titles TMDB doesn't flag as adult.

```python
def filter_movies_by_blacklist(movies):
    blacklist_ids = get_blacklisted_ids()  # BlacklistedMovie table, cached 5 minutes
    return [m for m in movies if m.tmdb_id not in blacklist_ids]
```

**Source of truth:** `backend/apps/movie/data/blacklist.csv`, tracked in the repository: one row per TMDB ID with
its reason and source, and no titles or other TMDB content. A `rule:` row belongs to a rule in `blacklist_rules.py`
(a production company's catalogue, optionally limited to an era), which `regenerate_blacklist` rewrites from TMDB's
discover endpoint; a `hand:` row is a reviewed pick, many of them recognisable only from the poster. A hand pick keeps
an ID a rule also matches.

**Maintenance:** change the file in a pull request (a new hand pick, or a rule and its regenerated rows). The
`sync_blacklist` command makes the table match the file and clears the cache; it runs at dev setup, after a database
reset and in every deploy. The admin shows the table read-only, so nothing is edited in place and lost with a
database.

### Stage 3: Completeness Filter

**Purpose:** Ensure movies have minimum required metadata.

```python
def _passes_completeness_filter(movie) -> bool:
    return all([
        movie.poster_path,      # Has poster image
        movie.title,            # Has title (always true)
        movie.genre_ids,        # Has at least one genre
        movie.overview,         # Has description
    ])
```

**Impact:** This is the most aggressive filter. NC-17 and niche content often fails here
due to incomplete TMDB data.

### Stage 4: Year Filter

**Purpose:** Validate release dates are reasonable.

```python
EARLIEST_VALID_RELEASE_YEAR = 1888  # First film ever made

def _passes_year_filter(movie, min_year, max_year) -> bool:
    if not movie.release_date:
        return False

    year = parse_year(movie.release_date)

    # Historical validation
    if year < EARLIEST_VALID_RELEASE_YEAR:
        return False

    # User-specified range
    if min_year and year < min_year:
        return False
    if max_year and year > max_year:
        return False

    return True
```

### Stage 5: Rating Filter

**Purpose:** Ensure ratings are reliable (sufficient vote count).

```python
def _passes_rating_filter(movie, min_rating, max_rating, sort_by) -> bool:
    # Get vote count threshold based on context
    threshold = VoteCountPolicy.get_threshold(sort_by)

    if movie.vote_count < threshold:
        return False  # Rating not reliable

    # Apply rating range if specified
    if min_rating and movie.vote_average < min_rating:
        return False
    if max_rating and movie.vote_average > max_rating:
        return False

    return True
```

---

## Vote Count Policy

Located in `policy.py:VoteCountPolicy`.

### The Problem

A movie with `vote_average: 9.5` but `vote_count: 2` isn't meaningfully rated.
We need minimum vote thresholds for rating reliability.

### Tiered Thresholds

| Tier       | Threshold | When Applied                                               |
|------------|-----------|------------------------------------------------------------|
| `STRICT`   | 200 votes | Rating sorts without rating bounds                         |
| `MODERATE` | 3 votes   | General browsing and rating sorts with rating bounds       |
| `BYPASS`   | `None`    | Contexts needing complete results or allowing new releases |

### Logic

`get_threshold()` takes the endpoint first. `EndpointType` accepts `"browse"`, `"search"`, `"now_playing"` and
`"upcoming"`. Endpoint bypass takes precedence over sorting and filters; browsing without a sort uses MODERATE.

The decision order below combines `get_threshold()`, `_get_sort_threshold()` and `_is_recent_content()` into one sketch:

```python
from datetime import UTC, datetime
from typing import Literal

EndpointType = Literal["browse", "search", "now_playing", "upcoming"]


class VoteCountPolicy:
    STRICT_THRESHOLD = 200
    MODERATE_THRESHOLD = 3
    RECENT_YEAR_BUFFER = 1

    @classmethod
    def get_threshold(
        cls,
        endpoint: EndpointType = "browse",
        sort_by: str | None = None,
        year_max: int | None = None,
        rating_min: float | None = None,
        rating_max: float | None = None,
    ) -> int | None:
        if endpoint in ("search", "now_playing", "upcoming"):
            return None
        if not sort_by:
            return cls.MODERATE_THRESHOLD

        if "vote_average" in sort_by:
            if rating_min is not None or rating_max is not None:
                return cls.MODERATE_THRESHOLD
            return cls.STRICT_THRESHOLD

        if "original_title" in sort_by:
            return cls.MODERATE_THRESHOLD
        if sort_by == "popularity.asc":
            return None

        if "release_date" in sort_by:
            recent = year_max is None or year_max >= datetime.now(UTC).year - cls.RECENT_YEAR_BUFFER
            if sort_by.endswith(".desc") and recent:
                return None

        return cls.MODERATE_THRESHOLD
```

A missing upper year bound can include recent releases. An explicit bound is recent when `year_max` is at least
the current UTC year minus `RECENT_YEAR_BUFFER` (1). Newest-first release-date sorts bypass in either case.
Historical newest-first and all oldest-first release-date sorts use MODERATE. `popularity.desc`, unrecognized
sorts and the default browse context also use MODERATE. Either non-`None` rating bound selects MODERATE for a
rating sort, including a bound of `0`.

### Rationale

- **STRICT (200):** Rating sorts without rating bounds need enough votes for a meaningful ranking.
- **MODERATE (3):** Light spam filtering preserves niche content and rating-band browsing.
- **BYPASS (`None`):** Search and least-popular browsing favor completeness; new and unreleased films may lack votes.

---

## Completeness Policy

Located in `policy.py:CompletenessPolicy`.

### Required Fields

| Field         | Required | Rationale                           |
|---------------|----------|-------------------------------------|
| `poster_path` | Yes      | MovieCard needs poster image        |
| `title`       | Yes      | Always present (TMDB requirement)   |
| `genre_ids`   | Yes      | Genre display, filtering            |
| `overview`    | Yes      | Movie detail page needs description |

### Rejection Rates by Content Type

Measured during NC-17 investigation (2025-12-15):

| Content Type   | TMDB Total | After Completeness | Rejection Rate |
|----------------|------------|--------------------|----------------|
| NC-17 (US)     | 353        | ~231               | ~35%           |
| R (US)         | 15,306     | ~14,500            | ~5%            |
| Popular genres | High       | Very high          | ~2-5%          |

Niche content has higher rejection rates due to less community attention on TMDB.

---

## TMDB API Quirks

### certification_country Required

```bash
# WRONG - TMDB ignores certification filter
curl '.../discover/movie?certification=NC-17'
# Returns: 208,984 results (all movies!)

# CORRECT - certification filter applied
curl '.../discover/movie?certification=NC-17&certification_country=US'
# Returns: 353 results (actual US NC-17 movies)
```

**Frontend handles this:** `browseParamMapper.ts` always adds `certification_country=US`
when certifications are selected.

### X Rating Mapping

TMDB maps the obsolete X rating (replaced by NC-17 in 1990) to NC-17.
This inflates NC-17 counts with historical X-rated films.

### Data Quality Variance

| Content Category       | TMDB Data Quality |
|------------------------|-------------------|
| Hollywood blockbusters | Excellent         |
| Popular international  | Good              |
| Indie/arthouse         | Variable          |
| NC-17/adult-adjacent   | Poor              |
| Very old films         | Variable          |

### vote_average with vote_count=0

TMDB returns `vote_average: 0.0` when `vote_count: 0`. This is not "terrible rating" but "no rating data." The vote
count policy leaves several surfaces unfiltered (search, now playing, upcoming, some browse sorts, the detail page), so
the score display handles it: `MovieUserScore` shows a neutral badge, never "0.0", below `SCORE_DISPLAY_MIN_VOTES`.

---

## Content Pool Depletion

### Definition

When source data (after all filters) is smaller than expected, users see fewer results.
**This is correct behavior, not a bug.**

### Depletion Cascade

```
TMDB Universe: 1,000,000+ movies
        │
        ▼ TMDB API Filters (certification, genre, year)
Filtered Pool: 15,000 movies
        │
        ▼ Backend Completeness Filter
Complete Data: 14,000 movies
        │
        ▼ Backend Vote Count Filter
Reliable Ratings: 13,500 movies
        │
        ▼ User sees: 13,500 available results
```

For restrictive filters, the cascade can be severe:

```
NC-17 (US) Query:
TMDB: 353 movies
        │
        ▼ Completeness (~35% fail)
~231 movies
        │
        ▼ User sees: 231 results across ~12 pages
```

### User-Facing Behavior

- Pagination ends naturally when content exhausted
- "No more results" displayed (not an error)
- `total_results` in header shows TMDB's count (may differ from displayable count)

---

## Key Files Reference

| File                      | Location                                         | Purpose                             |
|---------------------------|--------------------------------------------------|-------------------------------------|
| `filters.py`              | `backend/apps/movie/services/data_quality/`      | Filter pipeline implementation      |
| `policy.py`               | `backend/apps/movie/services/data_quality/`      | VoteCountPolicy, CompletenessPolicy |
| `param_transformer.py`    | `backend/apps/movie/services/api_boundary/`      | TMDB param transformation           |
| `query_params.py`         | `backend/apps/movie/services/tmdb_api_boundary/` | Query parameter handling            |
| `browseParamMapper.ts`    | `frontend/src/utilities/`                        | Frontend → API param mapping        |
| `blacklist.csv`           | `backend/apps/movie/data/`                       | Blacklist source of truth           |
| `blacklist_file.py`       | `backend/apps/movie/services/data_quality/`      | Blacklist file read, write, sync    |
| `blacklist_rules.py`      | `backend/apps/movie/services/data_quality/`      | Blacklist rules and TMDB fetch      |
| `sync_blacklist.py`       | `backend/apps/movie/management/commands/`        | Load the file into the table        |
| `regenerate_blacklist.py` | `backend/apps/movie/management/commands/`        | Rewrite rule rows from TMDB         |

---

## Version History

- **1.1** (2026-11-04): Blacklist kept as a tracked file, synced into the table
- **1.0** (2025-12-15): Initial strategy document
