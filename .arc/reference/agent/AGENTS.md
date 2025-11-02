# CineXplorer - AI Agent Reference Card

**Version:** 2025-11-2 | **Source of truth:** `.arc/reference/`

## Project Overview

CineXplorer is a full-stack movie discovery and watchlist management application, serving as a solo showcase project
demonstrating disciplined software engineering practices, comprehensive testing, and production-quality documentation.

**Project Type**: Solo full-stack showcase
**Primary Goal**: Demonstrate professional development practices with modern technologies

## Project Snapshot

**Technology Stack:**

- **Backend**: Django 5.2 + Django Ninja (API framework), Python 3.13
- **Frontend**: React 19 + TypeScript, Vite dev server, Chakra UI v3 (component library)
- **Database**: PostgreSQL 17
- **Infrastructure**: Docker Compose + Caddy reverse proxy
- **External Services**: TMDB API (movie data), ZeptoMail (transactional emails), OAuth (Google/GitHub)

**Repository Layout:**

- `backend/` - Django apps (`core`, `movie`, `authentication`, `user_movie_data`) + `config/` settings
- `frontend/` - Vite/React code in `src/` (components, hooks, services, contexts)
- `shared/` - Type synchronization (deprecated in favor of OpenAPI generation)
- `.arc/` - Documentation (constitution, strategies, workflows, active/upcoming tasks)
- `infrastructure/` - Docker Compose configuration + Caddy reverse proxy
- `.venv-backend/` - Backend Python virtual environment (at repo root)

## Critical Path Information

**Common Friction Points:**

- **Docker Compose location**: `infrastructure/docker-compose.yml` (from repo root)
- **Backend venv**: `.venv-backend/bin/` (from repo root)
- **Tests MUST run via Docker**: NEVER run backend tests from host (require PostgreSQL + Redis connections)
- **Working directory varies**: Check CURRENT-SESSION.md Session Startup Protocol for current context
  (backend/, frontend/, or repo root)
- **Commands in QUICK-REFERENCE**: All assume repo root - adjust paths based on current working directory
- **Network architecture**: Backend HTTPS (8000), Frontend HTTP (5173), Caddy proxy (8444)
- **Type generation**: Frontend types auto-generated from Django Ninja OpenAPI schema via `npm run generate-types`

## AI Collaboration Principles

**Working Approach:**

- **Plan before executing** - Default to plan-driven execution; skip plans only for trivial tasks
- **Respect user intent** - Never revert or "fix" user changes without explicit approval
- **Stop on anomalies** - Treat unexpected filesystem diffs as a stop signal and request guidance
- **Limit scope** - Avoid global mutations or widespread changes without explicit approval
- **One subtask at a time** - Complete tasks incrementally, await approval between subtasks
- **Manual commit control** - AI NEVER initiates commits without explicit user approval or instruction
- **Respect layered architecture** - Backend: business logic belongs in Service layer (presets, filtering,
  calculations), NOT in API routes (HTTP concerns only). See DEVELOPMENT-RULES.md for details.

**Communication:**

- **Focus on value** - Prioritize findings, risks, and actionable next steps in summaries
- **Be clear and targeted** - Provide enough detail to be useful, not so much it's overwhelming

---

*This reference card is part of the ARC development framework. It provides
quick orientation and lookup guidance for AI assistants working on this project.*
