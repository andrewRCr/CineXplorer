# Completion: Parallel Sessions and Check Placement

**Completed**: 2026-10-31
**Branch**: `technical/parallel-sessions`
**Category**: Technical
**Context**: Third part of resuming CineXplorer on its in-repository process (Stage 1's T0 and T1): let more than one
session work at once, safely and cheaply, before feature work restarts

## Summary

A session can now work in a linked git worktree on its own checkout, under its own Compose project, and run backend
tests in a test-only backend stack beside the primary's full stack. Backend test runs use a capped worker count
everywhere, and each check runs at the moment its failure must be fixed, so extra sessions no longer multiply
full-suite runs.

## Key Deliverables

- `worktree-sessions.md`: provisioning by hand (a per-worktree `COMPOSE_PROJECT_NAME` in the gitignored
  `infrastructure/.env`, the `.env` files copied, `.venv-backend`, `.claude/` and `.codex/` linked to the primary's),
  the test stack, and Removal (from the primary, `config` before `down -v --rmi local`, never `--force`)
- `infrastructure/docker-compose.test-stack.yml`: `dev-db`, `redis` and an idle backend, no published ports, a memory
  limit on each, the frontend and Caddy behind a profile. Its project name refuses to resolve without
  `COMPOSE_PROJECT_NAME`, so no command naming it reaches the primary's project
- Backend test workers capped at four (`--maxprocesses 4`), chosen by measurement
- One route for API types: `npm run generate-types` exports the schema from the checkout's own backend container and
  checks it parses before writing `openapi.json`; the fetch from a running server is gone
- `.gitignore` ignores the links as well as the folders
- Checks placed by deadline: DEVELOPMENT-RULES names what runs at each moment (task, commit, parent task, phase and
  session end, pull request, verification, merge), and the quality-gates strategy is rewritten around those moments.
  The task loop, handoff, QUICK-REFERENCE's full command set, completion and errand workflows, task-list templates
  and testing strategies follow; full-suite checkpoint tasks are gone
- Session start and QUICK-REFERENCE count only the checkout's own containers

## Implementation Highlights

- Three facts set the scope: every checkout shared one Compose project, so a worktree's documented backend tests ran
  in the primary's container on the primary's code; a linked worktree gets none of the gitignored setup; and `-n auto`
  started one xdist worker per core, each with its own test database
- Measured before choosing: four workers took about a quarter longer than eight at under two-thirds of the
  backend's peak memory, and the test stack's limits leave headroom over the four-worker peak. The primary stack has
  no memory limits (Owner decision, to revisit as the suite grows)
- Removal follows arc-framework's teardown order without its CLI: from the primary after the worktree's session ends,
  refusing rather than forcing
- Codex in a linked worktree uses the primary's project trust and hook approvals, so a worktree needs no Codex step
- The live `dev-db` and `redis` had been created by an install-kit sandbox copy sharing the project name; both were
  recreated from the primary with their data intact
- Reviewed at both ends: an independent task-list review with three fix checks before execution, and at the end an
  independent verification pass, rerun after the first was set aside for separation, every finding settled with the
  Owner
- The branch also carries the previous work unit's archive move

## Related Documentation

- Tasks: `tasks-parallel-sessions.md`
- `worktree-sessions.md` and `strategy-quality-gates.md`

## Follow-Up Work

- A second browser-reachable stack per worktree (Caddy, origins and OAuth): Stage 3, with environment-driven hosts
- Registering CineXplorer with arc-offload, once the fixed-cost measurement exists; a provisioning script waits for
  the migration
- Memory limits on the primary stack, as the suite grows
- In the inbox: the held harness-hygiene errand (the project-local Claude agents, commands and allow rules)
