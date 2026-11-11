"""Bound stored user state and keep the schema reversible."""

import django.utils.timezone
from django.db import migrations, models
from django.db.models.functions import Length
from django.db.models.lookups import LessThanOrEqual


def clean_reviews(apps, schema_editor):
    record_model = apps.get_model("user_movie_data", "UserMovieData")
    records = record_model.objects.using(schema_editor.connection.alias)
    for record in records.exclude(user_review__isnull=True).iterator():
        review = record.user_review[:10000]
        record.user_review = review if review.strip() else None
        record.save(update_fields=["user_review"])


class Migration(migrations.Migration):
    dependencies = [("user_movie_data", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="usermoviedata",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="usermoviedata",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="usermoviedata",
            name="watched_at",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="usermoviedata",
            name="user_review",
            field=models.TextField(blank=True, null=True, max_length=10000),
        ),
        migrations.AlterField(
            model_name="usermoviedata",
            name="user_watched",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="usermoviedata",
            name="user_on_watchlist",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="usermoviedata", name="user_liked", field=models.BooleanField(default=False)
        ),
        migrations.RunPython(clean_reviews, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(name="usermoviedata", unique_together=set()),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.UniqueConstraint(fields=["user", "movie"], name="user_movie_unique"),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(user_rating__isnull=True)
                | models.Q(user_rating__range=(1, 10)),
                name="user_movie_rating_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(user_review__isnull=True)
                | models.Q(
                    user_review__regex="[^\t\n\x0b\x0c\r\x1c\x1d\x1e\x1f \x85\xa0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]"
                ),
                name="user_movie_review_has_text",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(user_review__isnull=True)
                | models.Q(LessThanOrEqual(Length("user_review"), models.Value(10000))),
                name="user_movie_review_length",
            ),
        ),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(watched_at__isnull=True) | models.Q(user_watched=True),
                name="user_movie_watched_date",
            ),
        ),
        migrations.AddIndex(
            model_name="usermoviedata",
            index=models.Index(fields=["user", "-created_at"], name="user_movie_added_idx"),
        ),
    ]
