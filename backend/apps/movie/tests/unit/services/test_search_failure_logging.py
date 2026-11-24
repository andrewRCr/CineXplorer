"""Searches keep what a visitor typed out of the logs when TMDB fails."""

from __future__ import annotations

import logging
from collections.abc import Callable
from unittest import TestCase
from unittest.mock import Mock

import pytest

from apps.core.exceptions import UpstreamError
from apps.core.services.api_response import ApiResponse
from apps.movie.services.keyword_service import KeywordService
from apps.movie.services.people_service import PeopleService
from apps.movie.services.tmdb_api_boundary import response_factories

QUERY = "private-search-marker"


def _search_people(client: Mock) -> object:
    return PeopleService(tmdb_client=client).search_people(query=QUERY)


def _search_keywords(client: Mock) -> object:
    return KeywordService(tmdb_client=client).search_keywords(query=QUERY)


@pytest.mark.parametrize(
    ("search", "operation"),
    [(_search_people, "search_people"), (_search_keywords, "search_keywords")],
    ids=["people", "keywords"],
)
@pytest.mark.parametrize(
    "response",
    [
        ApiResponse(
            status_code=503,
            data=None,
            error_message="TMDB request failed: 503",
            error_category="server_error",
        ),
        ApiResponse(status_code=200, data={}),
    ],
    ids=["failed", "no-data"],
)
def test_search_failure_logs_omit_the_search_text(
    search: Callable[[Mock], object], operation: str, response: ApiResponse
) -> None:
    client = Mock(spec=["get"])
    client.get.return_value = response

    logs = TestCase().assertLogs(response_factories.logger.name, level="ERROR")
    with logs as captured, pytest.raises(UpstreamError):
        search(client)

    [record] = captured.records
    assert record.levelno == logging.ERROR
    assert QUERY not in repr(record.__dict__)
    assert getattr(record, "operation", None) == operation
    if response.status_code == 503:
        assert getattr(record, "status_code", None) == 503
