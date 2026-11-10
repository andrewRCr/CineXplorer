# Quick Reference - CineXplorer

**Version**: 1.2 | **Updated**: 2026-10-30 | **Location**: `.arc/reference/`

## About This Reference Directory

**Read every session:**

- `DEVELOPMENT-RULES.md` (constitution/) - Rules and quality standards
- `QUICK-REFERENCE.md` (this file) - Environment and commands
- The work unit's `SESSION-NOTES.md` (`.arc/user/{identity}/{name}/`, gitignored) - Where the work stands and the
  next action

**Key documentation:**

- `constitution/` - Project principles (META-PRD, TECHNICAL-OVERVIEW, DEVELOPMENT-RULES)
- `adr/` - Architecture decision records (significant design decisions with context)
- `workflows/` - Core process guides (0_define-constitution.md, 1a_draft-design.md, 1_create-prd.md,
  2_generate-tasks.md, 3_process-task-loop.md)
- `workflows/supplemental/` - Supporting workflows (atomic-commit.md, session-handoff.md, manage-incidental-work.md)
- `strategies/` - Technical approaches (testing methodology, type safety, ADR methodology)
- `agent/` - AI-specific guidance (AGENTS.md, CLAUDE.md)

---

## Environment & Path Context

**Repository Root**: the checkout's top level (`git rev-parse --show-toplevel`)
**All commands in this document assume you are at repository root unless otherwise specified.**

**Expected environment:**

- **Docker:** this checkout's own Compose project. On the primary, 5 containers (backend, frontend, redis, caddy,
  postgres); in a linked worktree, 5 while its browsable stack runs, 3 (backend, redis, postgres) while its test
  stack runs, none otherwise
  ([worktree-sessions.md](workflows/supplemental/worktree-sessions.md))
- **Backend venv:** `.venv-backend/bin/` on Python 3.13 (built with `uv`), with ruff and pytest, synced from the
  hashed development lock ([Backend Dependencies](#backend-dependencies))

### Critical Path Reference

| Resource       | Location from Repo Root             | Why It Matters                     |
| -------------- | ----------------------------------- | ---------------------------------- |
| .arc docs      | `.arc/`                             | Documentation                      |
| Backend code   | `backend/apps/`, `backend/config/`  | Type checking, linting targets     |
| Backend venv   | `.venv-backend/bin/`                | Host tools (ruff, pytest)          |
| Docker Compose | `infrastructure/docker-compose.yml` | Required for all Docker operations |
| Frontend code  | `frontend/src/`                     | Frontend operations                |

**Working Directory Note**: Run commands from the repository root. From `backend/` or `frontend/`, adjust each path
by one level.

### Network Architecture & Ports

**Container Network:**

```
Browser → Caddy Proxy (8444) → Backend (8000) HTTPS
                             → Frontend (5173) HTTP
```

**Direct Access Ports:**

- **Backend API**: `https://localhost:8000` (direct HTTPS access, self-signed cert)
- **Frontend Dev Server**: `http://localhost:5173` (Vite dev server)
- **Caddy Proxy**: `https://localhost:8444` (unified entry point, production-like)

These are the primary's ports. A worktree publishes only Caddy on `127.0.0.1:{SITE_PORT}` from
`infrastructure/.env`; `node scripts/worktree.mjs browse` prints its address. Its frontend calls its own API at
that origin plus `/api`; its backend, database and Redis have no published ports.

**For Testing/Development:**

- **API Testing (curl/Postman)**: Use `https://localhost:8000` with `-k` flag (skip cert verification)
- **Browser Testing**: Use `https://localhost:8444` (Caddy proxy, handles CORS)
- **Frontend Development**: Use `http://localhost:5173` (hot reload, dev tools)

**Important Notes:**

- Backend serves HTTPS only (self-signed cert in development)
- Frontend `.env` has `VITE_BASE_API_URL="https://localhost:8444/api"` (includes `/api` prefix)
- All API endpoints are relative to `/api/` (e.g., `/movies/discover`, not `/api/movies/discover`)
- The backend reaches Redis by service name (`redis:6379`); the primary also publishes 6379 on the host, and a
  worktree's test stack publishes no ports, and its browser mode publishes only Caddy

### Console Logging for AI Debugging

Browser console logs automatically captured to `backend/logs/frontend.log` in development.

```bash
# Read logs
cat backend/logs/frontend.log

# Clear logs
rm backend/logs/frontend.log

# Tail in real-time
tail -f backend/logs/frontend.log
```

---

## Command Patterns

All commands shown from **repository root**.
If you're in a subdirectory, adjust paths accordingly.

### Type Checking (Python)

```bash
# Fast: Pyright via npx (works from any directory with correct paths)
# IMPORTANT: Always use directories or no args - NOT individual files
# Individual files may use default settings instead of pyrightconfig.json
npx pyright backend/apps/ backend/config/ --project backend

# From backend/ directory (uses pyrightconfig.json include list)
npx pyright

# Comprehensive: Type check script with per-app reporting
.venv-backend/bin/python backend/scripts/type_check.py
```

### Linting (Python)

```bash
# Host venv (FAST with auto-fix) - Recommended for development
.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix

# Formatter (CI fails on unformatted backend files)
.venv-backend/bin/ruff format backend/

# Docker (consistent across environments)
docker compose -f infrastructure/docker-compose.yml exec backend ruff check apps/ config/ --fix

# Note: From inside backend/ directory, use apps/ not backend/apps/
```

### Backend Dependencies

The `.in` files in `backend/requirements/` are what you edit; each has a hashed lock beside it (`req.txt`,
`req.prod.txt`, `req.dev.txt`) that the images and CI install. `req.dev.in` and `req.prod.in` include `req.in`, so
the development and production locks pin shared packages to the same versions. CI fails when a lock no longer matches
its inputs, or when a locked package has a known vulnerability.

```bash
# After editing an .in file: regenerate the locks, then rebuild the backend image
backend/requirements/lock.sh
docker compose -f infrastructure/docker-compose.yml build backend

# Sync the host venv with the development lock
uv pip sync backend/requirements/req.dev.txt --python .venv-backend/bin/python --require-hashes

# Check the locks for known vulnerabilities (CI runs the same)
.venv-backend/bin/pip-audit --require-hashes --disable-pip -r backend/requirements/req.prod.txt -r backend/requirements/req.dev.txt
```

### Testing (Backend)

**CRITICAL: Tests MUST run via Docker** (require PostgreSQL + Redis)

**Test Runner**: pytest with parallel execution enabled by default via pytest-xdist, capped at 4 workers
(`--maxprocesses 4` in `backend/pyproject.toml`; `-n auto` alone would start one per core). The full suite takes about
35 seconds and peaks near 650 MiB in the backend container; 8 workers save under 10 seconds for about 60% more memory.

```bash
# Run all tests (parallel execution is automatic, 4 workers)
docker compose -f infrastructure/docker-compose.yml exec backend nice -n 15 pytest apps/

# Sequential execution (for debugging test isolation issues)
docker compose -f infrastructure/docker-compose.yml exec backend nice -n 15 pytest apps/ -n 0

# With coverage (full app)
docker compose -f infrastructure/docker-compose.yml exec backend nice -n 15 pytest --cov=apps --cov-report=term-missing apps/

# With coverage (specific modules - use Python module paths, NOT file paths)
docker compose -f infrastructure/docker-compose.yml exec backend nice -n 15 pytest --cov=apps.authentication.api --cov=apps.authentication.middleware --cov-report=term-missing apps/authentication/tests/

# IMPORTANT: Coverage uses Python module notation
# ✅ Correct:   --cov=apps.authentication.api (module path)
# ❌ Incorrect: --cov=apps/authentication/api.py (file path - will fail)
```

### End-to-End Smoke Tests

Use a worktree's browsable stack: it has its own database, seeded account, and discarded mail. The primary stack
sends real verification mail. From the worktree root:

```bash
node scripts/worktree.mjs browse
# Prints https://localhost:{SITE_PORT}; use SITE_PORT from infrastructure/.env below
cd frontend
E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e
# Only the affected flow
E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/browse.spec.ts
```

The five Chromium specs scan their pages with axe, use catalogue fixtures locally, and have no retries. CI requires
them through `ci-ok`; its staging target skips registration and runs after deployment. See the
[testing strategy](strategies/project/strategy-testing-methodology.md#e2e-best-practices) for staging credentials,
artifacts, the accessibility baseline, and resetting the local registration limit.

### Linting (Frontend)

```bash
# On host Node (any checkout)
(cd frontend && npm run lint)
(cd frontend && npm run lint -- --fix)   # with auto-fix

# Via Docker (the primary's frontend container)
docker compose -f infrastructure/docker-compose.yml exec frontend nice -n 15 npm run lint

# With auto-fix
docker compose -f infrastructure/docker-compose.yml exec frontend nice -n 15 npm run lint -- --fix
```

### Type Checking (Frontend)

**CRITICAL: NEVER use `npx tsc` directly on individual files** - This bypasses project references and uses incorrect
module resolution.

```bash
# CORRECT: Use npm script (runs tsc -b with project references), after `npm run typegen`
# On host Node (any checkout)
(cd frontend && npm run type-check)
# Via Docker (the primary's frontend container)
docker compose -f infrastructure/docker-compose.yml exec frontend nice -n 15 npm run type-check

# WRONG: Direct tsc invocation - DO NOT USE
# npx tsc --noEmit src/some-file.tsx  ❌ INCORRECT
# npx tsc <file>                       ❌ INCORRECT
```

**Why:** Project uses TypeScript project references (`tsconfig.json` → `tsconfig.app.json`). Direct `tsc` calls bypass
this and produce false errors.

### Chakra UI Type Generation

**Run after modifying theme recipes** (variants, sizes, etc.) to regenerate component types:

```bash
# From frontend directory (preferred - uses installed CLI)
npm run typegen

# Or via npx (downloads CLI if not installed)
npx @chakra-ui/cli typegen ./src/theme/index.ts
```

**Why:** Custom recipe variants (e.g., Badge "success", Button "secondary") need type generation to be recognized by
TypeScript. Without this, you'll get errors like `Type '"success"' is not assignable to type...`

**Note:** CI runs `npm run typegen` automatically before type-check. Generated types are written to
`node_modules/@chakra-ui/react/dist/types/styled-system/generated/` and are not committed.

### API Type Generation (OpenAPI → TypeScript)

**Run after modifying backend API files** (`api.py`, `schemas.py`) to regenerate frontend types:

```bash
# Regenerate types: exports the schema from this checkout's own backend container (the primary's
# full stack, or a worktree's stack in test or browser mode), then generates src/types/api.ts
npm run generate-types --prefix frontend

# Check for uncommitted changes
git diff -- frontend/openapi.json frontend/src/types/api.ts
```

**Why:** Frontend types are generated from the backend's OpenAPI schema. CI verifies types match the schema -
if you modify backend APIs without regenerating types, CI will fail the "check for type drift" step.

**When to run:** Before creating PRs when backend API changes are involved. See also
[archive-completed.md](workflows/supplemental/archive-completed.md) Step 1b for pre-PR checklist.

### Markdown Linting

**⚠️ Run from repo root** - Config file (`.markdownlint-cli2.jsonc`) must be discoverable

```bash
# Check all files
npx markdownlint-cli2 "README.md" ".arc/**/*.md"

# Auto-fix all files
npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"

# Check single file only (bypass config globs)
npx markdownlint-cli2 --no-globs "path/to/file.md"

# Auto-fix single file only
npx markdownlint-cli2 --fix --no-globs "path/to/file.md"

# Fix table formatting (MD060 violations)
npx --yes markdown-table-prettify < input.md > output.md
# Or use VS Code extension: "Markdown Table Prettifier" (Ctrl+Shift+P → "Prettify tables")
```

**Important:**

- Without `--no-globs`, markdownlint-cli2 processes config globs **in addition to** specified files
- Use `--no-globs` when checking/fixing individual files to avoid processing entire workspace
- VS Code extension uses separate config (`.markdownlint.jsonc`)
- `markdownlint-cli2 --fix` does NOT fix MD060 (table alignment) - use `markdown-table-prettify` instead

---

## Quality Gate Commands

The full command set: the verification run, and the wider run when the affected surface calls for one
(DEVELOPMENT-RULES § Quality Gates). A task runs only its own checks; CI runs the full set on every pull request.

Heavy container commands carry `nice -n 15` inside the container: Docker Desktop runs container processes outside
this WSL distro, so the host's `nicecap` wrapper around `docker compose` would reach only the client. `memcap_gated`
cannot cap them either. The primary stack sets no memory limits, since limits in `docker-compose.yml` would also bind
CI and the production override; the worker cap keeps the full backend suite near 650 MiB in the backend container.
Revisit that as the suite grows. A worktree's stack caps every container in either mode: backend 1 GiB, `dev-db`
512 MiB, Redis 128 MiB, frontend 1 GiB and Caddy 128 MiB. Measured peaks and commands are in
`infrastructure/docker-compose.worktree.yml`.

```bash
# 1. Backend Tests (parallel execution enabled by default)
docker compose -f infrastructure/docker-compose.yml exec backend nice -n 15 pytest apps/

# 2. Frontend Tests (or on host Node: cd frontend && npm test)
docker compose -f infrastructure/docker-compose.yml exec frontend nice -n 15 npm test

# 3. Backend Linting (with auto-fix)
.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix

# 4. Frontend Linting (or on host Node: cd frontend && npm run lint)
docker compose -f infrastructure/docker-compose.yml exec frontend nice -n 15 npm run lint

# 5. TypeScript Type Checking (or on host Node, after typegen: cd frontend && npm run type-check)
docker compose -f infrastructure/docker-compose.yml exec frontend nice -n 15 npm run type-check

# 6. Python Type Safety
npx pyright backend/apps/ backend/config/ --project backend

# 7. Markdown Linting (with auto-fix)
npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"

# 8. End-to-End Smoke Tests: precondition is this worktree's running browsable stack
# Start it from the worktree root: node scripts/worktree.mjs browse
# Use SITE_PORT from infrastructure/.env; run the command from frontend/
(cd frontend && E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e)
```

---

## Docker Operations

```bash
# Check container status (this checkout's own project)
docker compose -f infrastructure/docker-compose.yml ps

# View logs
docker compose -f infrastructure/docker-compose.yml logs backend
docker compose -f infrastructure/docker-compose.yml logs frontend

# Follow logs (real-time)
docker compose -f infrastructure/docker-compose.yml logs -f backend

# Shell access
docker compose -f infrastructure/docker-compose.yml exec backend bash
docker compose -f infrastructure/docker-compose.yml exec frontend sh

# Rebuild after dependency changes
docker compose -f infrastructure/docker-compose.yml up --build

# Start services
docker compose -f infrastructure/docker-compose.yml up -d

# Stop services
docker compose -f infrastructure/docker-compose.yml down
```

---

## Movie Blacklist Operations

The blacklist's source of truth is `backend/apps/movie/data/blacklist.csv`: one row per TMDB movie ID
(`tmdb_id,reason,source`), sorted by ID, with no titles or other TMDB content. Change it in a pull request; the admin
shows the table read-only, and `sync_blacklist` loads the file.

- **Source:** `rule:{name}` rows belong to a rule in `apps/movie/services/data_quality/blacklist_rules.py`, which
  rewrites them; `hand:{how-it-was-found}-{yyyy-mm}` rows are reviewed picks, kept as they are. An ID appears once,
  and a hand pick keeps it when a rule also matches.
- **Add a hand pick:** add a row in ID order, with a reason and a `hand:` source, then sync.
- **Add or change a rule:** edit `RULES`, regenerate, and review the file's diff.
- **Sync** at dev setup, after any database reset, and in every deploy. It adds, removes and re-words rows to match
  the file, refuses a malformed file without changing anything, and clears the cached blacklist.

```bash
# Rewrite the rule rows from TMDB (hand picks are untouched; the file is written only if every query succeeds)
docker compose -f infrastructure/docker-compose.yml exec backend python manage.py regenerate_blacklist

# Load the file into the database
docker compose -f infrastructure/docker-compose.yml exec backend python manage.py sync_blacklist
```

### Reset the Dev Database

Dump it first, outside `/tmp`, and check the dump isn't empty before removing anything.

```bash
C="-f infrastructure/docker-compose.yml"
mkdir -p ~/dev/backups
docker compose $C exec -T dev-db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  > ~/dev/backups/cinexplorer-dev-$(date +%F-%H%M).dump
ls -l ~/dev/backups/

docker compose $C stop backend
docker compose $C rm -sf dev-db
docker volume rm infrastructure_dev-db-data
docker compose $C up -d --wait dev-db
docker compose $C up -d backend
docker compose $C exec backend python manage.py migrate
docker compose $C exec backend python manage.py sync_blacklist
```

The volume is named for the Compose project: `infrastructure_dev-db-data` in the main checkout,
`{COMPOSE_PROJECT_NAME}_dev-db-data` in a linked worktree. A dump restores into the running `dev-db` with
`docker compose $C exec -T dev-db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < {dump}`.

---

## TMDB API Queries (Ad-hoc)

**Use Django shell with TMDBApiClient** - automatic API key injection, error handling, structured responses.

```bash
# Single movie details
docker compose -f infrastructure/docker-compose.yml exec -T backend python manage.py shell <<'EOF'
from core.services.tmdb_api_client import TMDBApiClient

client = TMDBApiClient()
response = client.get_movie_details(123456)  # TMDB movie ID

if response.is_success:
    data = response.data
    print(f"Title: {data.get('title')}")
    print(f"Release: {data.get('release_date')}")
    print(f"Adult flag: {data.get('adult')}")
    print(f"Companies: {[c.get('name') for c in data.get('production_companies', [])]}")
else:
    print(f"Error: {response.error_message}")
EOF

# Batch movie details
docker compose -f infrastructure/docker-compose.yml exec -T backend python manage.py shell <<'EOF'
from core.services.tmdb_api_client import TMDBApiClient

client = TMDBApiClient()
movie_ids = [123, 456, 789]

for movie_id in movie_ids:
    response = client.get_movie_details(movie_id)
    if response.is_success:
        data = response.data
        print(f"{movie_id}: {data.get('title')} ({data.get('release_date', '')[:4]})")
EOF

# Discover movies by production company
docker compose -f infrastructure/docker-compose.yml exec -T backend python manage.py shell <<'EOF'
from core.services.tmdb_api_client import TMDBApiClient

client = TMDBApiClient()
response = client.get("discover/movie", params={"with_companies": 12782})  # Company ID

if response.is_success:
    print(f"Total: {response.data.get('total_results')} movies")
    for m in response.data.get('results', [])[:10]:
        print(f"  {m.get('title')} ({m.get('release_date', '')[:4]})")
EOF
```

**Available TMDBApiClient methods:**

- `get_movie_details(movie_id)` - Movie details including production companies
- `search_movies(query, page=1)` - Search by title
- `discover_movies(**params)` - Discovery endpoint with filters
- `get(endpoint, params)` - Generic GET for any TMDB endpoint

---

## Anti-Patterns

### Path Confusion

❌ Assuming you're at repo root without checking
❌ Using `cd` commands unnecessarily
❌ Forgetting `-f infrastructure/docker-compose.yml` for Docker Compose

✅ Check `pwd` first
✅ Use absolute paths or correct relative paths
✅ Always use `-f` flag with explicit path for Docker Compose

### Docker Assumptions

❌ "Docker isn't running" without verifying
❌ Running backend tests from the host (no database connection)
❌ Assuming containers are up without checking
❌ Using wrong ports (localhost:3000 vs localhost:8000)

✅ Verify: `docker compose -f infrastructure/docker-compose.yml ps` (5 containers on the primary; in a worktree,
5 for its browsable stack, 3 for its test stack, none otherwise)
✅ Backend tests always run in Docker, in this checkout's own stack; frontend tests run on host Node or in Docker
✅ Check container status before operations
✅ Use `https://localhost:8000` for direct API testing (see Network Architecture section)

### Command Construction

❌ Using commands from DEVELOPMENT-RULES without checking paths
❌ Mixing repo-root and subdirectory paths
❌ Assuming tools are in PATH vs. venv

✅ Use commands from QUICK-REFERENCE (paths correct for repo root)
✅ Adjust paths when working from a subdirectory
✅ Use explicit paths for venv tools: `.venv-backend/bin/[tool]`

---

**Version Note**: Commands assume repo root. From a subdirectory (backend/, frontend/), adjust paths by one
level.
