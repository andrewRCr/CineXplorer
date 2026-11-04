"""Store existing email addresses in lowercase.

allauth lowercases an email before matching it at sign-in and password reset, so an address
stored with capitals never matches. Registration now stores addresses in lowercase; this brings
existing users and their email records in line. Reversing it leaves the addresses lowercase.
"""

from __future__ import annotations

from collections import defaultdict

from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def lowercase_emails(apps: Apps, schema_editor: BaseDatabaseSchemaEditor | None) -> None:
    """Lowercase every stored address, or stop unchanged if that would merge two."""
    user_model = apps.get_model("auth", "User")
    email_address_model = apps.get_model("account", "EmailAddress")

    owners: defaultdict[str, set[int]] = defaultdict(set)
    records: defaultdict[tuple[int, str], int] = defaultdict(int)
    for user_id, email in user_model.objects.exclude(email="").values_list("id", "email"):
        owners[email.lower()].add(user_id)
    for user_id, email in email_address_model.objects.values_list("user_id", "email"):
        owners[email.lower()].add(user_id)
        records[(user_id, email.lower())] += 1

    conflicted = {user_id for ids in owners.values() if len(ids) > 1 for user_id in ids}
    conflicted |= {user_id for (user_id, _), count in records.items() if count > 1}
    if conflicted:
        user_ids = ", ".join(str(user_id) for user_id in sorted(conflicted))
        raise RuntimeError(
            "Stored email addresses differ only in case, so lowercasing them would give two "
            f"accounts, or two records of one account, the same address (user IDs: {user_ids}). "
            "Resolve them, then run the migration again."
        )

    for model in (user_model, email_address_model):
        for pk, email in model.objects.values_list("pk", "email").iterator():
            if email != email.lower():
                model.objects.filter(pk=pk).update(email=email.lower())


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("account", "0009_emailaddress_unique_primary_email"),
    ]

    operations = [
        migrations.RunPython(lowercase_emails, migrations.RunPython.noop),
    ]
