# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Context Documents

**READ THESE FIRST** before starting any significant work:

- **`_docs/DEVELOPMENT-RULES.md`** - **CORE RULES** - Non-negotiable development standards and protocols
- **`_docs/ai-instructions/AI-SHARED.md`** - Complete project context, technology stack, architectural patterns, and development standards
- **`_docs/META-PRD.md`** - Product vision, core features, user flows, and success metrics
- **`_docs/TECHNICAL-ARCHITECTURE.md`** - Detailed technical architecture, testing methodology, and implementation patterns
- **`_docs/PROJECT-STATUS.md`** - Current progress, completed features, and upcoming priorities

## Systematic AI Development Workflow

This project uses a structured **3-step AI-assisted development process**:

### Step 1: Feature Planning (`_docs/workflows/create-prd.md`)
- Generate Sub-PRDs from user requirements
- Ask clarifying questions with letter/number options for easy responses
- Review META-PRD context for product alignment
- Save as `_docs/sub-prds/prd-[feature-name].md`

### Step 2: Task Generation (`_docs/workflows/generate-tasks.md`)
- Convert Sub-PRDs into actionable task lists
- Two-phase process: high-level tasks → detailed sub-tasks
- Wait for user "Go" confirmation between phases
- Save as `_docs/tasks/tasks-prd-[feature-name].md`

### Step 3: Task Execution (`_docs/workflows/process-tasks.md`)
- **CRITICAL**: Complete ONE sub-task at a time
- **MANDATORY STOP** after each sub-task for user approval
- Test-first approach for models, APIs, and complex logic
- Update task list immediately after each completion
- Full test suite + linting before any commits
- Follow atomic commit workflow (`_docs/workflows/atomic-commit.md`)

## Project Overview

CineXplorer is a full-stack movie discovery application built with Django REST Framework (backend) and React/TypeScript (frontend), containerized with Docker. The architecture follows a clear separation with a Django REST API backend and React SPA frontend, connected through a shared type system.

## Development Commands

### Starting the Application
```bash
# Run full stack with Docker (recommended)
docker-compose -f infrastructure/docker-compose.yml up --build

# Access at https://localhost:8444 (accept self-signed cert warning)
```

### Backend (Django/Python)
```bash
# Tests (with performance optimization)
docker-compose exec backend python manage.py test --keepdb --settings=config.settings_test

# Linting and type checking
docker-compose exec backend flake8
docker-compose exec backend python type_check.py

# Django management
docker-compose exec backend python manage.py [command]
```

### Frontend (React/TypeScript)
```bash
# Testing
docker-compose exec frontend npm test
docker-compose exec frontend npm run test:coverage
docker-compose exec frontend npm run test:watch

# Code quality
docker-compose exec frontend npm run type-check
docker-compose exec frontend npm run lint

# Build
docker-compose exec frontend npm run build
```

## Architecture Overview

### Backend Structure (`backend/`)
- **Framework**: Django 5.2 + Django REST Framework
- **Apps**: `backend/apps/` (core, user, movie, user_movie_data)
- **Authentication**: JWT in HTTP-only cookies via custom `JWTCookieAuthentication`
- **API Docs**: `/api/docs/` (drf-spectacular)
- **Key Libraries**: django-cors-headers, django-debug-toolbar, tmdbsimple

### Frontend Structure (`frontend/`)
- **Framework**: React 19 + TypeScript 5.x + Vite
- **UI**: Chakra UI v3 with comprehensive theming
- **Routing**: React Router DOM v7
- **State**: React Context API + custom hooks (`useApiRequest`)
- **Testing**: Vitest + React Testing Library
- **Architecture**: Service layer (`src/services/`) with axios

### Key Directories
```
├── backend/apps/           # Django apps (core, user, movie, user_movie_data)
├── frontend/src/
│   ├── pages/             # Route components
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API interaction layer
│   └── contexts/          # Global state providers
├── shared/                # Shared TypeScript types (api-types.ts, error-codes.ts)
├── infrastructure/        # Docker configuration
├── _docs/                 # Systematic development documentation
│   ├── ai-instructions/   # AI tool configurations
│   ├── workflows/         # 3-step development process
│   ├── sub-prds/          # Generated feature specifications
│   └── tasks/             # Generated implementation task lists
```

## Critical Development Rules

**⚠️ See `_docs/DEVELOPMENT-RULES.md` for complete, authoritative rules. Key points:**

### Quality Gates (Zero Tolerance)
1. **All tests pass**: Backend + frontend test suites - NO EXCEPTIONS
2. **Zero linting violations**: flake8 (backend), ESLint + TypeScript (frontend) - ALL MUST PASS
3. **Manual commit initiation**: AI NEVER initiates commits without explicit approval
4. **AI can execute commits**: When user explicitly instructs to proceed with commits
5. **Standardized reporting**: Use readiness report format from DEVELOPMENT-RULES.md

### Task Management Protocol
- **Feature branch workflow** - all feature work happens on dedicated branches
- **ONE sub-task at a time** - never bundle multiple deliverables
- **Branch verification** - always verify correct branch before committing
- **Immediate documentation** - mark `[x]` in task files after completion
- **User approval required** - pause after each sub-task for permission
- **PROJECT-STATUS checks** - after each parent task completion

### Quality Gate Failure Protocol
- **Report failures immediately** with specific details and suspected causes
- **Ask for guidance** on whether to fix or defer
- **Never proceed** to next sub-task until resolved or user approves

## Shared Type System

The `shared/` directory ensures type safety between frontend and backend:
- `api-types.ts`: API request/response interfaces
- `error-codes.ts`: Synchronized error constants

**Always update shared types when making API changes.**

## Environment Setup

1. Docker + Docker Compose required
2. Copy `backend/config/.env.example` → `backend/config/.env`
3. Configure: `TMDB_API_KEY`, `DJANGO_SECRET_KEY`, database credentials

## Testing Philosophy

**Modified Test-Driven Development (TDD)**:
- **Test-first**: New models, API endpoints, complex business logic
- **Test-after**: Simple CRUD operations, UI components, configuration
- **Always required**: All features need appropriate test coverage
- **Integration focus**: Test workflows, not just individual components

## CI/CD Pipeline

GitHub Actions (`.github/workflows/checks.yml`) on every push/PR:
- Backend: tests + flake8 linting + hybrid type checking (Pyright + MyPy)
- Frontend: tests + ESLint + TypeScript checking + build verification

**All checks must pass before merging.**

---

## Workflow Integration Summary

This is a **showcase project** demonstrating systematic AI-assisted development while maintaining professional standards. The workflow emphasizes:

- **Human oversight** at every stage with explicit approval gates
- **Quality assurance** through comprehensive testing and linting
- **Documentation standards** for maintainability and employer showcase
- **Incremental development** with atomic commits and clear progress tracking

**Remember**: The AI workflow augments, never replaces, core development skills. Each step requires developer review and understanding.