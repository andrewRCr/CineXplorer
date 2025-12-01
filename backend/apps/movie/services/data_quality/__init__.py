"""
Data quality filtering for TMDB API responses.

This package provides second-pass filtering applied to TMDB responses:
- filters: Filter implementations (blacklist, completeness, year, rating)
- policy: Rules for when/whether to apply filters (to be added in 7.2)

Import directly from submodules:
    from movie.services.data_quality.filters import apply_data_quality_filters
"""
