# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Context

**See `AI-SHARED.md` in this directory for comprehensive project context shared across all AI tools.**

Key reference documents:
- `_docs/META-PRD.md` - Product vision and requirements
- `_docs/PROJECT-STATUS.md` - Current progress and priorities  
- `_docs/TECHNICAL-ARCHITECTURE.md` - Technical architecture details

## WARP-Specific Guidelines

As a terminal-based AI, focus on:
- **Docker commands** for all development tasks
- **Quality gates** before suggesting commits
- **PowerShell syntax** for Windows environment

## Development Commands

### Starting Services (Recommended)
```powershell
# Start all services (backend, frontend, Caddy proxy, database)
docker-compose -f infrastructure/docker-compose.yml up

# Start specific service
docker-compose -f infrastructure/docker-compose.yml up backend
docker-compose -f infrastructure/docker-compose.yml up frontend
docker-compose -f infrastructure/docker-compose.yml up caddy

# Stop all services
docker-compose -f infrastructure/docker-compose.yml down
```

### Backend Development
```powershell
# Run Django tests
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test

# Run tests with custom settings
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test --settings=config.settings_test

# Run single test
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test apps.core.tests.test_models

# Run backend linting (flake8)
docker-compose -f infrastructure/docker-compose.yml exec backend flake8 --max-line-length=99 --exclude migrations

# Django database operations
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py migrate
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py makemigrations
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py wait_for_db

# Django shell
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py shell_plus
```

### Frontend Development
```powershell
# Install dependencies and run dev server (inside container)
docker-compose -f infrastructure/docker-compose.yml exec frontend npm install
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run dev

# Run frontend linting (ESLint)
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run lint

# Run frontend type checking
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run type-check

# Run frontend tests (Vitest)
docker-compose -f infrastructure/docker-compose.yml exec frontend npm test
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run test:watch
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run test:coverage

# Build frontend for production
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run build
```

### Development URLs
- Frontend (via Caddy): https://localhost:8444 
- Backend API (via Caddy): https://localhost:8444/api/
- Direct backend: https://localhost:8000
- Direct frontend: https://localhost:5173

## Quality Gates (MANDATORY)
**Always mention these before suggesting commits:**
- Backend: `docker-compose -f infrastructure/docker-compose.yml exec backend flake8 --max-line-length=99 --exclude migrations`
- Frontend: `docker-compose -f infrastructure/docker-compose.yml exec frontend npm run lint && npm run type-check`
- Backend Tests: `docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test --keepdb`
- Frontend Tests: `docker-compose -f infrastructure/docker-compose.yml exec frontend npm test`

> **Note**: Architecture details, coding standards, and comprehensive context are in `AI-SHARED.md` and `_docs/TECHNICAL-ARCHITECTURE.md`

<citations>
<document>
    <document_type>WARP_DOCUMENTATION</document_type>
    <document_id>getting-started/quickstart-guide/coding-in-warp</document_id>
</document>
</citations>