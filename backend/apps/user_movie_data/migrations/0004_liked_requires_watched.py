"""Convert liked films to watched before enforcing the like invariant."""

from django.db import migrations, models


def mark_liked_watched(apps, schema_editor):
    records = apps.get_model("user_movie_data", "UserMovieData").objects.using(
        schema_editor.connection.alias
    )
    records.filter(user_liked=True, user_watched=False).update(
        user_watched=True, watched_added_at=models.F("liked_added_at")
    )
    schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


class Migration(migrations.Migration):
    dependencies = [("user_movie_data", "0003_movie_entries")]
    operations = [
        migrations.RunPython(mark_liked_watched, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="usermoviedata",
            constraint=models.CheckConstraint(
                condition=models.Q(user_liked=False) | models.Q(user_watched=True),
                name="user_movie_liked_watched",
            ),
        ),
    ]
