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

From the primary's root, for a branch `{type}/{name}`:

```bash
W="${PWD}.{name}"
git fetch origin
git worktree add -b {type}/{name} "$W" origin/main

# Gitignored setup a new checkout does not carry
for f in backend/config/.env frontend/.env frontend/.env.development infrastructure/.env; do
  cp "$f" "$W/$f"
done
printf '\nCOMPOSE_PROJECT_NAME=cinexplorer-{name}\n' >> "$W/infrastructure/.env"
for d in .venv-backend .claude .codex; do
  ln -sfT "$PWD/$d" "$W/$d"
done

cd "$W"
docker compose -f infrastructure/docker-compose.yml config | grep '^name:'   # name: cinexplorer-{name}
(cd frontend && npm ci && npm run typegen)
```

- **Branch:** `-b` cuts a new branch from `origin/main`, for an errand or a work unit. For a work unit it stands in
  for [activate-work-unit.md](activate-work-unit.md) Step 2, and the steps after it run in the worktree. For an
  existing branch, such as one under review, run `git worktree add "$W" {branch}` instead; git refuses while another
  checkout has that branch.
- **Project name:** Compose reads `COMPOSE_PROJECT_NAME` from `infrastructure/.env`. Without it the worktree's project
  is `infrastructure` too, and every `docker compose` command there acts on the primary's containers and volumes.
  Never copy `infrastructure/.env` without adding the name, and check it with `config` before the first Compose
  command. The `grep` keeps the rest of `config`'s output, which includes values from the `.env` files, off the screen.
- **Links:** `.venv-backend`, `.claude` and `.codex` point at the primary's, so the worktree shares its Python
  environment, harness settings and recovery hooks. `ln -sfT` replaces a link left by an earlier run instead of
  writing a new one inside the primary's folder. `.gitignore` names them without a trailing slash, which matches a
  link as well as a folder; keep it that way, or the links show as untracked.
- **Install warnings:** npm holds back the install scripts of esbuild and msw and says so. Neither is needed: esbuild
  runs from its platform package, and the project configures no msw worker directory.
- **Codex:** no step of its own. A linked worktree uses the primary's project trust and its approved project hooks,
  so approve those hooks once in a Codex session on the primary (`/hooks`).
- **Notes:** a work unit's session notes live in the worktree's own `.arc/user/{identity}/{name}/`. The inbox and
  working memory stay in the main checkout ([user-inbox.md](user-inbox.md)).

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
creates and provisions a sibling checkout, then records its selection with `errand-enter`, run from the session
home. For documentation and harness work, provisioning needs only the shared tool/harness links; copy environment
files, install frontend dependencies or start a test stack only when the checks need them.

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

A worktree runs backend tests in its own test-only stack: `dev-db`, `redis` and an idle backend, with no published
ports and a memory limit on each container (`infrastructure/docker-compose.test-stack.yml`). Every command names both
compose files; the second one refuses to resolve until `infrastructure/.env` names the project.

```bash
S="-f infrastructure/docker-compose.yml -f infrastructure/docker-compose.test-stack.yml"
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
