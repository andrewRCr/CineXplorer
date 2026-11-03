# Git Hooks - CineXplorer

This directory contains git hooks that enforce commit message standards, run pre-commit checks and guard direct
pushes to `main`.

## What Are Git Hooks?

Git hooks are scripts that run automatically at specific points in the git workflow:

- **pre-commit** - Runs before commit is created (checks files, detects issues)
- **commit-msg** - Runs after commit message is written (validates format)
- **pre-push** - Runs before a push is sent (guards `main`)

## Quick Setup

**One-time configuration:**

```bash
# From repository root
git config core.hooksPath .githooks
```

That's it! Hooks will now run automatically for all commits and pushes.

## What Gets Validated

### commit-msg Hook

Validates commit message format against project standards:

✅ **Enforced (blocks commit):**

- Conventional Commits format: `<type>(scope): description`
- Subject line length: 50-72 characters
- Context: footer present
- Context: footer format (task list reference or category)
- Task list file exists (if referenced)
- Task number format: "Task X.Y" not "Phase X.Y"

⚠️ **Warned (allows commit):**

- Subject line 50+ chars (warns at 50, blocks at 72)
- Body length over 15 lines (warns at 15, blocks at 25)
- Common mistakes (referencing PRD, using "Phase X.Y")

### pre-commit Hook

Checks files before commit is created:

✅ **Enforced (blocks commit):**

- No merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- No sensitive files (`.env`, `credentials.json`, etc.)

⚠️ **Warned (allows commit):**

- Committing directly to main branch
- Large files (> 1MB)
- Debug statements (`console.log`, `pdb.set_trace`, etc.)
- Modified task lists not staged

### pre-push Hook

Code reaches `main` only through a pull request with passing CI; changes confined to `.arc/` may be pushed to `main`
directly.

✅ **Enforced (blocks push):**

- A push to `main` whose new commits, or whose resulting tree, change any path outside `.arc/` (a rename counts both
  its old and new path)
- Deleting `main`, or pushing to `main` before fetching and integrating the remote's latest commits

Pushes to other branches and tags pass untouched. `gh pr merge` merges on GitHub, so the hook never runs for it.

## Examples

### Valid Commit Messages

```bash
# Standard single task
git commit -m "fix(movie): resolve pagination duplicate issue

- Smart buffer now tracks consumed TMDB pages
- Prevents duplicate movies across pagination

Context: tasks-pagination-buffer-tracking.md (Task 2.1)"

# Multiple tasks
git commit -m "refactor(api): extract service layer

- Extracted MovieService with business logic
- Updated endpoints to use service layer

Context: tasks-api-layer-modernization.md (Tasks 3.1-3.4)"

# Planning work (no task list)
git commit -m "docs(arc): create PRD for pagination feature

- Analyzed limitations and defined solution
- Generated task breakdown (7 phases)

Context: planning (no associated task list)"
```

### Invalid Commit Messages

```bash
# ❌ Missing Context: footer
git commit -m "fix: some bug"

# ❌ Wrong conventional commit format
git commit -m "Fixed the authentication bug"

# ❌ Subject too long
git commit -m "fix(auth): this is a very long subject line that exceeds the maximum allowed character limit for commit messages"

# ❌ Wrong task reference format
git commit -m "fix(movie): resolve issue

Context: Filter Integration Testing (Phase 3.6)"
```

## Bypassing Hooks

Never bypass the hooks with `--no-verify` (or `-n`), on a commit or a push. When a hook fails, fix the issue and
retry. An emergency hotfix still reaches `main` through a pull request: skipping `pre-push` would land code on `main`
with no check at all.

## Troubleshooting

### Hooks Not Running

**Check configuration:**

```bash
git config core.hooksPath
# Should output: .githooks
```

**Re-run setup if needed:**

```bash
git config core.hooksPath .githooks
```

### Hook Fails on Valid Commit

**Check if hooks are executable:**

```bash
ls -la .githooks/
# Should show: -rwxr-xr-x for commit-msg, pre-commit and pre-push
```

**Make executable if needed:**

```bash
chmod +x .githooks/commit-msg .githooks/pre-commit .githooks/pre-push
```

### False Positive Warnings

**Debug statements in test files:**

- pre-commit hook skips test files
- Pattern: `test_`, `_test.py`, `.test.ts`, `.spec.js`

**Task list file not found:**

- Warning if file doesn't exist in `.arc/active/`
- This is just a warning, commit still proceeds
- OK if file was just created or archived

## Disabling Hooks

**Temporary (one session):**

```bash
git config --unset core.hooksPath
# Re-enable: git config core.hooksPath .githooks
```

**Permanent (not recommended):**

```bash
rm .githooks/commit-msg .githooks/pre-commit .githooks/pre-push
```

## Validation Details

### Commit Type Validation

**Valid types:**

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation
- `style` - Code formatting
- `refactor` - Code restructuring
- `test` - Tests
- `chore` - Maintenance
- `perf` - Performance
- `config` - Configuration

### Scope Validation

**Format:** `(scope)` where scope is lowercase functional area

**Examples:** `(auth)`, `(movie)`, `(api)`, `(tests)`, `(types)`

### Context Footer Validation

**Valid formats:**

```bash
# With task list
Context: tasks-[name].md (Task X.Y)
Context: tasks-[name].md (Tasks X.Y-X.Z)
Context: tasks-[name].md (Tasks X.Y, A.B, C.D)
Context: tasks-[name].md (incidental - discovered during Task X.Y)
Context: tasks-[name].md  # No task number for completions

# Without task list
Context: planning (no associated task list)
Context: documentation (no associated task list)
Context: maintenance (no associated task list)
Context: archival prep (no associated task list)
Context: archival (no associated task list)
```

## Hook Maintenance

### Updating Hooks

Hooks are version-controlled in the repository. To update:

```bash
# Edit hooks
nano .githooks/commit-msg

# Make executable if creating new hook
chmod +x .githooks/new-hook

# Commit changes
git add .githooks/
git commit -m "chore(hooks): update commit message validation"
```

### Testing Hooks Locally

**Test commit-msg hook:**

```bash
echo "test message" > /tmp/test-msg
.githooks/commit-msg /tmp/test-msg
```

**Test pre-commit hook:**

```bash
.githooks/pre-commit
```

**Test pre-push hook** (git feeds it `<local ref> <local sha> <remote ref> <remote sha>` lines), here for pushing
`HEAD` to `main`:

```bash
git fetch origin
echo "HEAD $(git rev-parse HEAD) refs/heads/main $(git rev-parse origin/main)" | .githooks/pre-push origin
echo "exit $?"
```

`exit 0` means the push would be allowed; `exit 1` comes with the refusal and the offending paths.

## Related Documentation

- **Commit standards:** `.arc/reference/workflows/supplemental/atomic-commit.md`
- **Work categorization:** `.arc/reference/strategies/strategy-work-categorization.md`
- **Development rules:** `.arc/reference/constitution/DEVELOPMENT-RULES.md`
