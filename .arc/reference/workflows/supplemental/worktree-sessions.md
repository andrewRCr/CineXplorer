# Workflow: Worktree Sessions

**Purpose**: Run work in a linked checkout beside the primary. Either a separate conversation or the same
conversation can direct its tools to that checkout and its own Compose project. The primary keeps its branch,
tracked files and dev data.

The primary is the main checkout. It keeps Compose's default project name, `infrastructure`, and runs the full stack:
Caddy on 8444, the frontend dev server, the backend, `dev-db` and `redis`.

## When to Use One

A worktree suits work that does not need the browser stack:

- Planning, review and documentation
- Errands touching CI, configuration or documentation ([run-errand.md](run-errand.md))
- Frontend work, checked by host-side tests, lint and type-check
- Backend work, tested in the worktree's own test stack

What stays on the primary: anything viewed in the browser on 8444, OAuth sign-in (its origins name the primary's
address), and the dev database's data.

## Provisioning

From the primary's root:

```bash
node scripts/worktree.mjs create technical/{name} --work-unit  # planned work, with starting notes
node scripts/worktree.mjs create fix/{name}                   # an errand, without notes
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
certificates), links shared tools, appends missing project, browser-port and signing-key values to
`infrastructure/.env`, checks the resolved Compose project name, then runs `npm ci` and `npm run typegen` in
`frontend/`. Docker must be running. Repeating it preserves existing files and keys and repeats the check and
install. A failed `create` leaves its checkout in place and prints the commands to finish setup there.

- **Branch:** a work unit is provisioned before planning starts: the PRD and task list are written and committed on
  this branch. [activate-work-unit.md](activate-work-unit.md) runs in the worktree later, skipping its branch step.
- **Project name:** Compose reads `COMPOSE_PROJECT_NAME` from `infrastructure/.env`; provisioning confirms it is
  `cinexplorer-{name}` and prints only the name, keeping the env values in the rest of `config` off the screen.
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
selection with `errand-enter`, run from the session home. Creation needs Docker running and installs frontend
dependencies even for documentation or harness work; start a stack only when the checks need it.

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
- **Backend tests and API types:** only through the worktree's own test stack (§ Test Stack)

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

## Removal

After the pull request merges, and before the branch is deleted: git refuses to delete a branch a worktree has checked
out. Run removal commands from the primary. A separate conversation rooted in the worktree hands off and ends
first. A same-session errand instead runs `errand-return` from its session home and confirms that home is active
before removing the checkout; the conversation can then continue.

```bash
W="${PWD}.{name}"
docker compose -f "$W/infrastructure/docker-compose.yml" -f "$W/infrastructure/docker-compose.test-stack.yml" \
  config | grep '^name:'   # name: cinexplorer-{name}
docker compose -f "$W/infrastructure/docker-compose.yml" -f "$W/infrastructure/docker-compose.test-stack.yml" \
  down -v --rmi local
git worktree remove "$W"
```

Then delete the branch the caller's way, [archive-completed.md § 9](archive-completed.md#9-delete-child-branch) for a
work unit or [run-errand.md § 6](run-errand.md#6-clean-up)'s `git branch -d` for an errand, and run
`git fetch --prune`.

- **The stack step** applies to a worktree whose `infrastructure/.env` names a project. Naming the worktree's own files
  by absolute path makes Compose read that worktree's `.env`; `config` must report its name before `down -v`, which
  deletes that project's volumes (`--rmi local` also removes the backend image built for it). A worktree without the
  file never had a stack and skips the step.
- **A refusal** from `git worktree remove` protects uncommitted or untracked work. Inspect it; never `--force`.
- **What goes:** the checkout's gitignored files, among them the copied `.env` files, `node_modules`, and a work
  unit's session notes and review records, which [archive-completed.md](archive-completed.md) § 10 deletes anyway;
  the merged task list's Review Log is the durable record. The links go, not the primary's folders they point to.
