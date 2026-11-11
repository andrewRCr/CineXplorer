# CineXplorer

<div align="center">
  <a href="https://github.com/andrewRCr/CineXplorer/actions/workflows/ci.yml">
    <img alt="CI"
      src="https://github.com/andrewRCr/CineXplorer/actions/workflows/ci.yml/badge.svg" /></a>
</div>

A movie discovery platform built on Django Ninja and React TypeScript, integrating with the
TMDB API for browsing, filtering, and keeping a personal watchlist. The core engineering
challenge is data quality: TMDB's catalog contains millions of entries with inconsistent
metadata, mislabeled content, and unreliable ratings. A multi-stage backend pipeline filters
and validates API responses before they reach the frontend. The backend follows a layered
service architecture with dependency injection and shared ORM queries, running in Docker
with a Caddy reverse proxy and Redis caching. Type safety spans the full stack, from Pydantic
schemas and Pyright strict mode to auto-generated TypeScript types.

**Status: in progress.** Browsing, accounts and the watchlist work today. Tracking what you've
watched, a landing page and a redesigned movie page are in development ahead of the public
launch.

<p align="center">
  <a href="https://andrewcreekmore.dev/projects/software/cinexplorer">Portfolio</a>
</p>

<!-- Screenshots will be added when the project reaches a presentable state. -->

## Details

**Built:**

- Browse, Now Playing, Upcoming and search across TMDB's catalog, with category, filter and
  sort controls, infinite scroll, and scroll position kept on return
- Movie detail pages and a personal watchlist
- Accounts: email sign-up with verification, and sign-in with Google or GitHub

**In development, for launch:**

- Marking movies watched, liked and rated, and a library to browse them
- A landing page, a redesigned movie detail page, and a demo account to try it without signing
  up
- The public deployment; a staging server runs today

**Engineering:**

- Type safety from API to frontend: Pydantic schemas, Pyright strict mode, and TypeScript
  types generated from the API schema for every endpoint
- Dual-pattern authentication: JWT for email/password, OAuth 2.0 for social login (Google,
  GitHub)
- Multi-stage data quality pipeline filtering at five stages — language-script mismatch
  detection, blacklisting, completeness validation, release date verification, and tiered
  vote-count thresholds calibrated by sort context
- Docker Compose stacks for development and production behind a Caddy reverse proxy, with
  Redis caching; CI runs the test, lint and type-check suites and publishes the production
  images
- Constructor-based dependency injection for external clients, with service tests exercising
  real database queries
- Unified semantic token system spanning four design systems (GitHub Primer, IBM Carbon,
  GitLab Pajamas, Material Design 3) with runtime theme switching at ~19ms per switch

## Technology

- **Frontend:** React, TypeScript, Vite, Chakra UI, TanStack Query
- **Backend:** Django, Django Ninja, Python, Pydantic
- **Database:** PostgreSQL, Redis
- **Infrastructure:** Docker, Caddy, GitHub Actions CI
- **Testing:** Vitest, React Testing Library, Pytest

## Quick Start

**Prerequisites:** Docker, Docker Compose, and a [TMDB API Read Access Token](https://www.themoviedb.org/settings/api)

```bash
git clone https://github.com/andrewRCr/CineXplorer.git
cd CineXplorer

# Configure environment
cp backend/config/.env.example backend/config/.env
# Edit .env with your TMDB_READ_ACCESS_TOKEN and DJANGO_SECRET_KEY

# Run with Docker
docker-compose -f infrastructure/docker-compose.yml up --build

# In a second terminal, once the stack is up: create the tables and load the movie blacklist
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py migrate
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py sync_blacklist
```

Access at `https://localhost:8444` (accept the self-signed certificate warning).

<p align="center"><a href="#cinexplorer">↑ Back to top</a></p>
