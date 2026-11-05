"""The public readiness endpoint checks a real database connection."""

import pytest
from django.db import connection
from django.test import Client

from apps.core.tests.test_helpers import closed_local_port

pytestmark = pytest.mark.django_db(transaction=True)


def test_health_check_reports_healthy_database() -> None:
    response = Client().get("/api/health-check/")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_health_check_reports_unavailable_database_without_driver_details() -> None:
    original_host = connection.settings_dict["HOST"]
    original_port = connection.settings_dict["PORT"]
    connection.close()
    try:
        connection.settings_dict["HOST"] = "127.0.0.1"
        connection.settings_dict["PORT"] = str(closed_local_port())
        response = Client().get("/api/health-check/")
        assert response.status_code == 503
        assert response.json() == {"detail": "Service unavailable."}
    finally:
        connection.close()
        connection.settings_dict["HOST"] = original_host
        connection.settings_dict["PORT"] = original_port
