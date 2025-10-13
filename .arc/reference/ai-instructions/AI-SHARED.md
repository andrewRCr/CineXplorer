# CineXplorer – Shared AI Context

**Version:** 2025-10-13 | **Maintained by:** Andrew | **Source of truth:** `.arc/reference/`

This file gives every AI assistant the minimum shared context that doesn't change often. All day‑to‑day rules, commands, and workflows live in the canonical documents linked below; always defer to them if there is any conflict.

## Canonical References (Read Every Session)

- **Development rules:** [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) v2.6 - Non-negotiable standards and quality gates
- **Environment & commands:** [QUICK-REFERENCE](../QUICK-REFERENCE.md) v1.0 - Path context and command patterns (repo root perspective)
- **Current work context:** `.arc/active/CURRENT-SESSION.md` - Session startup protocol, work status, dynamic paths
- **Core workflows:** [Workflows index](../workflows/) → [0-define-constitution](../workflows/0-define-constitution.md), [1-create-prd](../workflows/1-create-sub-prd.md), [2-generate-tasks](../workflows/2-generate-tasks.md), [3-process-task-loop](../workflows/3-process-task-loop.md)
- **Supporting workflows:** [Supplemental workflows](../workflows/supplemental/) → [atomic-commit](../workflows/supplemental/atomic-commit.md), [session-handoff](../workflows/supplemental/session-handoff.md), [manage-incidental-work](../workflows/supplemental/manage-incidental-work.md)
- **Architecture & patterns:** [TECHNICAL-ARCHITECTURE](../constitution/TECHNICAL-ARCHITECTURE.md)
- **Product vision & status:** [META-PRD](../constitution/META-PRD.md), [PROJECT-STATUS](../constitution/PROJECT-STATUS.md)

## Project Snapshot

- **Stack:** Django 5.2 + Django Ninja backend; React 19 + TypeScript frontend; Docker Compose + Caddy; shared API types in `shared/`
- **Purpose:** Solo full-stack showcase demonstrating disciplined process, testing, and documentation
- **Data source:** TMDB API (personal watchlists, discovery flows)
- **Repository layout:**
    - `backend/` Django apps (`core`, `movie`, `user`, `user_movie_data`) + `config/`
    - `frontend/` Vite/React code in `src/`
    - `shared/` synced types (`api_types.py` ⇄ `api-types.ts`)
    - `.arc/` documentation (constitution, strategies, workflows, active/upcoming tasks)
    - `infrastructure/` Docker Compose + Caddy reverse proxy
    - `.venv-backend/` Backend Python virtual environment (at repo root)

## How to Work in This Repo

1. **Execute Session Startup Protocol** (in CURRENT-SESSION.md): Verify working directory, Docker status, venv availability, path context
2. **Load work context** (CURRENT-SESSION.md): Branch, active tasks, last completed, next actions
3. **Follow task workflow** ([3-process-task-loop](../workflows/3-process-task-loop.md)): One subtask at a time, quality gates per DEVELOPMENT-RULES
4. **Keep docs authoritative**: Update task lists, PROJECT-STATUS, and strategies as required by workflows
5. **Never self-initiate commits**: Use [Atomic Commit Workflow](../workflows/supplemental/atomic-commit.md) only when user approves

## Critical Path Information

**Common Friction Points** (see QUICK-REFERENCE for details):

- **Docker Compose location**: `infrastructure/docker-compose.yml` (from repo root)
- **Backend venv**: `.venv-backend/bin/` (from repo root)
- **Tests require Docker**: NEVER run backend tests from host (no database access)
- **Working directory varies**: Check CURRENT-SESSION.md Session Startup Protocol for current context (backend/, frontend/, or root)
- **Commands in QUICK-REFERENCE**: All assume repo root - adjust paths based on current working directory

## Maintenance Notes

- When `DEVELOPMENT-RULES.md` or `TECHNICAL-ARCHITECTURE.md` change, skim this file and update only if the high-level snapshot is now inaccurate
- Agent-specific instruction files should link back here rather than duplicating content
- Commands live in QUICK-REFERENCE (not here) - reference it for path patterns
