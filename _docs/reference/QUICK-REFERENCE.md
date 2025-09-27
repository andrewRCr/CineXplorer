# Quick Reference - CineXplorer

Essential commands, shortcuts, and emergency protocols for efficient development.

## Development Commands

### Application Startup
```bash
# Full stack with Docker (recommended)
docker-compose -f infrastructure/docker-compose.yml up --build

# Access at https://localhost:8444 (accept self-signed cert warning)
```

### Quality Gate Commands (Must ALL Pass)

#### Backend
```bash
# Tests (with performance optimization)
docker-compose exec backend python manage.py test --keepdb --settings=config.settings_test

# Linting
docker-compose exec backend flake8

# Type checking (hybrid approach)
docker-compose exec backend python scripts/type_check.py
# OR for development (host-based):
npx pyright backend/apps/
# **Note:** `mypy --strict` currently fails with an upstream `django-stubs` internal error (https://github.com/typeddjango/django-stubs/issues/2461). Use Pyright as the primary guardrail and track the upstream fix before re-enabling full mypy coverage.
```

#### Frontend
```bash
# Tests
docker-compose exec frontend npm test

# Linting
docker-compose exec frontend npm run lint

# Type checking
docker-compose exec frontend npm run type-check
```

### Quick Quality Check (All at Once)
```bash
# Backend quality gates
docker-compose exec backend python manage.py test --keepdb --settings=config.settings_test && \
docker-compose exec backend flake8 && \
docker-compose exec backend python scripts/type_check.py

# Frontend quality gates
docker-compose exec frontend npm test && \
docker-compose exec frontend npm run lint && \
docker-compose exec frontend npm run type-check
```

## Emergency Protocols

### When Quality Gates Fail
1. **Stop immediately** - don't proceed to next sub-task
2. **Report specific failures** with error details
3. **Identify suspected causes** based on recent changes
4. **Ask for guidance**: Fix now, defer, or investigate further

### When Requirements Are Unclear
1. **Pause work immediately**
2. **Ask clarifying questions** with letter/number options
3. **Reference META-PRD** for product alignment
4. **Wait for explicit approval** before proceeding

### When Task Scope Expands
1. **Stop current sub-task**
2. **Document discovered requirements** as new tasks
3. **Update task list** with granular breakdown
4. **Seek user approval** for revised approach

### When Context Is Lost
1. **Re-read essential documents** (DEVELOPMENT-RULES, AI-SHARED, current task list)
2. **Confirm understanding** of current position in workflow
3. **Ask for state clarification** if uncertain
4. **Never guess** - always confirm before proceeding

## Sub-Task Granularity Check

Break down a sub-task if it requires:
- More than 3 files to be modified
- More than 50 lines of core logic changes
- Multiple interdependent changes
- Complex debugging/investigation

## File Locations

### Core Documentation
- `META-PRD.md` - Product vision and features
- `PROJECT-STATUS.md` - Current progress
- `TECHNICAL-ARCHITECTURE.md` - Technical details
- `DEVELOPMENT-RULES.md` - Non-negotiable rules

### Workflows
- `workflows/create-prd.md` - Feature planning process
- `workflows/generate-tasks.md` - Task list creation
- `workflows/process-tasks.md` - Task execution protocol
- `workflows/atomic-commit.md` - Commit organization

### AI Configuration
- `ai-instructions/AI-SHARED.md` - Complete project context
- `ai-instructions/CLAUDE.md` - Claude Code specific guidance
- `ai-instructions/WARP.md` - Warp AI specific guidance

## Environment Setup Shortcuts

### First Time Setup
```bash
# Copy environment template
cp backend/config/.env.example backend/config/.env

# Required environment variables:
# TMDB_API_KEY - From themoviedb.org
# DJANGO_SECRET_KEY - Generate secure key
# Database credentials for local development
```

### Container Management
```bash
# Rebuild containers after dependency changes
docker-compose -f infrastructure/docker-compose.yml up --build

# View logs
docker-compose -f infrastructure/docker-compose.yml logs [service]

# Shell access
docker-compose exec [backend|frontend] bash
```

## Feature Branch Management

### Branch Operations
```bash
# Create and switch to new feature branch
git checkout -b feature/[feature-name]

# Switch to existing feature branch
git checkout feature/[feature-name]

# Check current branch
git status
git branch --show-current

# List all branches
git branch -a
```

### Feature Completion
```bash
# Switch back to main
git checkout main

# Merge feature branch (preserves commit history)
git merge feature/[feature-name]

# Delete feature branch after merge
git branch -d feature/[feature-name]

# Force delete if needed
git branch -D feature/[feature-name]
```

### Branch Status Checks
```bash
# Show branch and uncommitted changes
git status

# Show recent commits on current branch
git log --oneline -10

# Compare feature branch with main
git log main..feature/[feature-name] --oneline
```

## Common File Patterns

### Django Apps Structure
```
backend/apps/
├── accounts/         # User authentication models (User, EmailVerificationToken)
├── authentication/   # Authentication processes (JWT, serializers, views, middleware)
├── core/            # Core business models (Movie) and shared utilities
├── movie/           # Movie-related functionality and API endpoints
└── user_movie_data/ # User-movie interaction models and API (UserMovieData, watchlist, ratings)
```

### Frontend Structure
```
frontend/src/
├── pages/         # Route components
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── services/      # API interaction layer
└── contexts/      # Global state providers
```

### Shared Types
```
shared/
├── api-types.ts     # API request/response interfaces
└── error-codes.ts   # Synchronized error constants
```

## Quality Standards

- **Zero tolerance**: All tests, linting, hybrid type checking must pass
- **Test coverage required**: Especially for models, APIs, complex logic
- **Shared types**: Update when making API changes
- **Atomic commits**: Follow conventional commit format with task references

## Remember

- **Manual commit initiation**: AI never initiates without approval
- **Feature branch workflow**: All feature work happens on dedicated branches
- **One sub-task at a time**: Never bundle deliverables
- **Immediate documentation**: Update task lists after each completion
- **PROJECT-STATUS checks**: After each parent task completion
- **Branch verification**: Always verify correct branch before committing