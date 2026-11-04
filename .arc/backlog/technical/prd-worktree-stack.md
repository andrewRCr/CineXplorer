# PRD: Browsable Stack per Worktree

**Type:** Technical
**Status:** Ready for Implementation
**Created:** 2026-11-04

---

## 1. Introduction/Overview

CineXplorer's development stack runs from the main checkout: Caddy on `https://localhost:8444` in front of the Vite
dev server and Django's development server, with Postgres and Redis beside them. Work also runs in linked git
worktrees, sibling checkouts named `{primary}.{name}`, one per branch, so several sessions can work at once. A linked
worktree has its own Compose project (`COMPOSE_PROJECT_NAME` in its gitignored `infrastructure/.env`) and can start a
test-only stack (`infrastructure/docker-compose.test-stack.yml`): Postgres, Redis and an idle backend, with no
published ports, for backend tests. It cannot serve the app in a browser:

- The base Compose file publishes 8444, 8000, 5173, 5432 and 6379, so a second full stack collides with the main
  checkout's on every port.
- The worktree's copies of the gitignored env files point the app at the main checkout: `FRONTEND_URL` in
  `backend/config/.env` and `VITE_BASE_URL` in `frontend/.env` and `frontend/.env.development` are
  `https://localhost:8444`, so a worktree's frontend would call the main checkout's API and its emails and redirects
  would link there. `settings.py`'s development defaults for `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` also
  name the main checkout's origins, though requests through Caddy are same-origin and do not depend on them.
- The development certificates (`infrastructure/dev-certs/*.pem`) are gitignored, so a new worktree has none, and
  the backend, the frontend and Caddy all mount them.
- A worktree's database is empty: nothing runs migrations, and nothing creates an account to sign in with.
- Every stack is served from the host `localhost`, and browsers scope cookies by host, not port. Email sign-in
  (`POST /api/token/`) sets a `refresh_token` cookie, a JWT signed with `DJANGO_SECRET_KEY`, and a worktree copies the
  main checkout's `backend/config/.env`, key included; the access token stays in the signing-in origin's browser
  storage. The frontend refreshes through `POST /api/auth/refresh` only when its own origin's storage holds an access
  token, so on a page of another stack signed in there earlier, the browser sends the shared cookie, and that stack
  accepts it and issues tokens for whichever of its own users has the token's user ID.

Some of the port and origin settings are already independent of the port. Django's `ALLOWED_HOSTS` entry
`localhost` matches any port. Caddy matches a site address by hostname alone, so a host port mapped to the
container's 8444 is served by the unchanged Caddyfile (checked with a container publishing 18444). Vite's host and
CORS checks accept `localhost` on any port, and its hot-reload client connects to the page's own port.
`frontend/src/config/baseUrls.ts` falls back to `window.location.origin` when `VITE_BASE_URL` is unset. The dev
certificate names `localhost` without a port.

Setting up a worktree is also a dozen manual steps today: create the branch, copy four env files, append the project
name, link three folders, check the project name, then install frontend dependencies. Removal is several more, with
an order that matters. Most of these steps are checks a script can own.

The goal is a browsable stack per worktree. Each linked worktree can serve the full app on its own port, beside the
main checkout's stack and every other worktree's, against its own code and database. One command creates and
prepares a worktree, one starts its browsable stack, and one removes it after its branch merges.

## 2. Goals

1. Any number of linked worktrees can each serve the full app in a browser at the same time as the main checkout,
   each on its own port and against its own backend and database.
2. One command creates and prepares a worktree, replacing the manual steps, and for a work unit also writes its
   starting session notes (R16). The same preparation brings an existing worktree up to date.
3. One command removes a merged worktree with its stack, volumes, images and local branch. Asked to keep the branch,
   it removes a worktree whose branch has not merged and keeps the branch. It never deletes an unmerged branch.
4. Stacks stay apart: a sign-in on one stack is never accepted as a user of another.
5. The main checkout's stack, ports, OAuth sign-in and data are unchanged.
6. The setup keeps working when worktrees are later created by a tool that copies `.worktreeinclude` files and runs
   a post-create command.

## 3. User Stories

- As the maintainer, I want to open a branch's app in my browser while another branch's session runs, so I can check
  UI work without stopping or switching the main checkout.
- As the maintainer, I want one command to create and prepare a worktree, so starting parallel work doesn't take a
  dozen manual steps.
- As the maintainer, I want a worktree's stack to come up with migrations applied and an account to sign in with, so
  I can use the app straight away.
- As the maintainer, I want removing a merged worktree to clean up its containers, volumes, images and branch, and
  removing an unmerged one to happen only when I ask to keep its branch, so nothing is left behind and nothing
  unmerged is lost.
- As an agent working in a worktree, I want to start that worktree's own browsable stack and test stack, so my checks
  and screenshots reflect my branch and not the main checkout's.

## 4. Functional Requirements

### Worktree script

- **R1. One script.** `scripts/worktree.mjs` is a Node script with no dependencies beyond Node's built-in modules, so
  it runs before `npm ci`. It runs as `node scripts/worktree.mjs <command>` from a checkout's root, with the commands
  `create`, `provision`, `browse` and `remove`; `--help` describes each. A refusal prints its reason and exits
  non-zero, and when a command the script runs (git, Docker, npm) fails, the script stops there and prints that
  command's output. The script never forces a git operation (no `--force`, `-D` or `-f`).
- **R2. Files a worktree copies.** `.worktreeinclude` at the repository root lists, in gitignore syntax, the
  gitignored files a worktree copies from the main checkout: `backend/config/.env`, `frontend/.env`,
  `frontend/.env.development` and `infrastructure/dev-certs/*.pem`. It does not list `infrastructure/.env`, which R5
  produces.
- **R3. `create {type}/{name}`.** Run from the main checkout. It refuses when:
    - it is run from a linked worktree;
    - the branch does not have the form `{type}/{name}`, where `{type}` is lowercase letters and `{name}` is lowercase
      letters, digits and hyphens starting with a letter or digit;
    - the folder `{primary}.{name}` beside the main checkout exists;
    - the branch exists locally or, after `git fetch origin`, on `origin`.

  It then runs `git worktree add --no-track -b {type}/{name} {primary}.{name} origin/main`, so the new branch has no
  upstream until its first push, and runs its own `provision` step against the new checkout. With `--existing`, it
  checks out an existing local or `origin` branch instead of creating one. It refuses when that branch is checked out
  elsewhere and, before `git worktree add`, when the branch lacks `infrastructure/docker-compose.worktree.yml`,
  saying to merge `main` into it first. When the `provision` step fails, `create` prints the recovery: run
  `node scripts/worktree.mjs provision` in the worktree, then, for `--work-unit`, the seeding script.
  With `--work-unit`, once `provision` succeeds, it runs `node .arc/reference/harness-hooks/seed-session-notes.mjs`
  in the new worktree to write the work unit's starting session notes (R16); a refusal or failure there leaves the
  worktree as provisioned, and the seeding script can be run again by hand. Without the flag, as for an errand, no
  notes are written. `--work-unit` refuses alongside `--existing`. `create` ends by printing the folder, the first
  push command (`git push -u origin {type}/{name}`) and the `browse` command.
- **R4. `provision`.** Run from a linked worktree's root; it refuses in the main checkout. It finds the main checkout
  through `git rev-parse --git-common-dir`. It works as the post-create command of a tool that creates worktrees
  itself. Steps 1 to 3 leave what is already in place, so running `provision` again only adds what is missing and
  repeats the check and the install:
    1. Copy each untracked file in the main checkout that a `.worktreeinclude` pattern matches and that the worktree's
       ignore rules ignore, unless the worktree already has it.
    2. Link `.venv-backend`, `.claude` and `.codex` to the main checkout's, where the worktree has no entry of that
       name.
    3. Write `infrastructure/.env` (R5).
    4. Check that `docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml
       config` resolves to the project name R5 writes, `cinexplorer-{name}`. Print only the name line, since the rest
       of the output carries values from the env files. Refuse when it differs.
    5. Run `npm ci` and `npm run typegen` in `frontend/`.
- **R5. The worktree's `infrastructure/.env`.** When the file is absent, `provision` copies the main checkout's. It
  then appends each of these keys the file lacks, and never changes a key already present:
    - `COMPOSE_PROJECT_NAME=cinexplorer-{name}`. `{name}` is the worktree folder's name, less a leading
      `{main checkout's folder name}.` where it has one, lowercased; the step refuses when the result is not lowercase
      letters, digits and hyphens.
    - `SITE_PORT`, the worktree's browser port (R6).
    - `WORKTREE_SECRET_KEY`, 50 random characters from `[a-z0-9]`, so Compose interpolation leaves it intact.
- **R6. Port allocation.** `SITE_PORT` is the lowest port from 8445 to 8499 that no other registered worktree's
  `infrastructure/.env` claims (`git worktree list --porcelain` names them). The step refuses when every port in the
  range is claimed. The port stays with the worktree until it is removed. A worktree folder deleted without
  `git worktree remove` claims nothing, since its `infrastructure/.env` went with it.
- **R7. `browse`.** Run from a provisioned linked worktree; it refuses in the main checkout and where
  `infrastructure/.env` lacks a key R5 writes. It starts all five services with the `browser` profile, building images
  it lacks, and waits until they run and those with health checks report healthy. It then runs
  `python manage.py migrate --noinput` and `python manage.py seed_dev_data` in the backend, and prints
  `https://localhost:{SITE_PORT}` with the dev account's sign-in (R11). Run again on a running stack, it applies only
  migrations not yet applied, leaves the dev account as it is and syncs the blacklist again. Stopping is the Compose
  command `down` with both files and `--profile browser`, which removes the project's containers in either mode and
  keeps its volumes.
- **R8. `remove {name} [--keep-branch]`.** Run from the main checkout; `{name}` names the worktree
  `{primary}.{name}`, which must be a registered worktree with a branch checked out. In order, refusing before
  anything is deleted:
    1. After `git fetch origin`, refuse unless the branch's head is an ancestor of `origin/main`. `--keep-branch`
       skips this step.
    2. Refuse when `git worktree list --porcelain` marks the worktree `locked`: a tool that locks its worktrees
       removes them its own way. Refuse when `git status --porcelain` in the worktree lists anything: uncommitted
       changes, or untracked files its ignore rules don't cover. These are what `git worktree remove` would refuse
       on; checking first keeps the stack's volumes when it would.
    3. Read `COMPOSE_PROJECT_NAME` from the worktree's `infrastructure/.env`. Refuse when it is set to anything but
       `cinexplorer-{name}`. When it is `cinexplorer-{name}`, stop and remove the containers, then remove the volumes,
       networks and images, that carry the label `com.docker.compose.project=cinexplorer-{name}`. The label finds
       them whether or not the containers still exist and whichever Compose files the checkout has, the earlier
       test-stack file included. When the file names no project, skip this step: no stack was ever started.
    4. `git worktree remove {primary}.{name}`.
    5. Unless `--keep-branch` was given, set the branch's upstream to `origin/main` and run `git branch -d`, which
       succeeds for a merged branch whatever the main checkout has checked out.
    6. `git fetch --prune`.

  `--keep-branch` serves a worktree whose branch stays: one checked out for review, or abandoned work. The branch
  keeps every commit, and step 2 has made sure no change to a tracked file and no untracked file outside the ignore
  rules is lost. `git worktree remove` deletes the worktree's gitignored files, a work unit's session notes and review
  records among them, so paused work keeps its worktree rather than being removed. Deleting an unmerged branch stays
  a manual `git branch -D`.

### Worktree stack

- **R9. One override for both modes.** `infrastructure/docker-compose.test-stack.yml` becomes
  `infrastructure/docker-compose.worktree.yml`. Its project name still refuses to resolve without
  `COMPOSE_PROJECT_NAME`, and the values below refuse to resolve without `SITE_PORT` and `WORKTREE_SECRET_KEY`:
    - `backend`: publishes no ports. It keeps the base file's command, certificate mounts and health check, so it
      serves in both modes. Environment: `FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` set to
      `https://localhost:${SITE_PORT}`, so the worktree's backend names its own origin rather than the main
      checkout's, and `DJANGO_SECRET_KEY` set to `${WORKTREE_SECRET_KEY}`. A memory limit.
    - `dev-db` and `redis`: as today: no published ports, 512 MiB and 128 MiB.
    - `frontend`: in the `browser` profile, no published ports. Environment: `VITE_BASE_URL` set to
      `https://localhost:${SITE_PORT}` and `VITE_BASE_API_URL` to that origin plus `/api`; Vite gives variables
      already in the environment priority over the `.env` files. A memory limit.
    - `caddy`: in the `browser` profile. It publishes only `127.0.0.1:${SITE_PORT}:8444`, so the stack answers on
      this machine only, and has a memory limit.

  Each limit is set from a measured peak, with headroom, as the existing limits were: the backend's during a full
  `pytest apps/` run with the server running (today's 1536 MiB was measured with an idle backend), and the frontend's
  and Caddy's with the app loaded and navigated and hot reload active. The file's header comment records the
  measurements. Test mode is `up -d dev-db redis backend`, and the browsable stack is `browse`.
- **R10. The main checkout's stack is unchanged.** `infrastructure/docker-compose.yml`, the Caddyfiles,
  `backend/config/settings.py`, the CI Compose file and the env files' tracked examples do not change.

### Seed data

- **R11. `seed_dev_data`.** A management command in `apps/core`. It exits non-zero with a message unless
  `ENVIRONMENT` is `development`. Otherwise:
    - When no user named `dev` exists, it creates one through the configured user model's manager, with email
      `dev@example.com` and password `cinexplorer-dev`, and a verified, primary allauth `EmailAddress` for that email,
      so the account can sign in under mandatory email verification. An existing `dev` user is left as it is. When
      another user already has that email, the command exits non-zero naming the conflict, before changing anything.
    - It loads the movie blacklist by running `sync_blacklist` through `call_command`, which makes the table match
      the tracked blacklist file and is safe to repeat.
    - It prints whether it created the account, and `sync_blacklist`'s summary.

### Documentation and CI

- **R12. Worktree documentation.** `.arc/reference/workflows/supplemental/worktree-sessions.md`:
    - § Provisioning gives `create`, `create --existing`, `create --work-unit` and `provision`, the last also for
      bringing an existing worktree up to date (certificates, port, key). It keeps two points of the section as it
      stands once activation runs in a work unit's own worktree: a work unit is provisioned before its planning
      starts, its PRD and task list are committed on its branch, and activation runs in the worktree later, skipping
      activation's branch step; and its session notes start in planning state, now written by `create --work-unit`
      (R16), which activation later turns to execution.
    - A new section on the browsable stack: `browse`, the stop command (R7), the port in `infrastructure/.env` and how
      to change it when another program holds it, and the dev account (R11). One
      signed-in stack per browser profile, since cookies on `localhost` are shared across ports; a second browser
      profile or a private window keeps a second stack signed in. Google and GitHub sign-in work only on the main
      checkout. A browser that has not trusted the dev certificate asks again for each new port.
    - § Test Stack names the renamed override.
    - § Removal gives `remove`, and `remove --keep-branch` for a review checkout or abandoned work. It says that
      removal deletes the worktree's gitignored files, a work unit's session notes and review records among them, so
      paused work keeps its worktree.
    - § When to Use One and the main checkout's role list what still needs the main checkout: OAuth sign-in and its
      development data.

  `archive-completed.md` § 9 and `run-errand.md` § 6 give `remove` and say that it deletes the local branch, keeping
  their remote-deletion and archival steps; `run-errand.md` § 6 gives `--keep-branch` for an abandoned errand.
  `run-errand.md` § 1 creates an errand's worktree with `create`, and its in-place `git switch -c` gains
  `--no-track` (its first push already sets the upstream with `-u`). `run-errand.md` § Where It Runs,
  `worktree-sessions.md` § Same-Session Errands and the errand skill (`.arc/reference/agent/skills/errand/SKILL.md`,
  whose installed copy the existing installer refreshes) say an errand's worktree is set up by `create`, which needs
  Docker running and installs the frontend's dependencies, in place of setting up only as far as its checks need.
  `run-errand.md` § Where It Runs runs an errand in place on the main checkout only when it needs OAuth sign-in or the
  main checkout's development data, and `session-init.md` § 5 starts, in a worktree, the test stack or `browse`,
  whichever the next action needs.
  `QUICK-REFERENCE.md` (expected containers, network notes, its Docker Assumptions checklist) and `session-init.md`
  § 5 (Docker expectation) count a worktree's five containers while its browsable stack runs, three while its test
  stack runs, and none otherwise. `QUICK-REFERENCE.md`'s type-generation
  note and its list of a worktree's memory limits, and the header comment of `frontend/scripts/export-openapi.js`,
  describe a worktree's stack in either mode and its five limits. `DEVELOPMENT-RULES.md` § Code Documentation
  Standards records Decision 16's exception to its rule against `.arc/` paths and process names in code: the
  seeding script's path and the `--work-unit` flag in `scripts/worktree.mjs` and its tests. The root `AGENTS.md`
  review guideline on repository contract coherence defers to that exception.
- **R13. Tests in CI.** `scripts/worktree.test.mjs` and `.arc/reference/harness-hooks/seed-session-notes.test.mjs`
  run under `node --test` in the CI job that runs the recovery-hook tests.

### Tests

- **R14. Script tests.** Each test builds a bare `origin` repository and a main checkout cloned from it in a
  temporary folder, with stand-in env and certificate files. Docker and npm are replaced by stub executables on
  `PATH` that record their arguments. The tests cover:
    - `create`'s refusals (R3), among them `--existing` on a branch without the override and `--work-unit` alongside
      `--existing`; its `--no-track` branch; `--existing`; the recovery it prints when `provision` fails; and
      `--work-unit` running the seeding step, through a stand-in seeding script the fixture tracks at the real one's
      path, which records its run, with a seeding failure leaving the worktree as provisioned;
    - `provision`: the include copy that keeps an existing file, the links, the appended keys that keep existing
      values, the refusal in the main checkout, and the refusal on a wrong project name; and `provision` in a worktree
      made by `git worktree add` alone, with the include files already copied, as a post-create command finds it;
    - port allocation: the lowest unclaimed port, skipping ports other worktrees claim, and refusing when the range is
      full;
    - `browse`: its refusals, and the Compose and `manage.py` calls it makes;
    - `remove`: refusing, before any Docker call, an unmerged branch, a worktree with uncommitted changes, a locked
      worktree, and an `infrastructure/.env` naming a project other than `cinexplorer-{name}`; skipping the teardown
      when the file names no project; on a merged, clean worktree, the teardown calls naming the project's label,
      the worktree removed, and the branch deleted while the main checkout has another branch checked out; and with
      `--keep-branch` on an unmerged one, the worktree removed and the branch kept at its commit.
- **R15. Seed command tests.** Backend tests against the real test database:
    - the refusal outside `development`;
    - the account created once, verified, and able to sign in through `POST /api/token/`, which refuses an
      unverified email address;
    - an existing `dev` user left unchanged, and the refusal when another user has the email;
    - the blacklist matching the tracked blacklist file after the command.

### Session notes for a work unit

This repository's development process tracks each work unit (a planned change with its own PRD, task list and
branch) in a gitignored `SESSION-NOTES.md` under `.arc/user/{identity}/{name}/` in the checkout that runs it, where
`{identity}` is the one folder under the main checkout's `.arc/user/` (`.arc/user/README.md` § Identity). Session
start and the compaction-recovery hook (`.arc/reference/harness-hooks/compaction-recovery.mjs`) read it; its skeleton
is in `.arc/reference/workflows/supplemental/session-handoff.md` § 2.

- **R16. `seed-session-notes.mjs`.** A Node script with no dependencies beyond Node's built-in modules, at
  `.arc/reference/harness-hooks/seed-session-notes.mjs`, run from a linked worktree's root. It refuses, printing its
  reason, exiting non-zero and changing nothing:
    - in the main checkout;
    - when the main checkout's `.arc/user/` (found through `git rev-parse --path-format=absolute --git-common-dir`)
      holds no folder or more than one, naming what it found;
    - when the worktree's branch is detached or not of the form `{type}/{name}`;
    - when `.arc/user/{identity}/{name}/SESSION-NOTES.md` already exists in the worktree.

  Otherwise it writes that file from the skeleton with State `planning`, Branch `` `{type}/{name}` ``, Task List and
  Next Task `[none yet]`, Last Completed `[none]`, Blockers `[none]`, Next Action "write the PRD
  (`1_create-prd.md`)", Commit at Handoff `[none yet]`, and `[none]` in each of its three sections, and prints the
  path it wrote.
- **R17. Seeding tests.** `.arc/reference/harness-hooks/seed-session-notes.test.mjs` builds throwaway repositories
  the way the recovery-hook tests do, and covers each refusal in R16 and the written file's fields.

## 5. Non-Goals (Out of Scope)

- Google and GitHub sign-in in a worktree. Their apps are database rows tied to the Site record `localhost:8444` on
  the main checkout's database, and their callbacks are registered for that address. In a worktree those buttons
  fail.
- Copying the main checkout's development data into a worktree.
- Staying signed in to several stacks in one browser profile: per-worktree hostnames, regenerated certificates or
  per-stack cookie names.
- An agent skill that wraps the script for any agent harness.
- Creating a PRD or task list in a new worktree, and session notes other than `create --work-unit`'s starting
  notes.
- Changes to the main checkout's stack, ports, base Compose file, Caddyfiles or `settings.py` (R10).
- End-to-end test configuration that targets a worktree's port.
- Deleting a branch that has not merged. `remove --keep-branch` removes its worktree and stack; deleting the branch
  stays a manual `git branch -D`.
- Removing a worktree another tool created and locked, and tearing down its stack. That tool removes its worktrees
  its own way, with no step for a Compose project, so its stacks' teardown is arranged when that tool is adopted.
- Guarding against two `provision` runs racing for the same port, and detecting a port that a program other than a
  worktree stack holds. Compose then fails to publish it and says so, and the maintainer changes `SITE_PORT`.
- Rebuilding a worktree's frontend image or dependency volume after its branch changes frontend dependencies. The
  documented Compose commands cover it, as on the main checkout.

## 6. Design Considerations

A worktree's browsable stack costs about as much memory as the main checkout's: the backend near 200 MiB idle, the
frontend near 50 MiB idle and more while serving, Postgres near 100 MiB, Caddy and Redis under 20 MiB each. Docker
Desktop reports about 16 GB. The first `browse` builds the frontend and backend images for that project from the
shared layer cache. Backend test runs remain one at a time across every stack.

## 7. Design Decisions

1. **The worktree script is part of this change**, over a smaller script first that this change then extends: the
   script must allocate each worktree's port and key anyway, and one design covers both. The whole lands as one
   change: the script writes the keys the override reads, and `browse` runs the seed command, so no part is useful
   alone. It is forecast near 2,000 changed lines, tests and documentation included.
2. **Shaped for a later worktree tool**: `.worktreeinclude` for the files to copy, and `provision` as an idempotent
   post-create command, over one monolithic create script. A tool that copies `.worktreeinclude` files and then runs
   a post-create command (arc-framework's `arc start` does both) can replace `create` and keep `.worktreeinclude` and
   `provision`. Port allocation and the env file live in `provision` for that reason. That tool also removes its
   worktrees its own way and locks them against `git worktree remove`, so it replaces `remove` too, and `remove`
   refuses a locked worktree.
3. **One published port per worktree, Caddy's, bound to `127.0.0.1`**, over also publishing Postgres or the backend:
   one port to allocate, nothing else to collide, and nothing reachable from other machines. A worktree's database
   is reached through `docker compose exec dev-db psql`, its API through `https://localhost:{SITE_PORT}/api`.
4. **The container keeps 8444 and only the host port changes**, over an environment-driven site address in the dev
   Caddyfile: Caddy matches by hostname, so the Caddyfile stays as it is.
5. **Origins and URLs from the override, derived from `SITE_PORT`**, over rewriting each worktree's copied env files:
   Compose `environment` overrides `env_file`; `settings.py` also reads the copied `backend/config/.env` itself
   through `environ.Env.read_env`, whose default (`overwrite=False`) leaves variables already in the environment as
   they are; and Vite gives variables already in the environment priority over its `.env` files. So the copies stay
   identical to the main checkout's, and one value in `infrastructure/.env` drives them all. `settings.py` already
   reads both origin lists from the environment. A change to `read_env`'s overwrite behavior would bring back the
   main checkout's key and origins in every worktree.
6. **A secret key per worktree**, over separate hostnames or per-stack cookie names: other stacks then reject a
   worktree's tokens instead of reading their user IDs as their own users. Separate hostnames would mean a
   regenerated certificate trusted again on Windows; per-stack cookie names would change authentication and CSRF
   cookie code in both backend and frontend. The cost is one signed-in stack per browser profile.
7. **One override for the test and browsable modes, with the backend serving in both**, over a second override
   layered on the test stack, which would have to restate the base file's command, mounts and health check to undo
   the idle backend. A serving backend publishes no port, and its certificates come with `provision`. The rename
   reflects the file's wider use; only `worktree-sessions.md` names it outside the archive.
8. **`provision` writes `infrastructure/.env`, and `.worktreeinclude` leaves it out**, over listing it: `provision`
   produces the file whole, a copy of the main checkout's plus the worktree's keys, so one step owns it whether or
   not another tool copied files first. Either way, a worktree whose file names no project falls back to the main
   checkout's project (`infrastructure`) for base-file commands; the override's required project name refuses then,
   and `provision`'s name check confirms the name.
9. **Lowest free port from 8445, recorded in the worktree's `infrastructure/.env`**, over a port derived from the
   name (collisions) or one the maintainer picks (another manual step). Ports are reused after removal.
10. **A fresh database seeded by a command**, over copying the main checkout's data: a branch that reshapes models,
    such as a change of user model, would break a copy. The copy would also carry OAuth rows tied to the main
    checkout's address. The blacklist is loaded from its tracked file because browsing without it shows the adult
    titles it exists to hide.
11. **A fixed, documented dev account**, over a password each maintainer sets in the main checkout's env file: no
    setup step. The account exists only in development databases. The command refuses outside `development`, and
    the port answers only on this machine.
12. **A Node script tested with `node --test`**, over a shell script: the logic (allocation, idempotent env edits,
    refusals) needs tests, and the repository already tests its Node recovery hooks the same way in CI.
13. **`remove` deletes a merged local branch and never an unmerged one**, over leaving branch deletion to each
    caller: setting the upstream to `origin/main` before `git branch -d` lets a merged branch delete while the main
    checkout has another branch checked out, and the ancestry check keeps unmerged work. `--keep-branch`, over manual
    removal commands, covers review checkouts and abandoned work with the same refusals and label teardown. Paused
    work keeps its worktree, since removal takes its gitignored session notes.
14. **Removal finds Compose resources by their project label**, over `docker compose down -v --rmi local` with the
    worktree's Compose files or its project name. The files differ on branches that predate the rename. After the
    stop command has removed the containers, a by-name `down -v --rmi local` still removes the volumes but leaves the
    locally built images. Compose labels every container, volume, network and built image with its project, so the label
    finds them all (checked with a throwaway project).
15. **`create` cuts branches with `--no-track`**, over git's default upstream of `origin/main`: with that upstream,
    `git status` compares against `main`, and a bare `git push` refuses or, under `push.default=upstream`, pushes to
    `main`. The first push sets the branch's own upstream.
16. **Session notes seeded by a script under `.arc/`, which `create --work-unit` calls**, over writing them in
    `scripts/worktree.mjs` or leaving them to a second command. The repository keeps process vocabulary and `.arc/`
    paths out of code outside `.arc/`, so the notes' skeleton, identity rule and paths stay in the `.arc/` script
    beside the recovery hook that reads the same file. `scripts/worktree.mjs` holds one call to it by path and the
    flag's name, its tests hold that path for a stand-in script, and the flag's help text says only that it writes
    the starting notes for planned work. The notes' content is tested beside the seeding script (R17), not in the
    worktree script's tests. One command still sets up a work unit's worktree, as arc-framework's `arc start` does. An
    explicit flag, over inferring from the branch: errands get no notes, and branch types (`fix`, `refactor`,
    `technical` and so on) don't separate work units from errands.

## 8. Success Criteria

### Implemented (checkable locally and in CI)

1. `node --test scripts/worktree.test.mjs` and `node --test .arc/reference/harness-hooks/seed-session-notes.test.mjs`
   pass, in CI as well, covering R14's and R17's cases. They fail when allocation returns a port another worktree
   claims, when `provision` changes an existing key, when seeding overwrites existing notes, or when `remove` makes a
   Docker call or changes anything for an unmerged branch without `--keep-branch`, a worktree with uncommitted
   changes, a locked worktree, or a project name other than `cinexplorer-{name}`, or makes a Docker call when the
   worktree's `infrastructure/.env` names no project.
2. The backend tests for `seed_dev_data` pass, covering R15's cases.
3. `docker compose -f infrastructure/docker-compose.yml config` in the main checkout gives the same published ports
   as before this change: 8444, 8000, 5173, 5432 and 6379.
4. In a provisioned worktree, `config` with both files and `--profile browser` lists all five services and shows
   `caddy` as the only one with a published port, bound to `127.0.0.1:{SITE_PORT}`, and a memory limit on every
   service.
5. In a worktree set up by hand before this change, `provision` keeps its `COMPOSE_PROJECT_NAME` and adds the
   missing keys and certificates, and its test stack (`up -d dev-db redis backend`) then runs `pytest apps/` to a
   pass.

### Proven live (on this machine, with the main checkout's stack running)

6. Two throwaway worktrees made by `create`, one of them with `--work-unit`, and started by `browse` each answer
   `200` on `/` and `/api/health-check/` at their own ports, while `https://localhost:8444` still does. The one made
   with `--work-unit` holds starting session notes at `.arc/user/{identity}/{name}/SESSION-NOTES.md`, and the other
   holds none.
7. In the maintainer's browser, at a worktree's port: signing in as the dev account succeeds, a movie added to the
   watchlist is still there after a reload, the worktree's backend log shows the requests, and the main checkout's
   database has no new rows for them. With a refresh cookie that worktree's stack issued to the dev account
   (`POST /api/token/`), `POST /api/auth/refresh` to that worktree's stack returns new tokens, and the same request to
   `https://localhost:8444` is refused with 400 and the error "Invalid or expired refresh token", the signature
   failure, and returns no tokens. (A validly signed token whose user is missing on that stack also gets 400, with a
   different error, so the error text is what shows the key differs.)
8. Editing a frontend source file in a worktree updates the page at its port without a manual reload.
9. `remove` on a merged throwaway worktree whose stack ran leaves no containers, volumes, networks or images labelled
   with its project, no folder and no local branch. On an unmerged one it refuses and leaves all of them in place;
   with `--keep-branch` it removes the folder and stack and keeps the branch at its commit.

## 9. Open Questions

None.

## Dependencies and Preconditions

- The main checkout has `infrastructure/dev-certs/cert.pem` and `key.pem`, as it does today, since `.worktreeinclude`
  copies them.
- A worktree set up before this change refuses every Compose command naming the override once its branch includes
  this change, its test stack included: its `infrastructure/.env` lacks `SITE_PORT` and `WORKTREE_SECRET_KEY`, and
  its backend now mounts certificates it never copied. Running `provision` in it once supplies all three.
- Requests through a worktree's Caddy are same-origin. The CSRF middleware in use (`CsrfHeaderMiddleware`) compares
  the `csrftoken` cookie with the `X-CSRFToken` header and does not read `Origin`. Django's own origin check
  (`CsrfViewMiddleware`, which Django admin's `csrf_protect` runs, as would a middleware built on it) compares
  `Origin` with the request's host, which Caddy passes through unchanged, so it passes too.
- `seed_dev_data` creates its account through the configured user model's manager, so a change of user model that
  keeps a `username` and an `email` field keeps the command working.
- R12's edits to `worktree-sessions.md` § Provisioning build on that section as revised for activation in a work
  unit's own worktree (a work unit provisioned before its planning, its notes created at provisioning). That revision
  lands on `main` first, and this branch merges `main` before R12 is implemented.
- R11 runs `sync_blacklist`, which pull request #75 adds with the tracked blacklist file, replacing
  `populate_blacklist`. That change lands on `main` first, and this branch merges `main` before R11 is implemented.

## Amendments

- **2026-11-04,** during task generation, on the Owner's approval: R11 loads the movie blacklist with
  `sync_blacklist`, from the tracked blacklist file, in place of filling an empty blacklist from TMDB through
  `populate_blacklist`, which pull request #75 removes. The fill-only-when-empty rule, the partial fill finished by
  hand and the TMDB replacement in R15's tests go with it. R7, R12, R15, Design Decision 10 and the Dependencies
  follow. Contained change; the independent pass was skipped on the Owner's approval, since the change removes
  mechanism and the task list's review reads the PRD.
- **2026-11-04,** during task generation, on the Owner's approval: § 1's sign-in bullet says the frontend refreshes
  only when its own origin's storage holds an access token (the 401 handler today, and the refresh on load that
  `technical/launch-readiness` adds), so a stack accepts another stack's cookie only on a page signed in there
  earlier; the access token's home is the origin's browser storage, since a sign-in without "remember me" uses
  `sessionStorage`. Wording only; the design is unchanged.
