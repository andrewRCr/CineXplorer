# CineXplorer

<div align="center">
  <a href="https://github.com/andrewRCr/CineXplorer/actions/workflows/ci.yml">
    <img alt="CI"
      src="https://github.com/andrewRCr/CineXplorer/actions/workflows/ci.yml/badge.svg" /></a>
</div>

A movie discovery platform built on Django Ninja and React TypeScript, integrating with the
TMDB API for browsing, filtering, and managing personal watchlists. The core engineering
challenge is data quality: TMDB's catalog contains millions of entries with inconsistent
metadata, mislabeled content, and unreliable ratings. A multi-stage backend pipeline filters
and validates API responses before they reach the frontend. The backend follows a layered
service architecture with dependency injection and repository patterns, running in Docker
with a Caddy reverse proxy and Redis caching. Type safety spans the full stack, from Pydantic
schemas and Pyright strict mode to auto-generated TypeScript types.

<p align="center">
  <a href="https://andrewcreekmore.dev/projects/software/cinexplorer">Portfolio</a>
</p>

<!-- Screenshots will be added when the project reaches a presentable state. -->

## Details

*Users discover movies via robust category and filtering options, manage personal watchlists,
build shareable curated collections, log watches with ratings and reviews to a personal
timeline, and receive personalized recommendations.*

- Type safety from API to frontend: Pydantic schemas, Pyright strict mode, and auto-generated
  TypeScript types across 23 API endpoints
- Dual-pattern authentication: JWT for email/password, OAuth 2.0 for social login (Google,
  GitHub)
- Multi-stage data quality pipeline filtering at five stages — language-script mismatch
  detection, blacklisting, completeness validation, release date verification, and tiered
  vote-count thresholds calibrated by sort context
- Five-container Docker architecture with Caddy reverse proxy, Redis caching, and CI/CD
  pipeline
- Constructor-based dependency injection across 7 services with repository pattern, enabling
  isolated unit testing without mock patching
- Unified semantic token system spanning four design systems (GitHub Primer, IBM Carbon,
  GitLab Pajamas, Material Design 3) with runtime theme switching at ~19ms per switch

## Technology

- **Frontend:** React, TypeScript, Vite, Chakra UI, TanStack Query
- **Backend:** Django, Django Ninja, Python, Pydantic
- **Database:** PostgreSQL, Redis
- **Infrastructure:** Docker, Caddy, GitHub Actions CI
- **Testing:** Vitest, React Testing Library, Playwright, Pytest

## Quick Start

**Prerequisites:** Docker, Docker Compose, and a [TMDB API key](https://www.themoviedb.org/settings/api)

```bash
git clone https://github.com/andrewRCr/CineXplorer.git
cd CineXplorer

# Configure environment
cp backend/config/.env.example backend/config/.env
# Edit .env with your TMDB_API_KEY and DJANGO_SECRET_KEY

# Run with Docker
docker-compose -f infrastructure/docker-compose.yml up --build
```

Access at `https://localhost:8444` (accept the self-signed certificate warning).

<p align="center"><a href="#cinexplorer">↑ Back to top</a></p>
