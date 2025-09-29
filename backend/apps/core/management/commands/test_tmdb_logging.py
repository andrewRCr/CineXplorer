"""
Django management command to test TMDB API logging functionality.

This command exercises various TMDB API operations to verify that logging
is working correctly and producing expected output.
"""

import time
from django.core.management.base import BaseCommand
from movie.services.movie_service import (
    get_movie_by_id, discover_movies, search_movies,
    get_now_playing_movies, get_upcoming_movies
)
from ninja.errors import HttpError


class Command(BaseCommand):
    help = 'Test TMDB API logging by exercising typical API operations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--operations',
            type=str,
            default='all',
            help='Which operations to test: all, discover, search, details, popular, or specific'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.5,
            help='Delay between requests in seconds (default: 0.5)'
        )

    def handle(self, *args, **options):
        self.stdout.write("🎬 Starting TMDB API logging test...")

        operations = options['operations']
        delay = options['delay']

        # Test operations mapping
        test_operations = {
            'discover': self.test_discover_movies,
            'search': self.test_search_movies,
            'details': self.test_movie_details,
            'popular': self.test_popular_movies,
            'now_playing': self.test_now_playing,
            'upcoming': self.test_upcoming_movies
        }

        if operations == 'all':
            operations_to_run = test_operations.keys()
        else:
            operations_to_run = [op.strip() for op in operations.split(',')]

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

    def test_discover_movies(self):
        """Test discover movies API call."""
        self.stdout.write("  📊 Discover popular movies...")
        try:
            result = discover_movies(page=1, sort_by='popularity.desc')
            self.stdout.write(f"  🎭 Found {len(result.results)} movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.detail}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {str(e)}")

    def test_search_movies(self):
        """Test search movies API call."""
        self.stdout.write("  🔍 Searching for 'Inception'...")
        try:
            result = search_movies(query='Inception', page=1)
            self.stdout.write(f"  🎬 Found {len(result.results)} results")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.detail}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {str(e)}")

    def test_movie_details(self):
        """Test movie details API call."""
        self.stdout.write("  📄 Getting details for movie ID 27205 (Inception)...")
        try:
            result = get_movie_by_id(27205)
            title = result.title
            year = result.release_date[:4] if result.release_date else 'Unknown'
            self.stdout.write(f"  🎯 Retrieved: {title} ({year})")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.detail}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {str(e)}")

    def test_popular_movies(self):
        """Test popular movies API call."""
        self.stdout.write("  🌟 Getting popular movies...")
        try:
            result = discover_movies(page=1, sort_by='popularity.desc')
            self.stdout.write(f"  🏆 Found {len(result.results)} popular movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.detail}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {str(e)}")

    def test_now_playing(self):
        """Test now playing movies API call."""
        self.stdout.write("  🎪 Getting now playing movies...")
        try:
            result = get_now_playing_movies(page=1)
            self.stdout.write(f"  🎭 Found {len(result.results)} now playing movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.detail}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {str(e)}")

    def test_upcoming_movies(self):
        """Test upcoming movies API call."""
        self.stdout.write("  🔮 Getting upcoming movies...")
        try:
            result = get_upcoming_movies(page=1)
            self.stdout.write(f"  📅 Found {len(result.results)} upcoming movies")
        except HttpError as e:
            self.stdout.write(f"  ❌ Error: {e.detail}")
        except Exception as e:
            self.stdout.write(f"  ❌ Error: {str(e)}")
