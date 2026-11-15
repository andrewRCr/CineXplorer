"""Keep viewing history and list join times through a reversible reshape."""

import django.core.validators
import django.db.models.deletion
import django.db.models.functions.text
import django.db.models.lookups
from django.conf import settings
from django.db import migrations, models


def carry_history_forward(apps, schema_editor):
    alias = schema_editor.connection.alias
    records = apps.get_model("user_movie_data", "UserMovieData").objects.using(alias)
    entries = apps.get_model("user_movie_data", "UserMovieEntry").objects.using(alias)
    for record in records.iterator():
        if record.watched_at is not None or record.user_review is not None:
            entry = entries.create(
                record_id=record.pk,
                watched_on=record.watched_at,
                review=record.user_review,
                rating=record.user_rating,
                made_on=record.updated_at.date(),
                rewatch=False,
            )
            entries.filter(pk=entry.pk).update(
                created_at=record.updated_at, updated_at=record.updated_at
            )
        times = {}
        for flag, stamp in [
            ("user_watched", "watched_added_at"),
            ("user_on_watchlist", "watchlist_added_at"),
            ("user_liked", "liked_added_at"),
        ]:
            if getattr(record, flag):
                times[stamp] = record.created_at
        if not record.user_watched and (
            record.user_rating is not None or record.user_review is not None
        ):
            times["user_watched"] = True
            times["watched_added_at"] = record.updated_at
        records.filter(pk=record.pk).update(**times)
    schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


def restore_record_history(apps, schema_editor):
    from django.db.models.functions import Coalesce

    alias = schema_editor.connection.alias
    records = apps.get_model("user_movie_data", "UserMovieData").objects.using(alias)
    entries = apps.get_model("user_movie_data", "UserMovieEntry").objects.using(alias)
    for record in records.iterator():
        history = (
            entries.filter(record_id=record.pk)
            .alias(effective_on=Coalesce("watched_on", "made_on"))
            .order_by("-effective_on", "-created_at", "-pk")
        )
        dated = history.filter(watched_on__isnull=False).first()
        reviewed = history.filter(review__isnull=False).first()
        records.filter(pk=record.pk).update(
            watched_at=dated.watched_on if dated else None,
            user_review=reviewed.review if reviewed else None,
        )
    schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_movie_card_fields"),
        ("user_movie_data", "0002_constrain_user_movie_data"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="usermoviedata",
            name="liked_added_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="usermoviedata",
            name="watched_added_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="usermoviedata",
            name="watchlist_added_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="UserMovieEntry",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("watched_on", models.DateField(blank=True, null=True)),
                (
                    "rating",
                    models.IntegerField(
                        blank=True,
                        null=True,
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(10),
                        ],
                    ),
                ),
                ("review", models.TextField(blank=True, max_length=10000, null=True)),
                ("rewatch", models.BooleanField(default=False)),
                ("made_on", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddField(
            model_name="usermovieentry",
            name="record",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="entries",
                to="user_movie_data.usermoviedata",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermovieentry",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("watched_on__isnull", False), ("review__isnull", False), _connector="OR"
                ),
                name="user_movie_entry_has_content",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermovieentry",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("rewatch", False), ("watched_on__isnull", False), _connector="OR"
                ),
                name="user_movie_entry_rewatch_dated",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermovieentry",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("rating__isnull", True), ("rating__range", (1, 10)), _connector="OR"
                ),
                name="user_movie_entry_rating_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermovieentry",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("review__isnull", True),
                    (
                        "review__regex",
                        "[^\t\n\x0b\x0c\r\x1c\x1d\x1e\x1f \x85\xa0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]",
                    ),
                    _connector="OR",
                ),
                name="user_movie_entry_review_has_text",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermovieentry",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("review__isnull", True),
                    django.db.models.lookups.LessThanOrEqual(
                        django.db.models.functions.text.Length("review"), models.Value(10000)
                    ),
                    _connector="OR",
                ),
                name="user_movie_entry_review_length",
            ),
        ),
        migrations.RunPython(carry_history_forward, restore_record_history),
        migrations.RemoveConstraint(
            model_name="usermoviedata",
            name="user_movie_review_has_text",
        ),
        migrations.RemoveConstraint(
            model_name="usermoviedata",
            name="user_movie_review_length",
        ),
        migrations.RemoveConstraint(
            model_name="usermoviedata",
            name="user_movie_watched_date",
        ),
        migrations.RemoveField(
            model_name="usermoviedata",
            name="user_review",
        ),
        migrations.RemoveField(
            model_name="usermoviedata",
            name="watched_at",
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("user_rating__isnull", True), ("user_watched", True), _connector="OR"
                ),
                name="user_movie_rating_watched",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("user_watched", False), ("watched_added_at__isnull", False), _connector="OR"
                ),
                name="user_movie_watched_added",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("user_on_watchlist", False),
                    ("watchlist_added_at__isnull", False),
                    _connector="OR",
                ),
                name="user_movie_watchlist_added",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("user_liked", False), ("liked_added_at__isnull", False), _connector="OR"
                ),
                name="user_movie_liked_added",
            ),
        ),
    ]
