# Workflow: Worktree Sessions

**Purpose**: Run another session on CineXplorer beside the primary one. A session in a linked worktree works on its
own checkout and its own Compose project, so its commands never reach the primary's containers, code or dev data.

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
W=~/dev/scratch/cinexplorer-worktrees/{name}
git fetch origin
git worktree add -b {type}/{name} "$W" origin/main

# Gitignored setup a new checkout does not carry
for f in backend/config/.env frontend/.env frontend/.env.development infrastructure/.env; do
  cp "$f" "$W/$f"
done
printf '\nCOMPOSE_PROJECT_NAME=cinexplorer-{name}\n' >> "$W/infrastructure/.env"
for d in .venv-backend .claude .codex; do
  ln -s "$PWD/$d" "$W/$d"
done

cd "$W"
docker compose -f infrastructure/docker-compose.yml config | grep '^name:'   # name: cinexplorer-{name}
(cd frontend && npm ci && npm run typegen)
```

- **Project name:** Compose reads `COMPOSE_PROJECT_NAME` from `infrastructure/.env`. Without it the worktree's project
  is `infrastructure` too, and every `docker compose` command there acts on the primary's containers and volumes.
  Never copy `infrastructure/.env` without adding the name, and check it with `config` before the first Compose
  command. The `grep` keeps the rest of `config`'s output, which includes values from the `.env` files, off the screen.
- **Links:** `.venv-backend`, `.claude` and `.codex` point at the primary's, so the worktree shares its Python
  environment, harness settings and recovery hooks. `.gitignore` names them without a trailing slash, which matches a
  link as well as a folder; keep it that way, or the links show as untracked.
- **Install warnings:** npm holds back the install scripts of esbuild and msw and says so. Neither is needed: esbuild
  runs from its platform package, and the project configures no msw worker directory.
- **Codex:** on the worktree's first Codex session, trust its path and approve its project hooks if Codex asks.
- **Notes:** a work unit's session notes live in the worktree's own `.arc/user/{identity}/{name}/`. The inbox and
  working memory stay in the main checkout ([user-inbox.md](user-inbox.md)).

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
  compose file and relies on `infrastructure/.env` naming the project, which provisioning confirms with `config`.

## Removal

After the pull request merges, and before the branch is deleted: git refuses to delete a branch a worktree has checked
out. Run it from the primary, never from a session standing in the worktree; that session hands off and ends first.

```bash
W=~/dev/scratch/cinexplorer-worktrees/{name}
docker compose -f "$W/infrastructure/docker-compose.yml" -f "$W/infrastructure/docker-compose.test-stack.yml" \
  config | grep '^name:'   # name: cinexplorer-{name}
docker compose -f "$W/infrastructure/docker-compose.yml" -f "$W/infrastructure/docker-compose.test-stack.yml" \
  down -v
git worktree remove "$W"
```

Then delete the branch the caller's way, [archive-completed.md § 9](archive-completed.md#9-delete-child-branch) for a
work unit or [run-errand.md § 6](run-errand.md#6-clean-up)'s `git branch -d` for an errand, and run
`git fetch --prune`.

- **The stack step** applies to a worktree whose `infrastructure/.env` names a project. Naming the worktree's own files
  by absolute path makes Compose read that worktree's `.env`; `config` must report its name before `down -v`, which
  deletes that project's volumes. A worktree without the file never had a stack and skips the step.
- **A refusal** from `git worktree remove` protects uncommitted or untracked work. Inspect it; never `--force`.
- **What goes:** the checkout's gitignored files, among them the copied `.env` files, `node_modules`, and a work
  unit's session notes and review records, which [archive-completed.md](archive-completed.md) § 10 deletes anyway;
  the merged task list's Review Log is the durable record. The links go, not the primary's folders they point to.
