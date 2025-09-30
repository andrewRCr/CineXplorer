# Repository Guidelines
## Orientation & Context
- Start each session with `_docs/ai-instructions/AI-SHARED.md` for shared guardrails, then review persona notes in `CLAUDE.md`, `WARP.md`, or `GEMINI.md` to match the requested voice.
- Keep `_docs/DEVELOPMENT-RULES.md` and relevant `_docs/tasks/` open; they define approval gates and the next sub-task.

## Project Structure & Module Organization
- `backend/` hosts the Django REST API with domain apps (core, movie, user, user_movie_data) and co-located `tests/`; configurations live in `config/` and utilities in `scripts/`.
- `frontend/` is a Vite + React TypeScript client with feature code under `src/` and shared fixtures in `frontend/tests/`.
- `shared/` mirrors API contracts (`api_types.py` ⇄ `api-types.ts`); `_docs/` captures process, and `infrastructure/` holds Docker Compose definitions.

## Build, Test, and Development Commands
- Start the stack with `docker-compose -f infrastructure/docker-compose.yml up --build` and browse `https://localhost:8444`.
- Backend gates: `docker-compose exec backend python manage.py test --keepdb --settings=config.settings_test`, `docker-compose exec backend flake8`, and `docker-compose exec backend python scripts/type_check.py` (use `npx pyright backend/apps/` on host for quick loops).
- Frontend gates: `docker-compose exec frontend npm test`, `npm run lint`, `npm run type-check`; run `npm run dev` when iterating.

## Coding Style & Naming Conventions
- Python follows PEP 8 with 4-space indents; prefer TypedDicts and explicit generics.
- React components, providers, and contexts use PascalCase files; hooks start with `use`, and routes stay centralized in `frontend/src/constants/routes.ts`.
- ESLint (typescript-eslint, react-hooks, react-refresh) governs formatting—run targeted `npm run lint -- --fix path/to/file.tsx` instead of repo-wide sweeps.

## Testing Guidelines
- Co-locate Django tests with their modules (e.g., `backend/apps/movie/tests/test_movie_api.py`) and rely on `TestCase` for DB work.
- Run targeted backend tests with `python manage.py test apps.movie.tests.test_movie_api`; frontend uses Vitest + Testing Library bootstrapped in `frontend/tests/setup.ts`.
- Treat Pyright and TypeScript checks as part of the suite; type errors block merges just like failing tests.

## Commit & Pull Request Guidelines
- Use conventional commits with scoped context (`feat(api-modernization): …`, `docs(tasks): …`) and keep changes atomic across code, tests, and docs.
- Reference task IDs or PRD items in commit bodies per `_docs/workflows/atomic-commit.md`, and avoid mixing unrelated concerns.
- Pull requests summarize intent, list impacted areas, and attach quality-gate output plus any UI or API evidence.

## Environment & Security Tips
- Duplicate `backend/config/.env.example` to `.env`, populate TMDB, database, and Django secrets, keeping values out of git.
- Docker Compose ships with a self-signed Caddy certificate; trust it for local HTTPS or swap it in `infrastructure/docker-compose.yml`.
