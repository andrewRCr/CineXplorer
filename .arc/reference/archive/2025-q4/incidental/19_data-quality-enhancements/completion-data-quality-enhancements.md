# Completion: Data Quality Enhancements

**Completed**: 2025-12-07
**Branch**: `technical/service-layer-modernization`
**Category**: Incidental
**Context**: Discovered during manual testing of Z-A title sort - problematic TMDB content slipping through filters

## Summary

Comprehensive data quality improvements to the browse/discover feature, addressing TMDB content that bypasses
the `adult: false` filter. Established movie blacklist infrastructure, centralized vote count policy, reorganized
backend services architecture, and added language and certification filters with conditional sort availability.

## Key Implementation Details

- **Movie blacklist system**: 2,281 movies blacklisted from 10 problematic production companies (pink film studios),
  including bulk blacklist of Nikkatsu Roman Porno era (1971-1988)
- **Vote count policy centralization**: Single source of truth in `data_quality/policy.py` with context-aware
  thresholds (rating filter presence, endpoint type, sort direction)
- **Services directory reorganization**: Clear separation into `tmdb_api_boundary/`, `api_boundary/`,
  `data_quality/`, and `pipelines/` packages
- **Language filter + conditional alphabetic sort**: Title A-Z only available for Latin-script languages;
  Z-A removed entirely due to TMDB Unicode sorting limitations
- **Certification filter**: MPAA ratings (G, PG, PG-13, R, NC-17) with color-coded badges; documented API
  limitation for NC-17 (see ADR-019)

## Metrics

- **Phases Completed**: 11 phases (2 pivoted/removed during execution)
- **Key Deliverables**:
    - `data_quality/policy.py` - Centralized filtering rules
    - `data_quality/filters.py` - 4-stage data quality pipeline
    - `populate_blacklist` management command
    - `CertificationBadge`, `CertificationFilter` components
    - Language filter dropdown with 19 language options
- **Tests Added**: 578 backend tests, 507 frontend tests (final counts)
- **Quality Gates**: Linting clean, TypeScript 0 errors, Pyright 0 errors
- **Movies Blacklisted**: 2,281 total

## Related Documentation

- Tasks: `tasks-data-quality-enhancements.md`
- Notes: `notes-data-quality-enhancements.md`
- Completion: `completion-data-quality-enhancements.md`
- ADR: `adr-019-accept-tmdb-certification-filtering-limitation.md`

## Follow-Up Work

- Test gap items deferred (smoke tests, error scenarios) - documented in notes file
- Cross-page deduplication remains xfail - tracked separately in buffer-deduplication task list
