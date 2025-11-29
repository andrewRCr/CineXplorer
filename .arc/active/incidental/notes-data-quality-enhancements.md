# Notes: Data Quality Enhancements

**Task List:** `tasks-data-quality-enhancements.md`

---

## Production Company Research

### Verified for Blacklist

| Company            | TMDB ID | Verdict | Rationale |
|--------------------|---------|---------|-----------|
| *Research pending* | -       | -       | -         |

### Skipped (Mixed Catalog)

| Company            | TMDB ID | Verdict | Rationale |
|--------------------|---------|---------|-----------|
| *Research pending* | -       | -       | -         |

---

## Filter Policy Decisions

### Vote Count Thresholds by View/Sort

| View/Sort          | Current | Proposed | Rationale                                             |
|--------------------|---------|----------|-------------------------------------------------------|
| Browse (default)   | 10      | 10       | Standard data quality threshold                       |
| Now Playing        | None    | None     | New releases need time to accumulate votes            |
| Upcoming           | None    | None     | Unreleased movies have 0 votes                        |
| `original_title.*` | None    | TBD      | Research needed - balance obscure vs problematic      |
| `release_date.*`   | None    | TBD      | New releases, similar to Now Playing                  |
| `popularity.asc`   | None    | None     | Intentionally returns low-interaction content         |
| `vote_average.*`   | 10      | 10       | Rating sort needs vote count for statistical validity |

---

## Technical Decisions

### Production Company Filtering Approach

**Decision:** TBD (Phase 3.1.2)

**Options:**

- **Option A:** Filter in `apply_buffer_if_needed`
    - Pro: Single filtering location
    - Con: Requires production company data in movie response

- **Option B:** Filter in `apply_filters` before buffer
    - Pro: Earlier filtering, less data processed
    - Con: Adds complexity to filter chain

**Chosen:** TBD after examining TMDB response structure

---

## Session Log

### 2025-11-29

- Created task list structure
- Movie blacklist already implemented (Phase 1.1 complete)
- Identified 6 sample problematic movies for research
- Discovered Z-A clustering caused by full-width Unicode characters
