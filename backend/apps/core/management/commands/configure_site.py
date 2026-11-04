"""Set Django's Site identity from the deployment environment."""

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    """Configure the current Site without requiring admin changes after a deploy."""

    help = "Set the deployment Site domain and name."

    def handle(self, *args: object, **options: object) -> None:
        domain = getattr(settings, "SITE_DOMAIN", None)
        if not domain:
            raise CommandError("SITE_DOMAIN must be set before configuring the deployment Site.")

        site, created = Site.objects.get_or_create(
            pk=settings.SITE_ID, defaults={"domain": domain, "name": "CineXplorer"}
        )
        changed = created or site.domain != domain or site.name != "CineXplorer"
        if changed and not created:
            site.domain = domain
            site.name = "CineXplorer"
            site.save(update_fields=["domain", "name"])
        if changed:
            Site.objects.clear_cache()
        result = "CHANGED" if changed else "UNCHANGED"
        self.stdout.write(f"{result}: Site {settings.SITE_ID} configured for {domain}.")
