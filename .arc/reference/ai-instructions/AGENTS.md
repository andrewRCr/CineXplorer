# CineXplorer - AI Agent Reference Card

**Version:** 2025-10-19 | **Maintained by:** Andrew | **Source of truth:** `.arc/reference/`

## Project Overview

CineXplorer is a full-stack movie discovery and watchlist management application, serving as a solo showcase project
demonstrating disciplined software engineering practices, comprehensive testing, and production-quality documentation.

**Project Type**: Solo full-stack showcase
**Primary Goal**: Demonstrate professional development practices with modern technologies

## Project Snapshot

**Technology Stack:**

- **Backend**: Django 5.2 + Django Ninja (API framework), Python 3.13
- **Frontend**: React 19 + TypeScript, Vite dev server
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

## Quick Lookup Guide

When you need to find information, use these pointers (don't load everything upfront):

### "How do I...?"

**ARC Framework Processes:**

- **Set up project foundation** → `workflows/0-define-constitution.md`
- **Start a new feature** → `workflows/1-create-prd.md`
- **Break down tasks** → `workflows/2-generate-tasks.md`
- **Implement tasks** → `workflows/3-process-task-loop.md`
- **Handle maintenance work** → `workflows/supplemental/manage-incidental-work.md`
- **Hand off session** → `workflows/supplemental/session-handoff.md`
- **Clean up completed work** → `workflows/supplemental/archive-completed.md`
- **Initialize session** → `workflows/supplemental/session-init.md`

**Project Information:**

- **Run tests/linting** → `DEVELOPMENT-RULES.md` + `QUICK-REFERENCE.md` (commands section)
- **Understand the product** → `META-PRD.md`
- **See current progress** → `PROJECT-STATUS.md`
- **Learn the architecture** → `TECHNICAL-ARCHITECTURE.md`
- **Get environment context** → `QUICK-REFERENCE.md`

### "What are the rules for...?"

- **Development standards** → `DEVELOPMENT-RULES.md`
- **AI collaboration protocols** → `DEVELOPMENT-RULES.md` (AI Session sections)
- **Code quality requirements** → `TECHNICAL-ARCHITECTURE.md` + `DEVELOPMENT-RULES.md`
- **Commit format and process** → `workflows/supplemental/atomic-commit.md`
- **Task management** → `workflows/3-process-task-loop.md`

### "Where is...?"

- **Active work** → `.arc/active/` (current feature work, CURRENT-SESSION.md)
- **Upcoming work** → `.arc/upcoming/` (planned features, PRDs, notes)
- **Completed work** → `.arc/reference/archive/` (historical context, completion metadata)
- **Project rules** → `.arc/reference/constitution/` (META-PRD, DEVELOPMENT-RULES, etc.)
- **Workflows** → `.arc/reference/workflows/` (core + supplemental)
- **Patterns** → `.arc/reference/strategies/` (architectural decisions, testing methodology, type safety)

## Document Dependencies

When constitutional documents change, update related files to keep documentation in sync:

**META-PRD.md changes** → Update:

- `ai-instructions/AGENTS.md` (this file) - project overview and features
- Potentially `PROJECT-STATUS.md` - if scope or priorities change

**DEVELOPMENT-RULES.md changes** → Update:

- Version number in DEVELOPMENT-RULES.md
- All `ai-instructions/*.md` files - if protocols change
- Team communication about rule changes (if applicable)

**TECHNICAL-ARCHITECTURE.md changes** → Update:

- `ai-instructions/AGENTS.md` (this file) - technology stack and patterns
- Consider `PROJECT-STATUS.md` if architectural decisions affect roadmap

**PROJECT-STATUS.md changes** → Update:

- Consider if major status changes affect ongoing work priorities

## AI Collaboration Principles

**Working Approach:**

- **Plan before executing** - Default to plan-driven execution; skip plans only for trivial tasks
- **Respect user intent** - Never revert or "fix" user changes without explicit approval
- **Stop on anomalies** - Treat unexpected filesystem diffs as a stop signal and request guidance
- **Limit scope** - Avoid global mutations or widespread changes without explicit approval
- **One subtask at a time** - Complete tasks incrementally, await approval between subtasks
- **Manual commit control** - AI NEVER initiates commits without explicit user approval or instruction

**Communication:**

- **Focus on value** - Prioritize findings, risks, and actionable next steps in summaries
- **Be clear and targeted** - Provide enough detail to be useful, not so much it's overwhelming

## Maintenance Notes

- When `DEVELOPMENT-RULES.md` or `TECHNICAL-ARCHITECTURE.md` change, skim this file and update only if the
  high-level snapshot is now inaccurate
- Agent-specific instruction files (CLAUDE.md, WARP.md, etc.) should reference this file rather than duplicating content
- Commands and detailed workflows live in other docs - this is just a reference card
- Keep this file lean - if something is covered in CURRENT-SESSION/DEVELOPMENT-RULES/QUICK-REFERENCE, don't
  repeat it here
- Tool-specific files should be minimal: reference AGENTS.md + add tool-specific tips only

---

*This reference card is part of the ARC (Agentic, Recursive, Coordination) development framework. It provides
quick orientation and lookup guidance for AI assistants working on this project.*
