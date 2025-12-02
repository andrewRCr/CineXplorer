"""
Unit tests for language script filtering - detecting mislabeled TMDB content.

TMDB has data quality issues where films are tagged with incorrect original_language
values. This filter catches films tagged as Latin-script languages (English, Spanish,
etc.) but with non-Latin script characters in their original_title.

Detected scripts:
- CJK: Chinese, Japanese, Korean
- South Asian: Devanagari, Bengali, Gujarati, Oriya, Tamil, Telugu, Kannada,
  Malayalam, Sinhalese
- Southeast Asian: Thai, Lao, Myanmar
- Middle Eastern: Arabic, Hebrew
- European non-Latin: Greek, Cyrillic, Armenian, Georgian

Tests cover:
- Non-Latin script character detection utility
- Language script filter behavior
- Latin vs non-Latin language handling
- Integration with apply_data_quality_filters
"""
from __future__ import annotations

from core.tmdb_models.tmdb_responses import TMDBMovieBase
from movie.services.data_quality.filters import (
    LATIN_SCRIPT_LANGUAGES,
    contains_non_latin_script,
    filter_movies_by_language_script,
)

# ============================================================================
# Test Data Builders
# ============================================================================


def create_tmdb_movie(
    movie_id: int,
    title: str,
    original_title: str | None = None,
    original_language: str = "en",
) -> TMDBMovieBase:
    """Create a TMDBMovieBase for testing with minimal required fields."""
    return TMDBMovieBase(
        id=movie_id,
        title=title,
        original_title=original_title or title,
        original_language=original_language,
        overview="A movie for testing.",
        poster_path="/test.jpg",
        release_date="2022-01-01",
        vote_average=7.0,
        vote_count=100,
        genre_ids=[18],
    )


# ============================================================================
# contains_non_latin_script Tests
# ============================================================================


class TestContainsNonLatinScript:
    """Tests for the non-Latin script character detection utility."""

    # --- CJK Scripts (Chinese, Japanese, Korean) ---

    def test_detects_korean_hangul(self) -> None:
        """Korean Hangul characters should be detected."""
        assert contains_non_latin_script("호모 비디오쿠스")
        assert contains_non_latin_script("기생충")
        assert contains_non_latin_script("홍길동 장군")

    def test_detects_japanese_hiragana(self) -> None:
        """Japanese Hiragana characters should be detected."""
        assert contains_non_latin_script("となりのトトロ")
        assert contains_non_latin_script("もののけ姫")

    def test_detects_japanese_katakana(self) -> None:
        """Japanese Katakana characters should be detected."""
        assert contains_non_latin_script("アキラ")
        assert contains_non_latin_script("ゴジラ")

    def test_detects_chinese_characters(self) -> None:
        """Chinese (CJK Unified Ideographs) characters should be detected."""
        assert contains_non_latin_script("卧虎藏龙")
        assert contains_non_latin_script("霸王别姬")

    def test_detects_fullwidth_characters(self) -> None:
        """Full-width Latin/symbols (used in CJK contexts) should be detected."""
        # Full-width exclamation mark and letters (intentionally fullwidth for test)
        assert contains_non_latin_script("！ＡＢＣＤ")  # noqa: RUF001

    # --- South/Southeast Asian Scripts ---

    def test_detects_thai_script(self) -> None:
        """Thai script characters should be detected."""
        assert contains_non_latin_script("นมัสเตอินเดีย")  # "Namaste India"
        assert contains_non_latin_script("จังหวัด 77")  # "Province 77"

    def test_detects_devanagari_script(self) -> None:
        """Devanagari (Hindi, Marathi) characters should be detected."""
        assert contains_non_latin_script("फत्तेशिकस्त")  # Marathi film
        assert contains_non_latin_script("दिलवाले दुल्हनिया ले जाएंगे")  # Hindi

    def test_detects_sinhalese_script(self) -> None:
        """Sinhalese characters should be detected."""
        assert contains_non_latin_script("කොළඹ සන්නිය")  # "Kolamba Sanniya"

    # --- Middle Eastern Scripts ---

    def test_detects_arabic_script(self) -> None:
        """Arabic script characters should be detected."""
        assert contains_non_latin_script("الفيل الأزرق")  # "The Blue Elephant"
        assert contains_non_latin_script("واحد صحيح")  # Egyptian film

    def test_detects_hebrew_script(self) -> None:
        """Hebrew script characters should be detected."""
        assert contains_non_latin_script("ללא גבולות")  # "Waltz with Bashir"

    # --- Mixed and Edge Cases ---

    def test_detects_mixed_script_and_latin(self) -> None:
        """Mixed text with any non-Latin script should be detected."""
        assert contains_non_latin_script("Movie: 기생충")
        assert contains_non_latin_script("1234 호모 비디오쿠스 ABC")
        assert contains_non_latin_script("Kolamba Sanniya කොළඹ සන්නිය Returns")

    # --- Additional South Asian Scripts ---

    def test_detects_tamil_script(self) -> None:
        """Tamil script characters should be detected."""
        assert contains_non_latin_script("பழனி")  # Tamil film
        assert contains_non_latin_script("சொக்கத்தங்கம்")

    def test_detects_malayalam_script(self) -> None:
        """Malayalam script characters should be detected."""
        assert contains_non_latin_script("താരം തീർത്ത കൂടാരം")
        assert contains_non_latin_script("മിമിക്സ് പരേഡ്")

    def test_detects_telugu_script(self) -> None:
        """Telugu script characters should be detected."""
        assert contains_non_latin_script("బాహుబలి")  # Baahubali

    def test_detects_bengali_script(self) -> None:
        """Bengali script characters should be detected."""
        assert contains_non_latin_script("পথের পাঁচালী")  # Pather Panchali

    # --- European Non-Latin Scripts ---

    def test_detects_cyrillic_script(self) -> None:
        """Cyrillic (Russian, Ukrainian) characters should be detected."""
        assert contains_non_latin_script("Война и мир")  # War and Peace
        assert contains_non_latin_script("Сталкер")  # Stalker
        assert contains_non_latin_script("Одного літа в Україні")  # Ukrainian

    def test_detects_greek_script(self) -> None:
        """Greek script characters should be detected."""
        assert contains_non_latin_script("Ζορμπάς")  # Zorba

    def test_detects_armenian_script(self) -> None:
        """Armenian script characters should be detected."""
        assert contains_non_latin_script("Հdelays")

    def test_detects_georgian_script(self) -> None:
        """Georgian script characters should be detected."""
        assert contains_non_latin_script("მონანიება")  # Repentance

    # --- Edge Cases ---

    def test_does_not_detect_latin_only(self) -> None:
        """Pure Latin text should not be detected."""
        assert not contains_non_latin_script("The Matrix")
        assert not contains_non_latin_script("Crouching Tiger, Hidden Dragon")
        assert not contains_non_latin_script("Amélie")  # Latin with diacritics

    def test_handles_none_and_empty(self) -> None:
        """None and empty strings should return False."""
        assert not contains_non_latin_script(None)
        assert not contains_non_latin_script("")
        assert not contains_non_latin_script("   ")


# ============================================================================
# filter_movies_by_language_script Tests
# ============================================================================


class TestFilterMoviesByLanguageScript:
    """Tests for the language script filter."""

    def test_filters_korean_title_when_english_selected(self) -> None:
        """Korean original_title should be filtered when language=en."""
        movies = [
            create_tmdb_movie(1, "Homo Videocus", "호모 비디오쿠스", "en"),
            create_tmdb_movie(2, "The Matrix", "The Matrix", "en"),
        ]

        result = filter_movies_by_language_script(movies, "en")

        assert len(result) == 1
        assert result[0].id == 2
        assert result[0].title == "The Matrix"

    def test_filters_japanese_title_when_english_selected(self) -> None:
        """Japanese original_title should be filtered when language=en."""
        movies = [
            create_tmdb_movie(1, "My Neighbor Totoro", "となりのトトロ", "en"),
            create_tmdb_movie(2, "Inception", "Inception", "en"),
        ]

        result = filter_movies_by_language_script(movies, "en")

        assert len(result) == 1
        assert result[0].id == 2

    def test_filters_chinese_title_when_english_selected(self) -> None:
        """Chinese original_title should be filtered when language=en."""
        movies = [
            create_tmdb_movie(1, "Crouching Tiger", "卧虎藏龙", "en"),
            create_tmdb_movie(2, "Avatar", "Avatar", "en"),
        ]

        result = filter_movies_by_language_script(movies, "en")

        assert len(result) == 1
        assert result[0].id == 2

    def test_no_filter_when_language_is_none(self) -> None:
        """All movies should pass when no language filter is specified."""
        movies = [
            create_tmdb_movie(1, "Korean Movie", "호모 비디오쿠스", "en"),
            create_tmdb_movie(2, "English Movie", "The Matrix", "en"),
        ]

        result = filter_movies_by_language_script(movies, None)

        assert len(result) == 2

    def test_no_filter_when_language_is_non_latin(self) -> None:
        """All movies should pass when filtering for non-Latin language."""
        movies = [
            create_tmdb_movie(1, "Parasite", "기생충", "ko"),
            create_tmdb_movie(2, "Oldboy", "올드보이", "ko"),
        ]

        # Korean is not a Latin-script language, so CJK is expected
        result = filter_movies_by_language_script(movies, "ko")

        assert len(result) == 2

    def test_filter_applies_to_all_latin_languages(self) -> None:
        """Filter should apply to all Latin-script languages."""
        movies = [
            create_tmdb_movie(1, "Korean Mislabel", "호모 비디오쿠스", "es"),
        ]

        # Test a few Latin-script languages
        for lang in ["en", "es", "fr", "de", "it", "pt"]:
            result = filter_movies_by_language_script(movies, lang)
            assert len(result) == 0, f"Failed for language {lang}"

    def test_keeps_latin_titles_for_latin_languages(self) -> None:
        """Latin-script titles should pass for Latin-script languages."""
        movies = [
            create_tmdb_movie(1, "English Movie", "The Matrix", "en"),
            create_tmdb_movie(2, "Spanish Movie", "El Laberinto del Fauno", "es"),
            create_tmdb_movie(3, "French Movie", "Amélie", "fr"),
        ]

        for lang in ["en", "es", "fr"]:
            result = filter_movies_by_language_script(movies, lang)
            assert len(result) == 3, f"Failed for language {lang}"

    def test_empty_movie_list_returns_empty(self) -> None:
        """Empty input should return empty output."""
        result = filter_movies_by_language_script([], "en")
        assert result == []

    def test_all_filtered_returns_empty(self) -> None:
        """If all movies are mislabeled, result should be empty."""
        movies = [
            create_tmdb_movie(1, "Movie 1", "호모 비디오쿠스", "en"),
            create_tmdb_movie(2, "Movie 2", "기생충", "en"),
        ]

        result = filter_movies_by_language_script(movies, "en")
        assert result == []


# ============================================================================
# LATIN_SCRIPT_LANGUAGES Constant Tests
# ============================================================================


class TestLatinScriptLanguages:
    """Tests for the LATIN_SCRIPT_LANGUAGES constant."""

    def test_english_is_latin(self) -> None:
        """English should be in Latin-script languages."""
        assert "en" in LATIN_SCRIPT_LANGUAGES

    def test_common_european_languages_are_latin(self) -> None:
        """Common European languages should be in Latin-script languages."""
        expected = {"es", "fr", "de", "it", "pt", "nl", "sv", "da", "no", "fi", "pl"}
        assert expected.issubset(LATIN_SCRIPT_LANGUAGES)

    def test_cjk_languages_not_in_latin(self) -> None:
        """CJK languages should NOT be in Latin-script languages."""
        assert "ko" not in LATIN_SCRIPT_LANGUAGES  # Korean
        assert "ja" not in LATIN_SCRIPT_LANGUAGES  # Japanese
        assert "zh" not in LATIN_SCRIPT_LANGUAGES  # Chinese

    def test_is_frozenset(self) -> None:
        """LATIN_SCRIPT_LANGUAGES should be immutable."""
        assert isinstance(LATIN_SCRIPT_LANGUAGES, frozenset)


# ============================================================================
# Edge Cases
# ============================================================================


class TestLanguageScriptFilterEdgeCases:
    """Edge case tests for language script filtering."""

    def test_movie_with_none_original_title(self) -> None:
        """Movies with None original_title should pass (can't detect CJK)."""
        movie = TMDBMovieBase(
            id=1,
            title="Some Movie",
            original_title=None,
            original_language="en",
            overview="A movie.",
            poster_path="/test.jpg",
            release_date="2022-01-01",
            vote_average=7.0,
            vote_count=100,
            genre_ids=[18],
        )

        result = filter_movies_by_language_script([movie], "en")
        assert len(result) == 1

    def test_movie_with_empty_original_title(self) -> None:
        """Movies with empty original_title should pass."""
        movie = TMDBMovieBase(
            id=1,
            title="Some Movie",
            original_title="",
            original_language="en",
            overview="A movie.",
            poster_path="/test.jpg",
            release_date="2022-01-01",
            vote_average=7.0,
            vote_count=100,
            genre_ids=[18],
        )

        result = filter_movies_by_language_script([movie], "en")
        assert len(result) == 1

    def test_empty_string_language_filter(self) -> None:
        """Empty string language filter should not apply filter."""
        movies = [
            create_tmdb_movie(1, "Korean Movie", "호모 비디오쿠스", "en"),
        ]

        result = filter_movies_by_language_script(movies, "")
        assert len(result) == 1  # Not filtered because "" is falsy
