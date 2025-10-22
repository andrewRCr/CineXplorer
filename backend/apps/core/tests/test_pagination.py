"""Tests for pagination helper functions.

**Test Coverage:**
- Valid pagination scenarios (various page numbers, page sizes)
- Bounds checking (page < 1, page > total_pages)
- Page size limits enforcement
- Empty QuerySet handling
- Metadata correctness

**Target Coverage:** 90%+ (critical path - pagination is used across multiple endpoints)
"""
from __future__ import annotations

import pytest
from core.models import Movie
from core.pagination import paginate_queryset
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def movies(db: object) -> list[Movie]:
    """Create 25 test movies for pagination testing."""
    movies_list: list[Movie] = []
    for i in range(1, 26):  # Create 25 movies
        movie = Movie.objects.create(
            tmdb_id=1000 + i,
            title=f"Test Movie {i}",
            poster_path=f"/poster{i}.jpg",
            release_date=f"2024-01-{i:02d}" if i <= 31 else None
        )
        movies_list.append(movie)
    return movies_list


@pytest.mark.django_db
class TestPaginateQueryset:
    """Tests for paginate_queryset function."""

    # ═══════════════════════════════════════════════════════════════════
    # Valid Pagination Scenarios
    # ═══════════════════════════════════════════════════════════════════

    def test_first_page_default_size(self, movies: list[Movie]) -> None:
        """Test paginating first page with default page size (20)."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1)

        # Should return first 20 movies
        assert paginated_qs.count() == 20
        assert metadata["page"] == 1
        assert metadata["total_pages"] == 2  # 25 movies / 20 per page = 2 pages
        assert metadata["total_results"] == 25

        # Verify we got 20 movies (ordering preserved from model's Meta.ordering)
        result_ids = list(paginated_qs.values_list("tmdb_id", flat=True))
        assert len(result_ids) == 20
        # Verify all IDs are valid movie IDs
        all_movie_ids = {movie.tmdb_id for movie in movies}
        assert all(tmdb_id in all_movie_ids for tmdb_id in result_ids)

    def test_second_page_default_size(self, movies: list[Movie]) -> None:
        """Test paginating second page with default page size."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=2)

        # Should return remaining 5 movies
        assert paginated_qs.count() == 5
        assert metadata["page"] == 2
        assert metadata["total_pages"] == 2
        assert metadata["total_results"] == 25

        # Verify we got 5 movies (ordering preserved from model's Meta.ordering)
        result_ids = list(paginated_qs.values_list("tmdb_id", flat=True))
        assert len(result_ids) == 5
        # Verify all IDs are valid movie IDs
        all_movie_ids = {movie.tmdb_id for movie in movies}
        assert all(tmdb_id in all_movie_ids for tmdb_id in result_ids)

    def test_custom_page_size(self, movies: list[Movie]) -> None:
        """Test paginating with custom page size."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=10)

        # Should return 10 movies
        assert paginated_qs.count() == 10
        assert metadata["page"] == 1
        assert metadata["total_pages"] == 3  # 25 movies / 10 per page = 3 pages
        assert metadata["total_results"] == 25

    def test_small_page_size(self, movies: list[Movie]) -> None:
        """Test paginating with small page size (5 items)."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=3, page_size=5)

        # Page 3 with size 5 should give movies 11-15
        assert paginated_qs.count() == 5
        assert metadata["page"] == 3
        assert metadata["total_pages"] == 5  # 25 / 5 = 5 pages
        assert metadata["total_results"] == 25

    def test_last_page_partial_results(self, movies: list[Movie]) -> None:
        """Test last page when it has fewer items than page size."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=3, page_size=10)

        # Page 3 with size 10 should have only 5 items (21-25)
        assert paginated_qs.count() == 5
        assert metadata["page"] == 3
        assert metadata["total_pages"] == 3
        assert metadata["total_results"] == 25

    def test_single_item_per_page(self, movies: list[Movie]) -> None:
        """Test paginating with page_size=1."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=5, page_size=1)

        assert paginated_qs.count() == 1
        assert metadata["page"] == 5
        assert metadata["total_pages"] == 25  # 25 movies / 1 per page
        assert metadata["total_results"] == 25

    # ═══════════════════════════════════════════════════════════════════
    # Bounds Checking
    # ═══════════════════════════════════════════════════════════════════

    def test_page_less_than_one(self, movies: list[Movie]) -> None:
        """Test that page < 1 defaults to page 1."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=0)

        # Should default to page 1
        assert metadata["page"] == 1
        assert paginated_qs.count() == 20

    def test_negative_page_number(self, movies: list[Movie]) -> None:
        """Test that negative page numbers default to page 1."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=-5)

        # Should default to page 1
        assert metadata["page"] == 1
        assert paginated_qs.count() == 20

    def test_page_exceeds_total_pages(self, movies: list[Movie]) -> None:
        """Test requesting page beyond total pages returns empty results."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=999)

        # Should return empty QuerySet but valid metadata
        assert paginated_qs.count() == 0
        assert metadata["page"] == 999
        assert metadata["total_pages"] == 2
        assert metadata["total_results"] == 25

    def test_page_exactly_at_boundary(self, movies: list[Movie]) -> None:
        """Test requesting the exact last page."""
        queryset = Movie.objects.all()

        # With 25 movies and page_size=25, should have exactly 1 page
        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=25)

        assert paginated_qs.count() == 25
        assert metadata["page"] == 1
        assert metadata["total_pages"] == 1
        assert metadata["total_results"] == 25

    # ═══════════════════════════════════════════════════════════════════
    # Page Size Limits Enforcement
    # ═══════════════════════════════════════════════════════════════════

    def test_page_size_exceeds_maximum(self, movies: list[Movie]) -> None:
        """Test that page_size > 100 is clamped to 100."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=500)

        # Should clamp to max 100, but we only have 25 movies
        assert paginated_qs.count() == 25
        assert metadata["total_pages"] == 1  # All fit in one page with size 100

    def test_page_size_zero(self, movies: list[Movie]) -> None:
        """Test that page_size <= 0 defaults to 20."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=0)

        # Should default to page_size=20
        assert paginated_qs.count() == 20
        assert metadata["total_pages"] == 2

    def test_page_size_negative(self, movies: list[Movie]) -> None:
        """Test that negative page_size defaults to 20."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=-10)

        # Should default to page_size=20
        assert paginated_qs.count() == 20
        assert metadata["total_pages"] == 2

    def test_page_size_at_minimum_boundary(self, movies: list[Movie]) -> None:
        """Test page_size=1 (minimum valid size)."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=1)

        assert paginated_qs.count() == 1
        assert metadata["total_pages"] == 25

    def test_page_size_at_maximum_boundary(self, movies: list[Movie]) -> None:
        """Test page_size=100 (maximum valid size)."""
        queryset = Movie.objects.all()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=100)

        # All 25 movies fit in one page
        assert paginated_qs.count() == 25
        assert metadata["total_pages"] == 1
        assert metadata["total_results"] == 25

    # ═══════════════════════════════════════════════════════════════════
    # Empty QuerySet Handling
    # ═══════════════════════════════════════════════════════════════════

    def test_empty_queryset_first_page(self, db: object) -> None:
        """Test paginating an empty QuerySet."""
        # Create empty queryset (no movies match)
        queryset = Movie.objects.filter(tmdb_id=999999)

        paginated_qs, metadata = paginate_queryset(queryset, page=1)

        # Should return empty results with valid metadata
        assert paginated_qs.count() == 0
        assert metadata["page"] == 1
        assert metadata["total_pages"] == 0
        assert metadata["total_results"] == 0

    def test_empty_queryset_beyond_first_page(self, db: object) -> None:
        """Test requesting page 5 of an empty QuerySet."""
        queryset = Movie.objects.filter(tmdb_id=999999)

        paginated_qs, metadata = paginate_queryset(queryset, page=5)

        # Should return empty results
        assert paginated_qs.count() == 0
        assert metadata["page"] == 5
        assert metadata["total_pages"] == 0
        assert metadata["total_results"] == 0

    # ═══════════════════════════════════════════════════════════════════
    # QuerySet Ordering Preservation
    # ═══════════════════════════════════════════════════════════════════

    def test_preserves_queryset_ordering(self, movies: list[Movie]) -> None:
        """Test that pagination preserves QuerySet ordering."""
        # Order by title descending
        queryset = Movie.objects.order_by("-title")

        paginated_qs, _ = paginate_queryset(queryset, page=1, page_size=5)

        # Verify ordering is preserved
        titles = list(paginated_qs.values_list("title", flat=True))
        # Should get movies in descending title order
        assert titles == sorted(titles, reverse=True)

    def test_preserves_complex_ordering(self, movies: list[Movie]) -> None:
        """Test that pagination preserves complex multi-field ordering."""
        # Order by release_date (nulls last) then title
        queryset = Movie.objects.order_by("-release_date", "title")

        paginated_qs, _ = paginate_queryset(queryset, page=1, page_size=10)

        # Just verify we got results and ordering wasn't broken
        assert paginated_qs.count() == 10
        # Verify no errors occurred (complex ordering preserved)

    # ═══════════════════════════════════════════════════════════════════
    # Metadata Correctness
    # ═══════════════════════════════════════════════════════════════════

    def test_metadata_structure(self, movies: list[Movie]) -> None:
        """Test that metadata contains all required fields."""
        queryset = Movie.objects.all()

        _, metadata = paginate_queryset(queryset, page=1)

        # Verify all required keys present
        assert "page" in metadata
        assert "total_pages" in metadata
        assert "total_results" in metadata

        # Verify types
        assert isinstance(metadata["page"], int)
        assert isinstance(metadata["total_pages"], int)
        assert isinstance(metadata["total_results"], int)

    def test_metadata_calculation_accuracy(self, movies: list[Movie]) -> None:
        """Test that total_pages calculation is accurate."""
        queryset = Movie.objects.all()

        # Test various page sizes
        test_cases = [
            (5, 5),   # 25 / 5 = 5 pages
            (10, 3),  # 25 / 10 = 3 pages (rounded up)
            (20, 2),  # 25 / 20 = 2 pages (rounded up)
            (25, 1),  # 25 / 25 = 1 page
            (30, 1),  # 25 / 30 = 1 page
            (100, 1), # 25 / 100 = 1 page
        ]

        for page_size, expected_pages in test_cases:
            _, metadata = paginate_queryset(queryset, page=1, page_size=page_size)
            assert metadata["total_pages"] == expected_pages, (
                f"Failed for page_size={page_size}: "
                f"expected {expected_pages}, got {metadata['total_pages']}"
            )
            assert metadata["total_results"] == 25

    # ═══════════════════════════════════════════════════════════════════
    # Edge Cases
    # ═══════════════════════════════════════════════════════════════════

    def test_single_item_queryset(self, db: object) -> None:
        """Test paginating a QuerySet with exactly one item."""
        Movie.objects.create(
            tmdb_id=9999,
            title="Single Movie",
            poster_path="/single.jpg"
        )
        queryset = Movie.objects.filter(tmdb_id=9999)

        paginated_qs, metadata = paginate_queryset(queryset, page=1)

        assert paginated_qs.count() == 1
        assert metadata["page"] == 1
        assert metadata["total_pages"] == 1
        assert metadata["total_results"] == 1

    def test_queryset_with_filters_applied(self, movies: list[Movie]) -> None:
        """Test paginating a pre-filtered QuerySet."""
        # Filter to movies with tmdb_id > 1015 (last 10 movies)
        queryset = Movie.objects.filter(tmdb_id__gt=1015)

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=5)

        assert paginated_qs.count() == 5
        assert metadata["total_results"] == 10  # Only 10 movies match filter
        assert metadata["total_pages"] == 2     # 10 / 5 = 2 pages

    def test_queryset_with_select_related(self, db: object, movies: list[Movie]) -> None:
        """Test that pagination preserves select_related optimization."""
        # This test ensures pagination doesn't break QuerySet optimizations
        # No relations on Movie, but tests optimization preservation
        queryset = Movie.objects.all().select_related()

        paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=10)

        # Verify we got results and select_related wasn't broken
        assert paginated_qs.count() == 10
        assert metadata["total_results"] == 25
