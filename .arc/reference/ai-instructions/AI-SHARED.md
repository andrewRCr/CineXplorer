# CineXplorer – Shared AI Context

**Version:** 2025-10-09 | **Maintained by:** Andrew | **Source of truth:** `.arc/reference/`

This file gives every AI assistant the minimum shared context that doesn’t change often. All day‑to‑day rules, commands, and workflows live in the canonical documents linked below; always defer to them if there is any conflict.

## Canonical References

- **Non‑negotiable rules:** [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md)
- **Core workflows:** [Workflows index](../workflows/) → especially [Process Task Loop](../workflows/3-process-task-loop.md)
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
    - `infrastructure/` Docker + reverse proxy configuration

## How to Work in This Repo

1. **Load CURRENT-SESSION.md** (lists branch, active PRD, task list, and notes)
2. **Follow the task workflow**: one subtask at a time, quality gates per `DEVELOPMENT-RULES`
3. **Keep docs authoritative**: update task lists, PROJECT-STATUS, and strategies as required by the workflows
4. **Never self-initiate commits**: use [Atomic Commit Workflow](../workflows/atomic-commit.md) only when the user approves

## Maintenance Notes

- When `DEVELOPMENT-RULES.md` or `TECHNICAL-ARCHITECTURE.md` change, skim this file and update only if the high-level snapshot is now inaccurate
- Agent-specific instruction files should link back here rather than duplicating content
- Prefer brief reminders over command tables; authoritative commands live in `DEVELOPMENT-RULES` under “Essential Commands”
