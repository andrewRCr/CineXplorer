"""Django management command to test TMDB API logging functionality.

This command exercises various TMDB API operations to verify that logging
is working correctly and producing expected output.
"""

import time
from argparse import ArgumentParser
from typing import cast

from django.core.management.base import BaseCommand
from ninja.errors import HttpError

from apps.movie.services.api_boundary import BrowseServiceParams, SearchServiceParams
from apps.movie.services.service_factory import get_movie_service


class Command(BaseCommand):
    help = "Test TMDB API logging by exercising typical API operations"

    def __init__(self) -> None:
        super().__init__()
        self.movie_service = get_movie_service()

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--operations",
            type=str,
            default="all",
            help="Which operations to test: all, discover, search, details, popular, or specific",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.5,
            help="Delay between requests in seconds (default: 0.5)",
        )

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write("🎬 Starting TMDB API logging test...")

        operations: str = cast(str, options.get("operations", "all"))
        delay: float = cast(float, options.get("delay", 0.5))

        # Test operations mapping
        test_operations = {
            "discover": self.test_discover_movies,
            "search": self.test_search_movies,
            "details": self.test_movie_details,
            "popular": self.test_popular_movies,
            "now_playing": self.test_now_playing,
            "upcoming": self.test_upcoming_movies,
        }

        if operations == "all":
            operations_to_run = test_operations.keys()
        else:
            operations_to_run = [op.strip() for op in operations.split(",")]

        self.stdout.write(f"📋 Running operations: {', '.join(operations_to_run)}")
        self.stdout.write(f"⏱️ Delay between requests: {delay}s")
        self.stdout.write("-" * 50)

        for operation in operations_to_run:
            if operation in test_operations:
                self.stdout.write(f"🔄 Testing: {operation}")
                try:
                    test_operations[operation]()
                    self.stdout.write(f"✅ {operation} completed")
                except Exception as e:
                    self.stdout.write(f"❌ {operation} failed: {e}")

                if delay > 0:
                    time.sleep(delay)
            else:
                self.stdout.write(f"⚠️ Unknown operation: {operation}")

        self.stdout.write("-" * 50)
        self.stdout.write("🎯 TMDB API logging test completed!")
        self.stdout.write("📖 Check log files for detailed output:")
        self.stdout.write("  - backend/logs/cinexplorer.log")
        self.stdout.write("  - backend/logs/requests.log")
        self.stdout.write("  - backend/logs/django.log")

    def test_discover_movies(self) -> None:
        """Test discover movies API call."""
        self.stdout.write("  📊 Discover popular movies...")
        try:
            params = BrowseServiceParams(sort_by="popularity.desc")
            result = self.movie_service.discover_movies(page=1, params=params)
            self.stdout.write(f"  🎭 Found {len(result.results)} movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.message}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {e!s}")

    def test_search_movies(self) -> None:
        """Test search movies API call."""
        self.stdout.write("  🔍 Searching for 'Inception'...")
        try:
            params = SearchServiceParams(query="Inception")
            result = self.movie_service.search_movies(page=1, params=params)
            self.stdout.write(f"  🎬 Found {len(result.results)} results")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.message}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {e!s}")

    def test_movie_details(self) -> None:
        """Test movie details API call."""
        self.stdout.write("  📄 Getting details for movie ID 27205 (Inception)...")
        try:
            result = self.movie_service.get_movie_by_id(27205)
            title = result.title
            year = str(result.release_date.year) if result.release_date else "Unknown"
            self.stdout.write(f"  🎯 Retrieved: {title} ({year})")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.message}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {e!s}")

    def test_popular_movies(self) -> None:
        """Test popular movies API call."""
        self.stdout.write("  🌟 Getting popular movies...")
        try:
            params = BrowseServiceParams(sort_by="popularity.desc")
            result = self.movie_service.discover_movies(page=1, params=params)
            self.stdout.write(f"  🏆 Found {len(result.results)} popular movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.message}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {e!s}")

    def test_now_playing(self) -> None:
        """Test now playing movies API call."""
        self.stdout.write("  🎪 Getting now playing movies...")
        try:
            result = self.movie_service.get_now_playing_movies(page=1)
            self.stdout.write(f"  🎭 Found {len(result.results)} now playing movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.message}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {e!s}")

    def test_upcoming_movies(self) -> None:
        """Test upcoming movies API call."""
        self.stdout.write("  🔮 Getting upcoming movies...")
        try:
            result = self.movie_service.get_upcoming_movies(page=1)
            self.stdout.write(f"  📅 Found {len(result.results)} upcoming movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.message}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {e!s}")
