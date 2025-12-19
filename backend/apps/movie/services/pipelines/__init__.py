"""
Response processing pipelines.

This package provides multi-stage processing workflows for movie data:
- paginated: Fetch-filter-buffer pipeline for paginated list responses
- batch: Batch fetching for multiple movie details

Import directly from submodules:
    from apps.movie.services.pipelines.paginated import fetch_with_filters_and_buffer
    from apps.movie.services.pipelines.batch import fetch_movies_batch
"""
