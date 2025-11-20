# Quick Reference - CineXplorer

**Version**: 1.1 | **Updated**: 2025-10-14 | **Location**: `.arc/reference/`

## About This Reference Directory

**Read every session:**

- `DEVELOPMENT-RULES.md` (constitution/) - Rules and quality standards
- `QUICK-REFERENCE.md` (this file) - Environment and commands
- `CURRENT-SESSION.md` (active/) - Work status and next actions

**Key documentation:**

- `constitution/` - Project principles (META-PRD, TECHNICAL-OVERVIEW, PROJECT-STATUS)
- `adr/` - Architecture decision records (significant design decisions with context)
- `workflows/` - Core process guides (0-define-constitution.md, 1-create-prd.md, 2-generate-tasks.md, 3-process-task-loop.md)
- `workflows/supplemental/` - Supporting workflows (atomic-commit.md, session-handoff.md, manage-incidental-work.md)
- `strategies/` - Technical approaches (testing methodology, type safety, ADR methodology)
- `agent/` - AI-specific guidance (AGENTS.md, CLAUDE.md, WARP.md, GEMINI.md, copilot-instructions.md)

---

## Environment & Path Context

**Repository Root**: `/home/andrew/dev/CineXplorer/`
**All commands in this document assume you are at repository root unless otherwise specified.**

### Critical Path Reference

| Resource       | Location from Repo Root             | Why It Matters                     |
| -------------- | ----------------------------------- | ---------------------------------- |
| .arc docs      | `.arc/`                             | Documentation                      |
| Backend code   | `backend/apps/`, `backend/config/`  | Type checking, linting targets     |
| Backend venv   | `.venv-backend/bin/`                | Host tools (ruff, pytest)          |
| Docker Compose | `infrastructure/docker-compose.yml` | Required for all Docker operations |
| Frontend code  | `frontend/src/`                     | Frontend operations                |

**Working Directory Note**: Your actual working directory may vary (backend/, frontend/, or root).
CURRENT-SESSION.md contains context-specific paths adjusted for your current location.

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

**For Testing/Development:**

- **API Testing (curl/Postman)**: Use `https://localhost:8000` with `-k` flag (skip cert verification)
- **Browser Testing**: Use `https://localhost:8444` (Caddy proxy, handles CORS)
- **Frontend Development**: Use `http://localhost:5173` (hot reload, dev tools)

**Important Notes:**

- Backend serves HTTPS only (self-signed cert in development)
- Frontend `.env` has `VITE_BASE_API_URL="https://localhost:8444/api"` (includes `/api` prefix)
- All API endpoints are relative to `/api/` (e.g., `/movies/discover`, not `/api/movies/discover`)
- Redis runs internally (no exposed port needed for development)

### Console Logging for AI Debugging

Browser console logs automatically captured to `backend/logs/frontend/.console-logs.txt` in development.

```bash
# Read logs
cat backend/logs/frontend/.console-logs.txt

# Clear logs
rm backend/logs/frontend/.console-logs.txt

# Tail in real-time
tail -f backend/logs/frontend/.console-logs.txt
```

---

## Command Patterns

All commands shown from **repository root**.
If you're in a subdirectory, adjust paths accordingly (see CURRENT-SESSION.md for your context).

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

# Docker (consistent across environments)
docker compose -f infrastructure/docker-compose.yml exec backend ruff check apps/ config/ --fix

# Note: From inside backend/ directory, use apps/ not backend/apps/
```

### Testing (Backend)

**CRITICAL: Tests MUST run via Docker** (require PostgreSQL + Redis)

**Test Runner**: pytest (migration complete 2025-10-13, 100% of tests converted)

```bash
# Run all tests (standard)
docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/

# Parallel execution (2-4x faster, recommended for development)
docker compose -f infrastructure/docker-compose.yml exec backend pytest -n auto apps/

# With coverage (full app)
docker compose -f infrastructure/docker-compose.yml exec backend pytest --cov=apps --cov-report=term-missing apps/

# With coverage (specific modules - use Python module paths, NOT file paths)
docker compose -f infrastructure/docker-compose.yml exec backend pytest --cov=apps.authentication.api --cov=apps.authentication.middleware --cov-report=term-missing apps/authentication/tests/

# IMPORTANT: Coverage uses Python module notation
# ✅ Correct:   --cov=apps.authentication.api (module path)
# ❌ Incorrect: --cov=apps/authentication/api.py (file path - will fail)
```

### Linting (Frontend)

```bash
# Via Docker
docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint

# With auto-fix
docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint -- --fix
```

### Type Checking (Frontend)

**CRITICAL: NEVER use `npx tsc` directly on individual files** - This bypasses project references and uses incorrect
module resolution.

```bash
# CORRECT: Use npm script (runs tsc -b with project references)
docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check

# WRONG: Direct tsc invocation - DO NOT USE
# npx tsc --noEmit src/some-file.tsx  ❌ INCORRECT
# npx tsc <file>                       ❌ INCORRECT
```

**Why:** Project uses TypeScript project references (`tsconfig.json` → `tsconfig.app.json`). Direct `tsc` calls bypass
this and produce false errors.

### Chakra UI Type Generation

**Run after modifying theme recipes** (variants, sizes, etc.) to regenerate component types:

```bash
# From frontend directory
npx @chakra-ui/cli typegen ./src/theme/index.ts
```

**Why:** Custom recipe variants (e.g., Badge "success", Button "secondary") need type generation to be recognized by
TypeScript. Without this, you'll get errors like `Type '"success"' is not assignable to type...`

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

Reference for DEVELOPMENT-RULES quality gates. Run these before any commit.

```bash
# 1. Backend Tests (pytest - migration complete 2025-10-13)
docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/

# 2. Frontend Tests
docker compose -f infrastructure/docker-compose.yml exec frontend npm test

# 3. Backend Linting (with auto-fix)
.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix

# 4. Frontend Linting
docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint

# 5. TypeScript Type Checking
docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check

# 6. Python Type Safety
npx pyright backend/apps/ backend/config/ --project backend

# 7. Markdown Linting (with auto-fix)
npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"
```

---

## Docker Operations

```bash
# Check container status
docker ps | grep infrastructure

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
❌ Running tests from host (no database connection)
❌ Assuming containers are up without checking
❌ Using wrong ports (localhost:3000 vs localhost:8000)

✅ Verify: `docker ps | grep infrastructure` (expect 5 containers)
✅ Always use Docker for tests
✅ Check container status before operations
✅ Use `https://localhost:8000` for direct API testing (see Network Architecture section)

### Command Construction

❌ Using commands from DEVELOPMENT-RULES without checking paths
❌ Mixing repo-root and subdirectory paths
❌ Assuming tools are in PATH vs. venv

✅ Use commands from QUICK-REFERENCE (paths correct for repo root)
✅ Adjust paths based on your working directory (see CURRENT-SESSION.md)
✅ Use explicit paths for venv tools: `.venv-backend/bin/[tool]`

---

**Version Note**: Commands assume repo root. If working from subdirectory (backend/, frontend/), see
CURRENT-SESSION.md "Session Startup Protocol" for adjusted paths.
