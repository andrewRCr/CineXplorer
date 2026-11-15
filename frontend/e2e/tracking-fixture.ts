import { execFileSync } from "node:child_process";
import { randomInt, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { components } from "@/types/api";
import { movieDetail } from "./catalogue";
import { test as base, expect } from "./fixtures";
import { target } from "./target";

type TrackingFilm = {
    id: number;
    title: string;
    username: string;
    password: string;
};

const root = fileURLToPath(new URL("../../", import.meta.url));

function databaseFixture(film: TrackingFilm, remove = false) {
    // Use the same Compose project as the browser target, including CI's overrides.
    execFileSync(
        "docker",
        [
            "compose",
            ...(process.env.COMPOSE_FILE
                ? []
                : ["-f", "infrastructure/docker-compose.yml"]),
            "exec",
            "-T",
            "backend",
            "nice",
            "-n",
            "15",
            "python",
            "manage.py",
            "shell",
            "-c",
            `
import json, sys
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from allauth.account.models import EmailAddress
from apps.core.models import Movie
assert settings.ENVIRONMENT == "development", "Browser fixtures require development settings"
data = json.load(sys.stdin)
User = get_user_model()
with transaction.atomic():
    if data["remove"]:
        User.objects.filter(username=data["username"], email=data["username"] + "@example.com").delete()
        Movie.objects.filter(tmdb_id=data["id"], title=data["title"]).delete()
        assert not User.objects.filter(username=data["username"]).exists()
        assert not Movie.objects.filter(tmdb_id=data["id"]).exists()
    else:
        user = User.objects.create_user(username=data["username"], email=data["username"] + "@example.com", password=data["password"])
        EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
        Movie.objects.create(tmdb_id=data["id"], title=data["title"], release_date="1981-01-01", vote_average=8, vote_count=20, runtime=100, genre_ids=[])
`,
        ],
        {
            cwd: root,
            input: JSON.stringify({ ...film, remove }),
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 30000,
        },
    );
}

export const test = base.extend<{ tracking: TrackingFilm }>({
    tracking: async ({ page }, use) => {
        test.skip(
            target.name !== "local",
            "Temporary database fixtures run only on the local target",
        );
        const identity = randomUUID();
        const film = {
            id: randomInt(1700000000, 2000000000),
            title: "A browser viewing",
            username: `browser-${identity}`,
            password: randomUUID(),
        };
        databaseFixture(film);
        try {
            // Catalogue content is synthetic; tracking fields are read from persisted records.
            // Backend integration tests separately cover enrichment on the live catalogue endpoints.
            await page.route("**/api/movies/**", async (route) => {
                const request = route.request();
                const path = new URL(request.url()).pathname;
                if (
                    request.method() !== "GET" ||
                    (path !== "/api/movies/browse" &&
                        path !== `/api/movies/${film.id}`)
                ) {
                    await route.fallback();
                    return;
                }
                let record:
                    components["schemas"]["UserMovieDataSchema"] | null = null;
                const authorization = request.headers().authorization;
                if (authorization) {
                    const response = await page.request.get(
                        new URL(
                            `/api/user-movie-data/${film.id}`,
                            target.baseURL,
                        ).href,
                        { headers: { authorization } },
                    );
                    expect([200, 404]).toContain(response.status());
                    if (response.ok()) record = await response.json();
                }
                const detail = {
                    ...movieDetail(film.id),
                    title: film.title,
                    user_movie_data: record,
                };
                await route.fulfill({
                    json:
                        path === "/api/movies/browse"
                            ? {
                                  page: 1,
                                  total_pages: 1,
                                  total_results: 1,
                                  next_tmdb_page_start: null,
                                  results: [detail],
                              }
                            : detail,
                });
            });
            await use(film);
        } finally {
            databaseFixture(film, true);
        }
    },
});

export { expect };
