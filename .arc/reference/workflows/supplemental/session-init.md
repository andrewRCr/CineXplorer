# Workflow: Session Initialization

**Purpose**: Establish complete AI context at session start, ensuring the AI has all necessary environment information,
project context, and behavioral guidance before beginning work.

**When to use**: Every session start (resuming features, starting new work, handling incidental tasks, etc.)

## Steps

### 1. Verify Environment

**Check working directory:**

```bash
pwd
# Expected: /home/andrew/dev/CineXplorer (repo root)
# Or: backend/, frontend/ subdirectories if working in specific context
```

**Verify Docker status:**

```bash
docker ps | grep infrastructure | wc -l
# Expected: 5 (backend, frontend, redis, caddy, postgres)
```

**Confirm venv availability:**

```bash
ls .venv-backend/bin/ | grep -E "(ruff|pytest)" | wc -l
# Expected: 2+ (ruff and pytest at minimum)
```

### 2. Load AI Context (read in order)

**Read these documents to establish complete context:**

1. `.arc/reference/ai-instructions/AGENTS.md`
   - Project overview and technology stack
   - Quick lookup guide for finding information
   - AI collaboration principles

2. `.arc/active/CURRENT-SESSION.md`
   - Current branch and feature context
   - Last completed work and next action
   - Blockers and outstanding questions

3. **Active task list** (path referenced in CURRENT-SESSION.md)
   - Detailed subtask structure and completion status
   - Implementation notes and technical decisions
   - Relevant files and success criteria
   - Example: `.arc/active/feature/tasks-api-layer-modernization-p2.md`

4. `.arc/reference/workflows/3-process-task-loop.md`
   - One-subtask-at-a-time workflow
   - Task execution protocol
   - Quality gate requirements per subtask
   - Documentation update protocol

5. `.arc/reference/constitution/DEVELOPMENT-RULES.md`
   - Quality gate requirements
   - Commit standards and protocols
   - AI collaboration rules

6. `.arc/reference/QUICK-REFERENCE.md`
   - Environment-specific command patterns
   - Quality gate commands
   - Path context and common workflows

### 3. Acknowledge Orientation

State your understanding to confirm successful initialization:

- **Working directory**: Repository root (`/home/andrew/dev/CineXplorer/`)
- **Runtime status**: Docker containers (5 running: backend, frontend, redis, caddy, postgres)
- **Tool availability**: venv tools available at `.venv-backend/bin/` (ruff, pytest)
- **Quality policy**: Zero-tolerance for linting violations, 100% test pass rate
- **Reference versions**: DEVELOPMENT-RULES v2.7 (hash: h3n5p8r2), QUICK-REFERENCE v1.1

### 4. Ready to Proceed

With context loaded:

1. Review next action from CURRENT-SESSION.md
2. Check for blockers that need resolution
3. Await user instruction - do not start work until user provides direction

---

**Version**: 2025-10-19
