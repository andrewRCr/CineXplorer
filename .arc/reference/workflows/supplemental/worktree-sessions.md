# Workflow: Worktree Sessions

**Purpose**: Run work in a linked checkout beside the primary. Either a separate conversation or the same
conversation can direct its tools to that checkout and its own Compose project. The primary keeps its branch,
tracked files and dev data.

The primary is the main checkout. It keeps Compose's default project name, `infrastructure`, and runs the full stack:
Caddy on 8444, the frontend dev server, the backend, `dev-db` and `redis`.

## When to Use One

A worktree suits planning, implementation and browser work against its own code and database:

- Planning, review and documentation
- Errands touching CI, configuration or documentation ([run-errand.md](run-errand.md))
- Frontend work, checked by host-side tests, lint and type-check, and viewed in its browsable stack
- Backend work, tested in the worktree's own stack in either mode

What stays on the primary: OAuth sign-in (its origins name the primary's address) and its development data. Only the
primary checkout's stack sends mail; a worktree's stack discards it. A worktree's browsable stack serves its own
code and fresh database on its own port.

## Provisioning

From the primary's root:

```bash
node scripts/worktree.mjs create technical/{name} --work-unit  # planned work, with starting notes
node scripts/worktree.mjs create fix/{name}                   # an errand, without notes
node scripts/worktree.mjs create docs/{name} --no-install    # setup without Docker or dependencies
node scripts/worktree.mjs create fix/{name} --existing        # an existing local or origin branch
```

`create` fetches `origin`, creates the sibling `{primary}.{name}` and provisions it. New branches start from
`origin/main` with no upstream; the printed first-push command sets their own upstream. `--existing` refuses a
branch checked out elsewhere or lacking the worktree override: merge `main` into an older branch first.
`--work-unit` cannot be combined with `--existing`.

To prepare a checkout another tool created, or bring an existing worktree up to date, run from that worktree:

```bash
node scripts/worktree.mjs provision
```

Provisioning copies missing ignored files matched by `.worktreeinclude` (backend and frontend env files and
certificates), links installed shared tools, appends missing project, browser-port and signing-key values to
`infrastructure/.env`, checks the resolved Compose project name, then runs `npm ci` and `npm run typegen` in
`frontend/`. Full provisioning requires Docker. Repeating it preserves existing files and keys and repeats the
check and install. `create --no-install` keeps the file copies, shared-tool links and environment values, but skips
Compose validation, `npm ci` and `npm run typegen`, so it needs no Docker. Its final message names
`node scripts/worktree.mjs provision` to validate the project and install later.
It can be combined with either `--existing` or `--work-unit`. Missing shared-tool folders are skipped; a later run
links them once installed in the primary. A failed
`create` leaves its checkout in place and prints the commands to finish setup there.

- **Branch:** a work unit is provisioned before planning starts: the PRD and task list are written and committed on
  this branch. [activate-work-unit.md](activate-work-unit.md) runs in the worktree later, skipping its branch step.
- **Project name:** Compose reads `COMPOSE_PROJECT_NAME` from `infrastructure/.env`; full provisioning confirms it is
  `cinexplorer-{name}` and prints only the name, keeping the env values in the rest of `config` off the screen.
  `create --no-install` prints the configured name; `provision` or `browse` validates the resolved project later.
  Without a name, a base-file command would act on the primary's `infrastructure` project; the worktree override
  refuses to resolve instead.
- **Links:** `.venv-backend`, `.claude` and `.codex` point at the primary's, sharing its Python environment, harness
  settings and recovery hooks. Provisioning creates only missing entries. `.gitignore` names them without a
  trailing slash, which matches a link as well as a folder; keep it that way.
- **Install warnings:** npm holds back the install scripts of esbuild and msw and says so. Neither is needed: esbuild
  runs from its platform package, and the project configures no msw worker directory.
- **Codex:** no step of its own. A linked worktree uses the primary's project trust and its approved project hooks,
  so approve those hooks once in a Codex session on the primary (`/hooks`).
- **Notes:** `create --work-unit` writes a work unit's starting notes in its own
  `.arc/user/{identity}/{name}/SESSION-NOTES.md`: State `planning`, Task List and Next Task `[none yet]`, and Next
  Action the PRD. Activation later turns them to execution. The inbox and working memory stay in the main checkout
  ([user-inbox.md](user-inbox.md)).

## Same-Session Errands

An errand can stay in the conversation launched at the primary. Its tools use an explicit working directory for
each shell call and absolute paths for reads and edits. The session home and active errand checkout are distinct;
changing a shell's directory does not retarget the conversation or its hooks.

Before the first such errand, run this from a reviewed checkout containing the updated harness:

```bash
node .arc/reference/harness-hooks/install-errand-harness.mjs
```

It copies the recovery implementation and `$errand` skill into the primary's gitignored `.codex/`, preserves
unrelated hook entries and keeps a backup of `hooks.json`. Approve changed hooks in the harness when prompted.
Refresh the installation with the same command when those tracked sources change. The installed copy survives
worktree removal and works while the primary remains on an older branch; it does not modify that branch's tracked
hook source. `.claude` hook configuration is unchanged.

`$errand <concern or inbox title>` follows [run-errand.md](run-errand.md) in the current conversation. The agent
creates and provisions a sibling checkout with `node scripts/worktree.mjs create {type}/{name}`, then records its
selection with `errand-enter`, run from the session home. Default creation needs Docker running. For documentation
or harness work, add `--no-install` to skip Docker validation and frontend dependencies; run `provision` in that
worktree when they are needed. Start a stack only when the checks need it.

The session-scoped record lives in shared Git metadata and uses the Codex thread/session identifier. The identifiers
must agree; missing or different identifiers stop entry. Recovery validates the checkout's registration, repository
and recorded branch, then emits that checkout's context and absolute read paths. An invalid or missing checkout
produces a stop instruction rather than the primary work unit's notes. Return explicitly before removal.

Sibling paths are outside the primary's ordinary writable directory. Configure scoped access or approval context
for this repository's registered worktrees; project trust alone does not grant writes there. Do not broaden access
to the entire parent directory. Git metadata and the installed harness are shared; editing through `.codex` or
`.claude` links edits the primary's local settings.

## What Runs Where

- **Frontend tests, lint and type-check:** on host Node, in `frontend/`: `npm test`, `npm run lint`, and
  `npm run type-check` after typegen
- **Ruff:** `.venv-backend/bin/ruff check backend/apps/ backend/config/` from the root, through the linked venv
- **Pyright and markdown lint**, at CI's pins, from the root:
  `npx --yes pyright@1.1.414 backend/apps/ backend/config/ --project backend` and
  `npx --yes markdownlint-cli2@0.24.0 "README.md" ".arc/**/*.md"`
- **Backend tests and API types:** only through the worktree's own stack, in test or browser mode
- **End-to-end smoke specs:** on host Node in `frontend/`, against the running worktree browsable stack. Start it
  with `node scripts/worktree.mjs browse` from the root, then run
  `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e` from `frontend/`

## Test Stack

A worktree runs backend tests with `dev-db`, `redis` and the serving HTTPS backend, with no published ports and a
memory limit on each container (`infrastructure/docker-compose.worktree.yml`). Every command names both Compose
files; the override refuses to resolve until `provision` has supplied `COMPOSE_PROJECT_NAME`, `SITE_PORT` and
`WORKTREE_SECRET_KEY` in `infrastructure/.env`.

```bash
S="-f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml"
docker compose $S up -d dev-db redis backend
docker compose $S exec -T backend nice -n 15 pytest apps/            # the full suite
docker compose $S exec -T backend nice -n 15 pytest apps/{app}/      # the apps a task touched
docker compose $S down                                               # when the worktree goes idle
```

- **One test run at a time** across every stack on the machine, the primary's included.
- **Down when idle;** `down -v`, which also deletes the stack's database, belongs to Removal.
- **The first `up`** builds the backend image for this project from the shared layer cache; rebuild
  (`docker compose $S build backend`) after backend requirements change.
- **API types:** `npm run generate-types` in `frontend/` exports the schema from this checkout's own backend container
  and regenerates `src/types/api.ts`, so a worktree's types come from its own code. That command names only the base
  compose file and relies on `infrastructure/.env` naming the project, which provisioning confirms with `config`. In
  a worktree whose project is still `infrastructure`, it refuses rather than export the primary's schema.

## Browsable Stack

From a provisioned worktree's root:

```bash
node scripts/worktree.mjs browse
```

This validates the effective Compose project name, including environment overrides, before starting the stack or
changing its database. It creates `frontend/logs` as the host user before Docker mounts it, so a fresh checkout
gets writable logs rather than a root-owned bind source. Both development images take `USER_UID` and `USER_GID`
from `infrastructure/.env` (default 1000); set them to the checkout owner's IDs before building. It then starts all
five services with the `browser` profile, waits for them to run and for
health checks to pass, then applies migrations and runs `seed_dev_data`. The printed address is
`https://localhost:{SITE_PORT}`; sign in
as `dev` with password `cinexplorer-dev`. The account is verified and the tracked blacklist is loaded. Repeating
`browse` applies only new migrations, leaves an existing dev account unchanged and syncs the blacklist again.

`SITE_PORT` in `infrastructure/.env` drives the published port, frontend API URL and backend origins. Provisioning
allocates the lowest unclaimed worktree port from 8445 to 8499. If another program holds it, stop the stack, change
`SITE_PORT` to an unused port in that file and run `browse` again. Each stack has a separate signing key; cookies
are still shared across ports on `localhost`, so keep one signed-in stack per browser profile. A second browser
profile or a private window keeps a second stack signed in. Google and GitHub sign-in work only on the primary.
A browser that has not trusted the development certificate asks again for each new port.

Stop either mode with both files and the browser profile; this keeps all volumes:

```bash
docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml \
  --profile browser down
```

## Removal

After the pull request merges, close the worktree from the primary:

```bash
node scripts/worktree.mjs finish {name}
```

A separate conversation rooted in the worktree hands off and ends first: `finish` and `remove` refuse while any
process runs inside the worktree, and name each one. A same-session errand instead runs `errand-return` from its
session home and confirms that home is active before removal; the conversation can then continue.

`finish` refuses a main checkout that isn't a clean `main`, fast-forwards it, and runs the closing steps around
`remove`: before it, the hold on unchecked task-list boxes and a copy of the worktree's personal folder in
`errand-records/`; after it, the remote branch, the archive commit for planned work and the errand-harness refresh
([archive-completed.md § 10](archive-completed.md#10-finish-the-worktree)). It stops before any push.

`remove` fetches `origin` and refuses an unmerged branch, a locked worktree, uncommitted or untracked work, or an
unexpected Compose project name before deleting anything. It stops and removes containers and removes volumes,
networks and built images carrying the worktree's project label, even if the containers were already stopped or
removed. It then removes the checkout, deletes the merged local branch and prunes remote-tracking refs. An env file
that names no project skips Docker teardown.

For a review checkout or abandoned work whose branch must stay:

```bash
node scripts/worktree.mjs remove {name} --keep-branch
```

`--keep-branch` skips only the merged-branch requirement and branch deletion; all other refusals still apply.
Stack teardown runs unless `--no-stack` is also supplied. An unmerged branch is never deleted by this script.

For work that needs no stack, or while Docker is unavailable:

```bash
node scripts/worktree.mjs finish {name} --no-stack
node scripts/worktree.mjs remove {name} --no-stack
node scripts/worktree.mjs remove {name} --keep-branch --no-stack
```

`--no-stack` skips only Docker cleanup and prints a reminder. All process, permission, project-name, Git and
closing-step checks remain. If a stack ever ran, remove the `cinexplorer-{name}` project's remaining containers
and volumes later; the flag leaves its Docker resources behind when removing the checkout. Without the flag,
a named project's cleanup still requires Docker.

Removal deletes the checkout's gitignored files: copied env files, `node_modules`, and a work unit's session notes
and review records among them, which `finish` keeps first. Paused work keeps its worktree. The merged task list's
Review Log is the durable review record; links are removed without touching the primary's folders they point to.
