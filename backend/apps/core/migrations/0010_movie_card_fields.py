"""Store the movie card independently of live catalogue requests."""

import django.contrib.postgres.fields
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0009_change_tmdb_id_to_positive")]

    operations = [
        migrations.AddField(
            model_name="movie", name="vote_average", field=models.FloatField(blank=True, null=True)
        ),
        migrations.AddField(
            model_name="movie", name="vote_count", field=models.IntegerField(blank=True, null=True)
        ),
        migrations.AddField(
            model_name="movie", name="runtime", field=models.IntegerField(blank=True, null=True)
        ),
        migrations.AddField(
            model_name="movie", name="overview", field=models.TextField(blank=True, null=True)
        ),
        migrations.AddField(
            model_name="movie",
            name="genre_ids",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.IntegerField(), default=list, blank=True, size=None
            ),
        ),
        migrations.AddField(
            model_name="movie",
            name="refreshed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="movie",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="movie",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
