"""Store write-once changes alongside their owning movie record."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("user_movie_data", "0004_liked_requires_watched"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserMovieChange",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "field",
                    models.CharField(
                        choices=[
                            ("watchlist", "Watchlist"),
                            ("watched", "Watched"),
                            ("liked", "Liked"),
                            ("rating", "Rating"),
                        ],
                        max_length=9,
                    ),
                ),
                ("turned_on", models.BooleanField()),
                ("rating", models.SmallIntegerField(blank=True, null=True)),
                ("from_entry", models.BooleanField()),
                ("created_at", models.DateTimeField()),
                ("made_on", models.DateField()),
                (
                    "record",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="changes",
                        to="user_movie_data.usermoviedata",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(
                            ("field__in", ["watchlist", "watched", "liked", "rating"])
                        ),
                        name="user_movie_change_field",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("rating__isnull", True), ("rating__range", (1, 10)), _connector="OR"
                        ),
                        name="user_movie_change_rating_range",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            models.Q(
                                ("field", "rating"), ("rating__isnull", False), ("turned_on", True)
                            ),
                            models.Q(
                                ("field", "rating"), ("rating__isnull", True), ("turned_on", False)
                            ),
                            models.Q(
                                models.Q(("field", "rating"), _negated=True),
                                ("rating__isnull", True),
                            ),
                            _connector="OR",
                        ),
                        name="user_movie_change_value",
                    ),
                ],
            },
        ),
    ]
