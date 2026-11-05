"""Create the development sign-in and sync the tracked movie blacklist."""

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    """Seed a fresh development database without changing an existing dev account."""

    help = "Create the development account and sync the tracked blacklist"

    def handle(self, *args: object, **options: object) -> None:
        if settings.ENVIRONMENT != "development":
            raise CommandError("seed_dev_data runs only in development.")

        user_model = get_user_model()
        if (
            user_model.objects.filter(email__iexact="dev@example.com")
            .exclude(username="dev")
            .exists()
        ):
            raise CommandError("Cannot seed dev: dev@example.com is already used by another user.")

        with transaction.atomic():
            user, created = user_model.objects.get_or_create(
                username="dev", defaults={"email": "dev@example.com"}
            )
            if created:
                # This fixed credential is documented for development databases only.
                user.set_password("cinexplorer-dev")
                user.save(update_fields=["password"])
                EmailAddress.objects.create(
                    user=user, email="dev@example.com", verified=True, primary=True
                )

        self.stdout.write(
            "Created dev account." if created else "Dev account already exists; unchanged."
        )
        call_command("sync_blacklist", stdout=self.stdout)
