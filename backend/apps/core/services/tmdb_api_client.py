"""TMDB API Client for movie database interactions.

This module provides a specialized HTTP client for The Movie Database (TMDB) API
with TMDB-specific authentication, rate limiting, error handling, and response
processing built on top of the BaseApiClient infrastructure.
"""

import logging

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .api_response import RATE_LIMIT_HEADER_MAPPING, ApiResponse
from .base_api_client import BaseApiClient


class TMDBApiClient(BaseApiClient):
    """Specialized API client for TMDB (The Movie Database) interactions.

    Extends BaseApiClient with TMDB-specific functionality:
    - Automatic API key injection
    - TMDB rate limit header processing
    - TMDB-specific error code interpretation
    - Enhanced logging for movie-related operations
    """

    def __init__(self, timeout: int = 30, max_retries: int = 0):
        """Initialize the TMDB API client.

        Args:
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        super().__init__(
            base_url="https://api.themoviedb.org/3",
            logger_name="cinexplorer.tmdb",
            timeout=timeout,
            max_retries=max_retries,
        )

    def prepare_headers(self, headers: dict[str, str] | None = None) -> dict[str, str]:
        """Prepare headers for TMDB API requests.

        Args:
            headers: Additional headers to include

        Returns:
            Complete headers dictionary with standard TMDB headers
        """
        prepared_headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "CineXplorer/1.0",
        }

        if headers:
            prepared_headers.update(headers)

        return prepared_headers

    def get_sanitized_params(self, params: dict[str, object] | None = None) -> dict[str, object]:
        """Get sanitized parameters for logging (removes API key for security).

        Args:
            params: Original parameters dictionary

        Returns:
            Sanitized parameters safe for logging
        """
        if not params:
            return {}

        # Remove API key from logging for security
        return {k: v for k, v in params.items() if k != "api_key"}

    def get_error_details(self, status_code: int) -> str:
        """Get TMDB-specific error details for status codes.

        Args:
            status_code: HTTP status code

        Returns:
            TMDB-specific error description
        """
        tmdb_error_details = {
            400: "Bad Request - The request was invalid or malformed",
            401: "Unauthorized - Invalid or missing TMDB API key",
            403: "Forbidden - Access denied to the requested TMDB resource",
            404: "Not Found - The requested movie/resource does not exist in TMDB",
            422: "Unprocessable Entity - TMDB request data validation failed",
            429: "Rate Limited - Too many TMDB requests, please retry later",
            500: "Internal Server Error - TMDB API server error",
            502: "Bad Gateway - TMDB API gateway error",
            503: "Service Unavailable - TMDB API temporarily unavailable",
            504: "Gateway Timeout - TMDB API request timed out",
        }

        return tmdb_error_details.get(
            status_code, f"HTTP {status_code} - Unexpected response from TMDB API"
        )

    def process_successful_response(
        self, response: requests.Response, correlation_id: str, endpoint: str, duration_ms: int
    ) -> ApiResponse:
        """Process successful TMDB API response with enhanced metadata extraction.

        Args:
            response: Requests response object
            correlation_id: Correlation ID for this request
            endpoint: TMDB API endpoint that was called
            duration_ms: Request duration in milliseconds

        Returns:
            ApiResponse with TMDB-specific metadata extraction
        """
        try:
            data = response.json()
        except ValueError as json_error:
            # Handle invalid JSON responses
            self.logger.error(
                "TMDB API returned invalid JSON",
                extra={
                    "correlation_id": correlation_id,
                    "json_error": str(json_error),
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "error_type": "json_parsing_error",
                    "response_preview": str(response.text)[:200],
                    "response_size_bytes": (
                        len(response.content) if hasattr(response.content, "__len__") else 0
                    ),
                },
            )

            return ApiResponse(
                status_code=502,
                error_message="TMDB returned invalid JSON (Bad Gateway)",
                error_details=f"TMDB API returned an invalid JSON response: {json_error}",
                error_category="json_parsing_error",
                correlation_id=correlation_id,
                endpoint=endpoint,
                duration_ms=duration_ms,
                headers=self._safe_headers_dict(response),
                raw_response=response,
            )

        # Extract TMDB-specific response metadata
        response_metadata = self._extract_tmdb_response_metadata(data)

        # Enhanced logging for TMDB responses
        log_data: dict[str, object] = {
            "correlation_id": correlation_id,
            "endpoint": endpoint,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "response_size_bytes": (
                len(response.content) if hasattr(response.content, "__len__") else 0
            ),
        }

        # Add TMDB metadata to logs if available
        if response_metadata:
            log_data["response_metadata"] = response_metadata

        # Add rate limit info if available
        rate_limit_info = self._extract_rate_limit_headers(response.headers)
        if rate_limit_info:
            log_data["rate_limit"] = rate_limit_info

        # Add performance warning for slow requests (>1000ms)
        if duration_ms > 1000:
            performance_log_data: dict[str, object] = dict(log_data)  # Copy the log data
            performance_log_data["performance_warning"] = True
            performance_log_data["threshold_exceeded"] = "1000ms"
            performance_log_data["performance_ratio"] = round(duration_ms / 1000.0, 2)
            performance_log_data["slow_request_impact"] = "User experience degradation possible"
            self.logger.warning("TMDB API request slow performance", extra=performance_log_data)

        self.logger.info("TMDB API request successful", extra=log_data)

        # DEBUG-level detailed logging: Log first few results for debugging
        # This helps diagnose TMDB filtering behavior and data quality issues
        has_results = "results" in data and hasattr(data["results"], "__iter__")
        if self.logger.isEnabledFor(logging.DEBUG) and has_results:
            results = data["results"]
            if hasattr(results, "__len__") and len(results) > 0:  # type: ignore[arg-type]
                sample_count = min(3, len(results))  # type: ignore[arg-type]
                sample_results: list[dict[str, object]] = []
                for i in range(sample_count):
                    try:
                        movie = results[i]  # type: ignore[index]
                        # Extract key fields for debugging (title, year, ID)
                        release = movie.get("release_date") if hasattr(movie, "get") else None
                        vote_avg = movie.get("vote_average") if hasattr(movie, "get") else None
                        sample_results.append(
                            {
                                "tmdb_id": movie.get("id") if hasattr(movie, "get") else None,
                                "title": movie.get("title") if hasattr(movie, "get") else None,
                                "release_date": release,
                                "vote_average": vote_avg,
                            }
                        )
                    except (IndexError, TypeError, AttributeError):
                        continue

                # Log ALL results for complete debugging visibility
                all_results: list[dict[str, object]] = []
                for i in range(len(results)):  # type: ignore[arg-type]
                    try:
                        movie = results[i]  # type: ignore[index]
                        release = movie.get("release_date") if hasattr(movie, "get") else None
                        vote_avg = movie.get("vote_average") if hasattr(movie, "get") else None
                        all_results.append(
                            {
                                "tmdb_id": movie.get("id") if hasattr(movie, "get") else None,
                                "title": movie.get("title") if hasattr(movie, "get") else None,
                                "release_date": release,
                                "vote_average": vote_avg,
                            }
                        )
                    except (IndexError, TypeError, AttributeError):
                        continue

                self.logger.debug(f"TMDB response (ALL {len(all_results)} results): {all_results}")

        return ApiResponse(
            status_code=response.status_code,
            data=data,
            headers=self._safe_headers_dict(response),
            correlation_id=correlation_id,
            endpoint=endpoint,
            method="GET",
            duration_ms=duration_ms,
            raw_response=response,
        )

    def process_error_response(
        self, response: requests.Response, correlation_id: str, endpoint: str, duration_ms: int
    ) -> ApiResponse:
        """Process TMDB API error response with enhanced error information.

        Args:
            response: Requests response object with error status
            correlation_id: Correlation ID for this request
            endpoint: TMDB API endpoint that was called
            duration_ms: Request duration in milliseconds

        Returns:
            ApiResponse with TMDB-specific error information
        """
        error_category = self.classify_error(response.status_code)
        error_details = self.get_error_details(response.status_code)
        error_message = f"TMDB request failed: {response.status_code}"

        # Enhanced logging for TMDB errors
        log_data: dict[str, object] = {
            "correlation_id": correlation_id,
            "endpoint": endpoint,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "error_category": error_category,
            "response_size_bytes": (
                len(response.content) if hasattr(response.content, "__len__") else 0
            ),
            "error_response": (
                str(response.text)[:500]
                if hasattr(response.text, "__getitem__")
                else str(response.text)
            ),
        }

        # Add TMDB rate limit info for debugging
        rate_limit_info = self._extract_rate_limit_headers(response.headers)
        if rate_limit_info:
            log_data["rate_limit"] = rate_limit_info

        # Add performance warning for slow error responses (>1000ms)
        if duration_ms > 1000:
            performance_log_data: dict[str, object] = dict(log_data)  # Copy the log data
            performance_log_data["performance_warning"] = True
            performance_log_data["threshold_exceeded"] = "1000ms"
            performance_log_data["performance_ratio"] = round(duration_ms / 1000.0, 2)
            performance_log_data["slow_error_impact"] = (
                "Error response time exceeds performance threshold"
            )
            self.logger.warning(
                "TMDB API error response slow performance", extra=performance_log_data
            )

        # Log with appropriate level based on status code
        if response.status_code >= 500:
            self.logger.error("TMDB API server error", extra=log_data)
        elif response.status_code == 429:
            self.logger.warning("TMDB API rate limit exceeded", extra=log_data)
        elif response.status_code >= 400:
            self.logger.warning("TMDB API client error", extra=log_data)
        else:
            self.logger.warning("TMDB API request failed", extra=log_data)

        return ApiResponse(
            status_code=response.status_code,
            error_message=error_message,
            error_details=error_details,
            error_category=error_category,
            correlation_id=correlation_id,
            endpoint=endpoint,
            method="GET",
            duration_ms=duration_ms,
            headers=self._safe_headers_dict(response),
            raw_response=response,
        )

    def _extract_tmdb_response_metadata(self, data: dict[str, object]) -> dict[str, object] | None:
        """Extract TMDB-specific metadata from response data.

        Args:
            data: Parsed JSON response data

        Returns:
            Dictionary with TMDB metadata or None if not applicable
        """
        metadata: dict[str, object] = {}

        # Common TMDB pagination fields
        if "page" in data:
            metadata["page"] = data["page"]
        if "total_pages" in data:
            metadata["total_pages"] = data["total_pages"]
        if "total_results" in data:
            metadata["total_results"] = data["total_results"]
        if "results" in data:
            results = data["results"]
            # Type-safe length check with hasattr
            # Note: hasattr check doesn't narrow object to Sized protocol in Pyright
            if hasattr(results, "__len__"):
                metadata["results_count"] = len(results)  # type: ignore[arg-type]  # Runtime-validated by hasattr
            else:
                metadata["results_count"] = 0

        # Movie-specific fields
        if "id" in data and isinstance(data["id"], int):
            metadata["movie_id"] = data["id"]
        if "title" in data:
            metadata["movie_title"] = data["title"]

        # Remove None values for cleaner logs
        metadata = {k: v for k, v in metadata.items() if v is not None}

        return metadata if metadata else None

    def _extract_rate_limit_headers(self, headers: object) -> dict[str, object] | None:
        """Extract TMDB rate limiting headers from response.

        Args:
            headers: Response headers object

        Returns:
            Dictionary with rate limit info or None if not available
        """
        # Handle test mocks and empty headers safely
        if not headers or not hasattr(headers, "__contains__"):
            return None

        rate_limit_info: dict[str, object] = {}

        # Headers typed as object to support mock objects in tests
        # Use try/except for safe access to non-dict or mock header objects
        for header_name, key in RATE_LIMIT_HEADER_MAPPING.items():
            try:
                value = headers[header_name]  # type: ignore[index]  # Mock object support
            except (TypeError, KeyError, IndexError):
                # Skip non-subscriptable or missing headers
                continue

            # Convert numeric values to integers
            if key in ["limit", "remaining", "retry_after", "reset"]:
                try:
                    rate_limit_info[key] = int(value)  # type: ignore[arg-type]  # Runtime-validated in try/except
                except (ValueError, TypeError):
                    rate_limit_info[key] = value
            else:
                rate_limit_info[key] = value

        return rate_limit_info if rate_limit_info else None

    def get(
        self,
        endpoint: str,
        params: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
        **kwargs: object,
    ) -> ApiResponse:
        """Make a GET request to TMDB API with automatic API key injection.

        Args:
            endpoint: TMDB API endpoint (relative to base URL)
            params: Query parameters
            headers: Additional headers
            **kwargs: Additional arguments passed to requests.get

        Returns:
            ApiResponse object with TMDB response data or error information
        """
        # Ensure params dict exists and inject API key
        if params is None:
            params = {}

        # Guard against missing TMDB API key
        api_key = getattr(settings, "TMDB_API_KEY", None)
        if not api_key:
            raise ImproperlyConfigured(
                "TMDB_API_KEY is not configured in Django settings. "
                "Please set TMDB_API_KEY in your environment or settings file."
            )

        # Inject TMDB API key
        params["api_key"] = api_key

        # Call parent get method with prepared parameters
        return super().get(endpoint, params, headers, **kwargs)

    # Convenience methods for common TMDB operations
    def search_movies(self, query: str, page: int = 1, **kwargs: object) -> ApiResponse:
        """Search for movies by title.

        Args:
            query: Movie title to search for
            page: Page number for pagination
            **kwargs: Additional search parameters

        Returns:
            ApiResponse with search results
        """
        params = {"query": query, "page": page, **kwargs}
        return self.get("search/movie", params)

    def get_movie_details(self, movie_id: int, **kwargs: object) -> ApiResponse:
        """Get detailed information for a specific movie.

        Args:
            movie_id: TMDB movie ID
            **kwargs: Additional parameters

        Returns:
            ApiResponse with movie details
        """
        return self.get(f"movie/{movie_id}", params=kwargs)

    def discover_movies(self, **kwargs: object) -> ApiResponse:
        """Discover movies using TMDB's discover endpoint.

        Args:
            **kwargs: Discovery parameters (genre, year, etc.)

        Returns:
            ApiResponse with discovered movies
        """
        return self.get("discover/movie", params=kwargs)

    def get_popular_movies(self, page: int = 1, **kwargs: object) -> ApiResponse:
        """Get popular movies from TMDB.

        Args:
            page: Page number for pagination
            **kwargs: Additional parameters

        Returns:
            ApiResponse with popular movies
        """
        params = {"page": page, **kwargs}
        return self.get("movie/popular", params)

    def get_top_rated_movies(self, page: int = 1, **kwargs: object) -> ApiResponse:
        """Get top rated movies from TMDB.

        Args:
            page: Page number for pagination
            **kwargs: Additional parameters

        Returns:
            ApiResponse with top rated movies
        """
        params = {"page": page, **kwargs}
        return self.get("movie/top_rated", params)

    def get_now_playing_movies(self, page: int = 1, **kwargs: object) -> ApiResponse:
        """Get now playing movies from TMDB.

        Args:
            page: Page number for pagination
            **kwargs: Additional parameters

        Returns:
            ApiResponse with now playing movies
        """
        params = {"page": page, **kwargs}
        return self.get("movie/now_playing", params)
