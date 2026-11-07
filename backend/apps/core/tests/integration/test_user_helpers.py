"""Test-user helpers create fresh database records."""

import pytest
from allauth.account.models import EmailAddress
from django.db import IntegrityError, transaction

from apps.core.tests.test_helpers import create_user


@pytest.mark.django_db
def test_create_user_does_not_reuse_an_existing_account() -> None:
    original = create_user(
        username="existing-user",
        email="existing-user@example.com",
        password="original-password",
        first_name="Original",
    )
    original_state = (original.email, original.first_name)

    with pytest.raises(IntegrityError), transaction.atomic():
        create_user(
            username=original.username,
            email=original.email,
            password="replacement-password",
            first_name="Replacement",
        )

    original.refresh_from_db()
    assert (original.email, original.first_name) == original_state
    assert original.check_password("original-password")  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
    assert EmailAddress.objects.filter(user=original, verified=True, primary=True).count() == 1
