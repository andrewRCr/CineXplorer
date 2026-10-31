# Technical: Parallel Sessions and Check Placement

**PRD:** none — scope in the Stage 1 assessment's T0/T1 sections and guardrails, the resume plan, and an inbox entry
(all kept outside the repository)
**Created:** 2026-10-31
**Branch:** `technical/parallel-sessions`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Let more than one session work on CineXplorer at once, safely and cheaply. A session in a linked worktree
works on its own checkout and, when it needs backend tests, its own test-only backend stack beside the primary's full
stack. Checks run at the moment their failure must be fixed, so the extra sessions don't multiply full-suite runs.

Three facts drive the work:

- Every checkout shares one Compose project. Its name defaults to the compose file's folder, `infrastructure`, so a
  worktree's documented `docker compose ... exec backend pytest` runs in the primary's container on the primary's code
- A linked worktree has none of the gitignored setup: no `.claude/` or `.codex/` (so no recovery hook), no `.env`
  files, no `node_modules`, no `.venv-backend`
- Backend tests run `-n auto`: 24 xdist workers on this host, each with its own test database

## Scope

### Will Do

- **Worktree sessions (T0):** each worktree sets its own Compose project name, `cinexplorer-{worktree}`, in its
  gitignored `infrastructure/.env`; the primary keeps `infrastructure`, so its volumes and dev data stay put.
  Provisioning is by hand and documented: worktree under `~/dev/scratch/cinexplorer-worktrees/`, `.env` files copied,
  `.venv-backend`, `.claude/` and `.codex/` linked to the primary's (the tracked `.gitignore` ignores the links),
  `npm ci` and Chakra typegen in `frontend/`. Frontend checks, ruff, pyright and markdown lint run on the host;
  `npm run generate-types` exports the schema from the checkout's own backend container, so a worktree's API types
  come from its own code
- **Test-only backend stack (T1):** an override file starts `dev-db`, `redis` and `backend` only, publishes no ports,
  keeps the backend idle the way CI's override does, drops the certificate mounts, and sets memory limits. One test
  run at a time beside the primary; the stack comes down when its worktree goes idle
- **Worker cap:** backend test runs use a capped number of xdist workers everywhere, chosen by measurement
- **Checks placed by deadline:** each check sits at the earliest event before which its failure must be resolved, so
  the legacy tiers give way to moments. Per task: changed-file checks and related tests (backend: `pytest apps/{app}/`
  for the touched apps, in the checkout's own stack; frontend: `npx vitest related --run <files>`). Parent task,
  phase and session end: nothing extra, and the task loop's and the handoff's reports name the broader checks not yet
  run. Commit: the pre-commit hook and the task's checks. Pull request: CI is the broad check. Verification: one local
  full run, then CI. Merge: `ci-ok`. The rules, strategies, task loop, QUICK-REFERENCE, completion workflow and
  task-list templates follow
- Session start and QUICK-REFERENCE count the containers of this checkout's own project

### Won't Do

- A second browser-reachable stack (T2: Caddy, origins and OAuth per worktree): Stage 3, with environment-driven hosts
- A provisioning script, and registering CineXplorer with arc-offload (waits on the measurement the Owner's
  2026-10-30 decision requires)
- E2E tooling (still backlog); the migration's own check declarations
- Harness hygiene of the linked `.claude/` and `.codex/` contents (a held errand)

## Tasks

### **Phase 1:** A worktree session works on its own checkout

- [x] **1.1 Per-worktree Compose project name**
    - Create the scratch worktree on a throwaway branch cut from this one (`git worktree add -b scratch/t0-check
      ~/dev/scratch/cinexplorer-worktrees/t0-check technical/parallel-sessions`), kept until verification. It takes
      this branch's later commits only by `git merge --ff-only technical/parallel-sessions`, run inside it
    - Copy the primary's `backend/config/.env` (the compose file's required `env_file`), then confirm the fault:
      `docker compose -f infrastructure/docker-compose.yml config` reports `name: infrastructure`
    - Copy the primary's `infrastructure/.env` (`USER_UID`, `USER_GID`) and add
      `COMPOSE_PROJECT_NAME=cinexplorer-t0-check`; the same command now reports `name: cinexplorer-t0-check`, and the
      primary's still reports `infrastructure`
    - If Compose does not read the name from that file, stop: the fallback is an exported variable, which changes
      every documented command, so it returns to the Owner

- [x] **1.2 Write `supplemental/worktree-sessions.md`, the worktree part**
    - When to use one (planning, review, documentation, CI and configuration errands, frontend work, backend work
      tested in its own test stack) and what stays on the primary (the browser stack on 8444, OAuth)
    - Provisioning by hand, in order: `git worktree add -b {type}/{name} ~/dev/scratch/cinexplorer-worktrees/{name}
      origin/main`; copy `backend/config/.env`, `frontend/.env`, `frontend/.env.development` and `infrastructure/.env`,
      then set `COMPOSE_PROJECT_NAME=cinexplorer-{name}`; link `.venv-backend`, `.claude` and `.codex` to the
      primary's; `npm ci` and `npm run typegen` in `frontend/`; on the worktree's first Codex session, trust its path
      and approve its project hooks if Codex asks. `infrastructure/.env` is never copied without renaming the project
    - The tracked `.gitignore` entries `.claude/`, `.codex/` and `.venv-backend/` lose their trailing slash: a slash
      matches directories only, and git does not treat a link as one, so the links would show as untracked
    - What runs where: frontend tests, lint and type-check on host Node; ruff from the linked venv; pyright and
      markdown lint at CI's pins (`npx --yes pyright@1.1.414`, `npx --yes markdownlint-cli2@0.24.0`); backend tests
      and API type generation only through the worktree's own test stack (Phase 2)
    - Removal runs from the primary checkout, never from a session standing in the worktree, after the pull request
      merges and before the branch is deleted (git refuses to delete a branch a worktree has checked out); a worktree
      session hands off and ends first. A worktree whose `infrastructure/.env` names a project takes its test stack
      down through its own files by absolute path (`docker compose -f {path}/infrastructure/docker-compose.yml -f
      {path}/infrastructure/docker-compose.test-stack.yml`): `config` reports `name: cinexplorer-{name}`, then
      `down -v`; one without that file never had a stack and skips this. Then `git worktree remove {path}`, the
      caller's branch deletion (`archive-completed.md` § 9 for a work unit, `run-errand.md` § 6's `git branch -d`
      for an errand) and `git fetch --prune`. When `git worktree remove` refuses, inspect what it protects; never
      `--force`. Removal deletes the checkout's gitignored files, a work unit's session notes and review records
      among them, which `archive-completed.md` § 10 deletes anyway; the merged Review Log is the durable record, and
      the inbox and working memory stay in the main checkout (`user-inbox.md`)

- [x] **1.3 Point the existing guidance at worktree sessions**
    - `QUICK-REFERENCE.md`: frontend lint and type-check (lines 149-170) and the frontend test command (line 257) gain
      their host commands beside the Docker ones; `docker ps | grep infrastructure` (lines 281 and 421) becomes the
      project-scoped `docker compose -f infrastructure/docker-compose.yml ps`, and the container counts at lines 32
      and 421 depend on the checkout (five on the primary, three for a test stack); line 74's "Redis runs internally
      (no exposed port needed)" is corrected, since the primary publishes 6379; a pointer to `worktree-sessions.md`
    - `DEVELOPMENT-RULES.md` lines 55-56, 62-63 and 65-66, and `TECHNICAL-OVERVIEW.md` line 164: frontend tests, lint
      and type-check run on host Node or in the primary's frontend container
    - `session-init.md` step 5: the Docker line counts `docker compose -f infrastructure/docker-compose.yml ps -q`
      against this checkout's expectation (five on the primary, three with a test stack up, none without) at line 74
      and in the example at line 67, and "start the stack" means the full stack on the primary and the test stack in a
      worktree; on the primary, a line names any linked worktree whose branch's pull request has merged
      (`gh pr list --state merged --head {branch}`), as ready to remove
    - `run-errand.md` § Where It Runs: an errand whose checks need Docker can run in a worktree with its own test stack,
      not only in place on the main checkout; § 6 sends the worktree case to `worktree-sessions.md`'s Removal
    - `strategy-work-organization.md`'s errand example (lines 936-941): the worktree under
      `~/dev/scratch/cinexplorer-worktrees/`, removed by `worktree-sessions.md`'s Removal
    - `archive-completed.md` § 9: a work unit run in a worktree removes it first (`worktree-sessions.md`, Removal)
    - Markdown lint and the local link checker (`.arc/user/{identity}/parallel-sessions/linkcheck.py`, every relative
      link and anchor outside the archive) on every touched file

- [x] **1.4 Check a provisioned worktree**
    - With Tasks 1.2 and 1.3 committed, fast-forward `t0-check` to this branch, then provision it by
      `worktree-sessions.md` exactly from the step after `git worktree add` through `npm run typegen` (the Codex step
      belongs to Task 4.1), fixing the document where a step fails; with the links in place,
      `git check-ignore -v .claude .codex .venv-backend` matches all three and `git status --short` is empty
    - Host checks pass there: `npm test`, `npm run lint`, and `npm run type-check` after typegen in `frontend/`; ruff
      and pyright at the CI pin from the root
    - With throwaway notes at the worktree's `.arc/user/{identity}/t0-check/SESSION-NOTES.md`, the recovery hook, run as
      `.claude/settings.json` runs it with `CLAUDE_PROJECT_DIR` set to the worktree, names those notes and the main
      checkout's working memory and inbox
    - `docker compose -f infrastructure/docker-compose.yml ps` from the worktree lists nothing of the primary's

### **Phase 2:** A worktree runs backend tests in its own stack

- [x] **2.1 Cap the backend test workers** (no backend test runs before this lands)
    - `backend/pyproject.toml` addopts (line 97) keep `-n auto` and gain `--maxprocesses`, starting at 4; CI's
      runners have 4 cores, so CI is unchanged
    - First capped run on the primary, with `docker stats` sampled throughout: record wall time and the peak memory of
      `backend` and `dev-db`; repeat with `--maxprocesses 8` (the cap also limits an explicit `-n`, and the later
      option wins) and keep the value that buys real time for its memory; one run with `--cov=apps`, as CI runs it,
      gives Task 2.4 the coverage case
    - Drop the primary's per-worker test databases above the cap (`test_cinexplorer_dev_gw{cap}` through `gw23`), which
      `--reuse-db` would otherwise keep
    - QUICK-REFERENCE's backend test lines (125-146) state the cap
    - Measured 2026-10-31 on the primary, 802 tests, `docker stats` every 2-3 seconds, local ARC slot idle: 4 workers
      33 s, peaks backend 614 MiB and `dev-db` 70 MiB; 8 workers 26 s, 989 MiB and 92 MiB; 4 workers with
      `--cov=apps` 34 s, 661 MiB and 84 MiB (91.11% coverage). Kept 4: 8 saves 7 s for 60% more backend memory and
      twice the CPU. WSL MemAvailable stayed above 8.6 GB. `gw4` to `gw23` dropped; dev data unchanged (28 tables,
      47 users)

- [x] **2.2 Write the test-stack override, `infrastructure/docker-compose.test-stack.yml`**
    - `backend`, `dev-db`, `redis`: `ports: !reset []` and a `mem_limit` sized from 2.1's peaks with headroom (one
      spelling throughout: Compose rejects a `mem_limit` that differs from a `deploy` limit)
    - Top level: `name: ${COMPOSE_PROJECT_NAME:?set COMPOSE_PROJECT_NAME in infrastructure/.env}`, so every command
      that names the override, `down -v` included, refuses in a checkout that has not named its project and never
      reaches the primary's `infrastructure` volumes
    - `backend`: `command: tail -f /dev/null` and the healthcheck disabled (as `docker-compose.ci.yml` does), and
      `volumes: !override` keeping only the two `../backend` mounts, so no certificate files are needed
    - Started by naming only `dev-db redis backend` on `up`; Caddy and the frontend never start in a test stack
    - A header comment says what the file is for and how it is started

- [x] **2.3 Write `worktree-sessions.md` § Test stack, with one route for API types**
    - Up, test (`exec -T backend nice -n 15 pytest apps/`), down, every command naming both compose files; one test
      run at a time across all stacks, the primary's included; down when the worktree goes idle, `down -v` by
      Removal
    - Related backend tests while working: `pytest apps/{app}/` for the touched apps
    - API types, one route in every checkout: `npm run generate-types` (`frontend/package.json` line 23), run on the
      host in `frontend/`, exports the schema from this checkout's own backend container
      (`docker compose -f ../infrastructure/docker-compose.yml exec -T backend python manage.py export_openapi_schema >
      openapi.json`, CI's export) into a `mktemp` file outside the checkout, copied over `openapi.json` only when the
      export succeeds and removed either way, then runs `generate-types:local`. On the primary that is the full
      stack's backend; in a worktree, the test stack's, since its `.env` names the project. The command names only
      the base file, so the override's guard does not cover it; § Test stack says it relies on that name, which
      provisioning confirms with `config`
    - The fetch route goes: the `fetch-schema` script, `frontend/scripts/fetch-openapi.js`, and the frontend service's
      `OPENAPI_SCHEMA_URL` and `DEV_SKIP_TLS` (`docker-compose.yml` lines 60-63). The primary runs the new command once
      and commits `openapi.json` in the export's format, with `src/types/api.ts` unchanged. QUICK-REFERENCE line 200
      and `archive-completed.md` line 87 drop the `DEV_SKIP_TLS` prefix; `agent/AGENTS.md` line 42 and the drift
      message at `ci.yml` line 368 stand as written
    - The first `up` builds the backend image for that project from the shared layer cache; rebuild after backend
      requirements change
    - Built 2026-10-31: the script captures the export in memory and writes `openapi.json` only after it parses, so
      no temporary file exists at all; the export runs with `DJANGO_CONSOLE_LOG_LEVEL=WARNING`, because the primary's
      DEBUG console logging put an import-time line from `cinexplorer.auth` on stdout. On the primary, `openapi.json`
      moved to the indented format with identical schema content, and `api.ts` regenerated unchanged

- [ ] **2.4 Decide the primary stack's memory limits** (Owner decision, from 2.1's measurements)
    - Present the measured peaks and a recommendation: limits on the primary's `backend` and `dev-db` too, or none.
      Limits in `docker-compose.yml` also bind CI's runs (merged at ci.yml lines 79 and 244, the backend with `--cov`)
      and the production override; the recommendation says so. Apply what the Owner picks, as `mem_limit`
    - `QUICK-REFERENCE.md` lines 247-250 ("the Compose file sets no memory limits") state the limits that now exist

- [ ] **2.5 Check two stacks side by side**
    - With Phase 2 committed, fast-forward `t0-check` to this branch; in the primary, `config` with both compose files
      refuses (the guard)
    - With the primary stack up, start `t0-check`'s test stack: `ps` shows no published ports, `docker inspect` shows a
      memory limit on each of its containers, and `pytest apps/` passes there with the capped workers
    - `npm run generate-types` runs once there and leaves `frontend/openapi.json` and `frontend/src/types/api.ts`
      unchanged
    - The primary's dev database counts (tables, users) and its five containers are unchanged after the run
    - Take the test stack down with `down -v`, both compose files named

### **Phase 3:** Checks run when their failure must be fixed

- [ ] **3.1 Re-place the gates in `DEVELOPMENT-RULES.md`**
    - § Quality Gates (lines 33-47): "Tiered Approach" and the tier table become a table of moments (task, commit,
      parent task and phase, session end, pull request, verification, merge), each with what runs, the per-task
      related tests as the Scope defines them; "at least Tier 1 before committing" and "Full Suite (Tier 3) -
      Required for phase completion and pre-PR" follow
    - § Testing Requirements (line 330): "All tests must pass before any commit discussion" is withdrawn in favour of
      the task's checks

- [ ] **3.2 Rewrite `strategies/arc/strategy-quality-gates.md` around moments**
    - Core philosophy, quoting the source: "Assign each check to the earliest event before which its failure must be
      resolved" (arc-framework's `strategy-quality-gates.md` § Place checks by deadline); CI on the pull request
      carries the broad suites
    - The tier sections become the moments; § Task List Integration drops the per-parent gate and the final "Testing &
      Quality Gates" phase, since the final phase is verification; § When to Escalate becomes judgment when the
      affected surface grows, reported as checks not yet run; § Anti-Patterns and the E2E guidance follow

- [ ] **3.3 The task loop and deferred review**
    - `3_process-task-loop.md` lines 38-40 (per task, "the tiered approach") name the task checks; lines 82 and 94
      (parent completion) drop the Tier 2 run and its checklist line, and the parent-completion report names the
      broader checks not yet run; lines 132-133 (deferred review, "gates passing") name the task checks
    - `session-handoff.md` § 5 Report names the broader checks not yet run

- [ ] **3.4 QUICK-REFERENCE and the type-safety strategy**
    - `QUICK-REFERENCE.md` § Quality Gate Commands (line 245, "Run these before any commit"): the full command set is
      the verification run
    - `strategies/project/strategy-type-safety.md` § Pre-Commit Quality Gate (line 521) becomes the verification
      run's type check; its "Fast - specific files" example (line 531) uses a directory, matching DEVELOPMENT-RULES'
      "NOT individual files"

- [ ] **3.5 Workflows and task-list templates**
    - `archive-completed.md` line 46: the verification run, then CI on the pull request
    - `atomic-commit.md` lines 26-28 and `run-errand.md` line 42: the task checks, not "Tier 1"
    - `2_generate-tasks.md` lines 141 and 153-156 and its template's "Run quality gates" subtask, and
      `strategy-task-list-formatting.md`'s quality-gate examples (around lines 387, 781, 823 and 952-956): no
      full-suite checkpoint tasks; checks are named only where a task needs one beyond the task checks
    - `STRATEGY-INDEX.md` line 30 ("Tiered quality gate system") and `strategy-testing-methodology.md` lines 333-336
      ("Full quality gates") name the moments

- [ ] **3.6 Check the re-placement**
    - Read every hit of `git grep -n -i -E '\btier(ed)?\b|quality gates?|full (test )?suite|before any commit' --
      .arc/reference AGENTS.md ':!.arc/reference/archive'`: none asks for a check tier, or for the full suite before a
      commit or at a parent task, phase or session end. Hits about something else are listed as such: the backlog
      tiers (ADR-014, work organization), the token and border tiers (ADR-010, component styling), the data-quality
      thresholds, the archival documents' tiers (`maintain-task-notes.md`), the testing strategy's test-helper tiers,
      the review methods' disposition tiers, `testing-standards.md`'s generic "tier that runs the real thing", and
      `DEVELOPMENT-RULES.md` line 20 (commit analysis, not checks). The hits and their reading go in this task's note
    - The same search over the whole repository, the archive aside, finds no instruction elsewhere: today its other
      hits are the backlog, the README's product description, CI job names, code and this task list
    - Backlog task lists and PRDs (`.arc/backlog/`) are left as they are and re-planned when picked up
    - Markdown lint and the local link checker clean

### **Phase 4:** Verification

- [ ] **4.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)
    - The live criteria use the `t0-check` worktree, fast-forwarded to this branch, and a test stack beside the
      primary; criterion 4 needs the Owner to start a Claude Code session and a Codex session in that worktree and
      compact each. Codex first runs once in the primary as the baseline (project hooks approved, recovery context
      shown after a compaction); the worktree's session records whether Codex asks to trust its path or approve its
      hooks
    - Afterwards `t0-check` comes down by `worktree-sessions.md`'s Removal as written, which runs that section once,
      and its `scratch/t0-check` branch is deleted

## Implementation Notes

- Owner rule (2026-10-31): no backend test runs, local or in a test stack, until Task 2.1's cap lands
- Compose reads `COMPOSE_PROJECT_NAME` from the `.env` beside the first compose file, `infrastructure/.env`, which
  already supplies `USER_UID` and `USER_GID` (gitignored; Task 1.1 confirms the read). The migration's
  `worktree.post_create` will write the same variable with the same scheme, so that file never goes in a copy list
- The primary keeps project name `infrastructure`: its dev data is in the `infrastructure_dev-db-data` volume. Its
  `dev-db` and `redis` were recreated from the primary checkout on 2026-10-31, after an arc-install-kit sandbox copy
  sharing the project name had created them
- Tests reach `dev-db` and `redis` by service name (`settings_test.py` lines 52 and 64; `REDIS_URL` defaults to
  `redis://redis:6379/0` in `settings.py`), which resolves inside each project's own network
- `-n auto` gives 24 workers here and `--reuse-db` keeps a test database per worker (`test_cinexplorer_dev_gw0` to
  `gw23` exist today); `--maxprocesses` limits any non-zero `-n`, `auto` included, and leaves `-n 0` alone
  (`xdist/plugin.py` lines 318-323)
- `t0-check` sees this branch's work only through committed fast-forwards; uncommitted changes in the primary never
  reach it, and a test stack mounts the `backend/` of the checkout whose compose files it is started from
- The CI override (`infrastructure/docker-compose.ci.yml`) is the pattern for an idle backend; `!reset` and
  `!override` need Compose 2.24 or later (this host: 5.6.0). The backend's certificate mounts create directories
  when the files are missing, which is why the test stack drops them
- `.claude/settings.json` runs the recovery hook from `$CLAUDE_PROJECT_DIR`, and `.codex/hooks.json` from
  `git rev-parse --show-toplevel`, so a linked worktree runs its own tracked hook copy
- Whether Claude Code loads a linked `.claude/`, and Codex a linked `.codex/`, needs live sessions; verification asks
  the Owner to start one of each in the worktree, and copying the folder is the fallback for either
- Codex records trust and hook approvals by path in `~/.codex/config.toml`: today the primary's path is trusted and
  no approval exists for CineXplorer's `.codex/hooks.json`. Upstream reportedly resolves a linked worktree to its main
  repository for trust; Task 4.1 records what codex-cli 0.166.0 does here. Copying `.codex/` is the fallback only when
  the linked folder fails with trust and approval in place
- Probed 2026-10-31 in scratch projects (Compose 5.6.0): a `${VAR:?message}` project name in the override makes
  `config` and `down -v` refuse while the variable is unset; a checkout's compose files named by absolute path from
  another checkout read that checkout's `.env`, so the project name resolves to its own
- The committed `frontend/openapi.json` is the raw API response the fetch script saved (one line, escaped unicode),
  while the export writes indented JSON. CI exports, compares only `src/types/api.ts`, and passes on `main`, so the
  export yields the committed types
- The link checker is the local script from the earlier process ports, kept in this work unit's personal folder
- Removal follows arc-framework's teardown order (`integrate-work-unit.md` Step 11, `strategy-concurrent-work.md`):
  physical removal after merge, from outside the worktree, refusing rather than forcing. Its detached husk, markers
  and notes-preservation guard are left out: removal runs from the primary after the worktree's session ends, and no
  shared state lives in the worktree
- Sources: the Stage 1 assessment (§ Revision, the T0, T1 and T2 tiers; § project-manager.ARC guardrails, T1 stacks),
  the gate survey of 2026-10-31, and arc-framework's `strategy-quality-gates.md` and `DEV-RULES.PROJECT.md`

## Success Criteria

- [ ] In a worktree provisioned by `worktree-sessions.md`, `docker compose -f infrastructure/docker-compose.yml config`
  reports `name: cinexplorer-{worktree}` and `ps` lists only that project's containers, while the primary reports
  `infrastructure`; with the links in place, `git status --short` in the worktree is empty
- [ ] With the primary stack up, the worktree's test stack runs `pytest apps/` to a pass, publishes no ports, and
  leaves the primary's dev database (table and user counts) and containers unchanged; `npm run generate-types` in
  the worktree leaves `frontend/openapi.json` and `frontend/src/types/api.ts` unchanged
- [ ] `docker inspect` reports a memory limit on each test-stack container, and a fresh backend run creates no more
  per-worker test databases than the cap
- [ ] A Claude Code session and a Codex session started in the worktree each load the linked settings, and each one's
  recovery context after a compaction names the worktree's own session notes
- [ ] In the worktree, host-side frontend tests, lint and type-check (after typegen), ruff and pyright pass
- [ ] No tracked instruction outside the archive, the ADRs and the backlog runs the full suite before a commit or at
  a parent task, phase or session end, and `DEVELOPMENT-RULES.md` names what runs at each moment

## Review Log

- **2026-10-31 · Task-list review · Pass 1** · fresh read-only subagent (`pragmatic-code-reviewer`) · rubric:
  `task-audit` at full depth (grounding and executability) and `source-grounding`, over the scope sources, the
  Owner's scope decisions and the task list · 5 major, 10 minor; 13 confirmed against source, 2 plausible · all 15
  approved as fixes: F2 the tracked `.gitignore` ignores the links (no trailing slash), F5 API types come from the
  worktree's own test stack by CI's route, F15 related tests defined (backend `pytest apps/{app}/`, frontend
  `vitest related`), `new-design`; `local-correction`: F1 `t0-check` is cut from this branch and fast-forwarded
  before each live check, F3 a live Codex session check, F4 and F11 the frontend-via-Docker rules and stale counts
  and limits, F6 the backend `.env` before the first `compose config`, F7 `--maxprocesses` for the 8-worker run, F8
  one `mem_limit` spelling and its reach into CI and production, F9 and F10 the missed gate sites and a search that
  can pass, F12 "earliest event" quoted, F13 the link checker named, F14 removal only after archive · about 15
  minutes · stop: fixes landed, fix check approved
- **2026-10-31 · Task-list review · Fix check, round 1 since pass 1** · fresh read-only subagent
  (`pragmatic-code-reviewer`), scoped to the repairs (`tasks-pass1.md` to `tasks-fixcheck1.md`) · the F1-F4, F6-F13
  and F15 repairs close their findings · 2 major, 5 minor, all confirmed against source (F2 and F5 by probe) · all
  approved: F4 a primary Codex baseline and per-path trust before the worktree check, F5 a project-name guard in the
  test-stack override, `new-design`; `local-correction`: F1 the three `generate-types` sites name the worktree route
  and 2.5 runs it once, F2 removal after merge and before the branch deletion (git refuses to delete a branch a
  worktree holds), F3 session start's counts per checkout, F6 Task 1.4's fast-forward waits for 1.2 and 1.3, F7 the
  task list among 3.6's expected hits · about 18 minutes · stop: fixes landed, round 2 offered; the Owner then
  approved removal following arc-framework's teardown order (from the primary after the worktree's session ends,
  `git fetch --prune`, never `--force`) and a session-start line for merged worktrees, both folded before round 2
- **2026-10-31 · Task-list review · Fix check, round 2 since pass 1** · fresh read-only subagent
  (`pragmatic-code-reviewer`), scoped to the repairs (`tasks-fixcheck1.md` to `tasks-fixcheck2.md`) · round-1 fixes
  2, 3, 6 and 7 close, 4 and 5 with follow-ups · 2 major, 6 minor, all confirmed against source (F2 by probe) · all
  approved: F1 one route for API types in every checkout (`generate-types` exports from the checkout's own backend,
  the fetch route goes, `openapi.json` moves once to the export's format), `new-design`; `local-correction`: F2 the
  removal's `down -v` goes through the worktree's own files by absolute path after `config`, F3 the guard's refusal
  checked in the primary, F4 "merged" means a merged pull request, F5 the Codex trust step conditional and observed,
  F6 Task 1.4 stops before the Codex step, F7 run-errand § 6 and the work-organization example follow Removal, F8
  closed by F1 · about 15 minutes · stop: fixes landed, round 3 approved
- **2026-10-31 · Task-list review · Fix check, round 3 since pass 1** · fresh read-only subagent
  (`pragmatic-code-reviewer`), scoped to the repairs (`tasks-fixcheck2.md` to `tasks-fixcheck3.md`) · round-2 fixes
  F1-F8 close at source; the author's grounding corrections (the temporary file, two line ranges) were in scope · 3
  minor, all confirmed against source · all approved, `local-correction`: F1 the guard's claim narrowed to commands
  naming the override, and `generate-types` documented as relying on the `.env`'s project name; F2 Removal fits
  errand worktrees (the caller's branch deletion; the stack step only where a project is named); F3 the temporary
  file from `mktemp`, outside the checkout, removed either way · about 17 minutes · stop: converged on minor-only
  repairs; the Owner closed the loop
