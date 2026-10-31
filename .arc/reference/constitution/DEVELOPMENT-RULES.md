# Development Rules - CineXplorer

**Version:** 2.17 | **Updated:** 2026-10-30 | **Hash:** `b8wobidt`

Core development rules and quality standards for CineXplorer. These rules are **non-negotiable** and must be followed
by all contributors, including AI assistants.

**For command patterns and environment context**, see [QUICK-REFERENCE.md](../QUICK-REFERENCE.md).
**For session initialization protocol**, see [session-init.md](../workflows/supplemental/session-init.md).

## Manual Commit Control

- **AI NEVER initiates commits** without explicit user approval or instruction
- **AI CAN execute commits** when user explicitly approves/instructs it
- **User approval required** for all git operations
- **NEVER use `--no-verify`** to bypass commit hooks - hooks exist to catch errors
- **Careful with file reverts**: Before running `git checkout -- <file>` or similar destructive operations,
  check `git diff <file>` to understand ALL uncommitted changes. Your changes may not be the only ones in
  that file - other tasks may have added uncommitted work that will be lost
- **MANDATORY:** Comprehensive task context analysis before any commit consideration (see atomic-commit workflow)
- **Task list accuracy required**: Before commit consideration, verify task documentation reflects completed work
  (parent task marked `[x]` if all subtasks complete)
- **Never commit stale task docs**: Task list updates must be saved and included in commits for completed work
- AI reports completion, then awaits commit instructions
- **Merges need explicit approval**: never infer it from task approval, review completion, passing checks or a
  general "proceed". Never merge with `--admin`
- **Commit message format**: Use the `commit-format` skill for proper format (Context footer, subject length, etc.)

### Quality Gates

**Zero Tolerance Policy:** Whatever checks you run, they must pass. No ignoring failures, no exceptions.

**Tiered Approach:** Quality gates follow a tiered system. The tier determines *what* to run; zero tolerance
determines that it must *pass*. See [Quality Gates Strategy](../strategies/arc/strategy-quality-gates.md)
for complete guidance.

| Tier   | When                                    | What to Run                                                        |
| ------ | --------------------------------------- | ------------------------------------------------------------------ |
| Tier 1 | Per-task                                | Type-check, lint, format, related unit tests (modified files)      |
| Tier 2 | Parent task completion                  | Tier 1 (full project) + targeted E2E tests + build                 |
| Tier 3 | Per-phase, pre-PR                       | Full suite (everything below)                                      |

**Commits and quality gates:** Tiers are milestone-driven, not commit-driven. Work committed through
the task loop inherits the gates already run at each milestone. For work outside the task loop
(incidental fixes, atomic tasks), run at least Tier 1 before committing.

**Full Suite (Tier 3)** - Required for phase completion and pre-PR.
For specific commands, see [QUICK-REFERENCE.md](../QUICK-REFERENCE.md).

1. **Backend Tests**: 100% pass rate
   - **MUST run via Docker** (requires database connection to PostgreSQL/Redis)
   - **Test runner**: pytest (migration complete 2025-10-13, 103/103 tests converted)
   - **NEVER run from host venv** - tests require Docker network access

2. **Frontend Tests**: 100% pass rate
   - Run on host Node (`npm test` in `frontend/`) or in the primary's frontend container

3. **Backend Linting**
   - Use Ruff with auto-fix capability
   - Options: host venv (fast) or Docker (consistent)

4. **Frontend Linting**
   - Run on host Node (`npm run lint` in `frontend/`) or in the primary's frontend container

5. **TypeScript Checking**
   - Run on host Node (`npm run type-check` in `frontend/`, after `npm run typegen`) or in the primary's
     frontend container

6. **Python Type Safety**: Pyright with django-types for minimal Any usage
   - Use Pyright via npx: `npx pyright backend/apps/ backend/config/ --project backend`
   - **IMPORTANT**: Use directories or no args, NOT individual files (config may not apply)
   - Optional: type check script for comprehensive per-app reporting
   - **PROHIBITED**: Using `typing.Any` except for external API payloads (TMDB, etc.)
   - **REQUIRED**: Use `object` for unknown data, `dict[str, object]` for generic dictionaries
   - **JUSTIFICATION**: Any `Any` usage must have inline comment explaining necessity
   - **Full guidelines**: See [Type Safety Strategy](../strategies/project/strategy-type-safety.md) for complete strategy
   - **Stub maintenance**: `backend/stubs/` must stay in sync with dependency versions (see strategy doc)

7. **Markdown Linting**
   - Use markdownlint-cli2 via npx with auto-fix
   - Config: `.markdownlint-cli2.jsonc` (MD034 bare URLs disabled only for temporal docs)
   - Excluded by the config's `ignores` list: the archive, the personal workspace (`.arc/user/*/`) and the root
     README

### Quality Gate Failure Protocol

If quality gates fail after a task:

- **The gate never ran:** a wrong invocation (bad path, wrong container, a service not running) is not a gate
  failure. Correct it and re-run; there is nothing to decide.
- **Mechanical, inside the change:** a failure you own, inside the approved change, with an obvious fix (a trailing
  blank line, auto-fixable lint, a type error you just introduced): fix it, re-run, and name the correction in the
  report.
- **Otherwise:** report the details and the suspected cause, and ask whether to fix now or defer. Don't proceed
  until it is resolved or the Owner approves.

**A green rerun after an intermittent failure shows only that the failure is intermittent.** A fix names the
mechanism it removes and shows the change reaches it, such as a reproduction that fails reliably without the change
and passes with it; until then, report the cause as suspected.

**A red gate is never reported green, and never bypassed.** Report a gate from a run, never from memory or from
checked task boxes.

### Leave It Cleaner: Pre-existing Issue Protocol

**Principle:** Take responsibility for issues you find in the course of work: fix them or capture them, never drop
them silently. Whether a fix rides the current change is decided by concern, not by file.

**Same concern** (an issue in what the current change is already about):

- **Minor** (< 5 minutes): fix it inline and name it in the completion report
- **Moderate** (5-15 minutes): fix it inline and note it in the commit message
- **Major** (> 15 minutes): ask whether to fix now or defer

Judge by total attention cost, not raw fix time. An issue that needs a switch into unfamiliar code or another domain
is major whatever its fix time: surface it rather than leaving the current task.

**A different concern** that only shares a file you're editing does not ride the current change, however small the
fix, and is never written into a tracked file on the current branch. Propose where it goes, and the Owner decides:

- **Bounded** (one self-contained fix): run it now as an errand
  ([run-errand.md](../workflows/supplemental/run-errand.md)), or capture it in the inbox
  ([user-inbox.md](../workflows/supplemental/user-inbox.md)), where it waits until it runs
- **Multi-step:** an incidental task list ([manage-incidental-work.md](../workflows/supplemental/manage-incidental-work.md)),
  started now only if the Owner pauses the current work; otherwise capture it
- Work that belongs to an existing PRD or backlog plan is captured with that document as its target

Distinct concerns never share a PR either, even on a shared file: sequence them.

**Never** ignore an issue silently, or leave a deferred one only in completion notes or session notes.

## Proportionality

Every material mechanism (in a design, an implementation, a proposed fix, a review response) traces to a stated goal,
a real constraint, an actual trust boundary or an observed failure. Plausibility, thoroughness, symmetry and imagined
threat models are not requirements. Prefer composing what exists over new mechanism. Concentrate rigor where failure
is destructive, authoritative or irreversible; advisory and retryable paths get lighter handling. The same trace
bounds simplification: never drop behavior it marks as required.

A PRD's Scope is a commitment: unrequested capability is a scope decision, not engineering taste. Propose the smallest
complete in-scope response to a finding or request on its own. Anything beyond it is a separate proposal, named as a
scope expansion, that lands only through a PRD amendment, with the Owner deciding. Finishing what a change requires
(callsites, migrations, tests) is completion, not expansion. At planning stages the deep check is
[assess-design-proportionality](../methods/assess-design-proportionality.md); everywhere else, apply this trace as one
judgment.

## Session Documentation Control

Session state lives in the gitignored personal workspace ([README](../../user/README.md)).

- **Pointer fields** at the top of the work unit's `SESSION-NOTES.md`: the agent updates them at every task and phase
  stop and says so in the report. They need no approval
- **Notes sections:** written only at a handoff the Owner asks for
  ([session-handoff.md](../workflows/supplemental/session-handoff.md)), replaced whole
- **Working memory:** an entry is proposed when it arises, at the latest at the next report, and added only on the
  Owner's approval; entries are pruned at each handoff

## Verification Protocol

**Principle:** Wrong information is worse than no information - it wastes time and breaks trust.

**When uncertain about implementation details, file locations, or existing content:**

1. **Search first:** Use Grep/Glob/Read to verify from source
2. **Ask clarifying questions:** When you understand the request but design decisions need input
3. **Stop and ask:** If still unclear after searching

**Never generate or assume:**

- File paths or directory structure (use Glob)
- What code "probably does" (read the actual implementation)
- Task phase content or summaries (read the task list)
- Implementation approaches without understanding requirements

**On clarifying questions:**
When you mostly understand a request but see ambiguities, edge cases, or design alternatives that need decisions - ask.
Examples: "Should this handle empty states?" "Do we want this cached?" "Which takes precedence if both conditions are
true?" These questions improve outcomes for both code and documentation work.

**Why this matters:** Made-up content in documentation misleads future work. Assumed behavior in code wastes debugging
time. Verification takes seconds; fixing wrong assumptions takes hours.

### Recommend on Advisory Forks

When raising an advisory choice (accept or decline, this or that) rather than a mandatory approval, state the
recommended option with a one-line reason; never a bare fork. The Owner still decides.

## Strategy Document Protocol

**Before implementing work in codified domains, consult the relevant strategy document.**

See [STRATEGY-INDEX.md](../strategies/STRATEGY-INDEX.md) for complete list of available strategies (read every session
during initialization).

**Process:**

1. Identify if your work touches a domain with codified guidance (theming, auth, testing, layout, etc.)
2. Grep the strategy doc for your specific topic (e.g., `grep -i "button patterns" strategy-component-styling.md`)
3. Read relevant section(s) before implementing
4. Follow documented patterns and token usage

**When uncertain if strategy applies:** Ask. "Does this work touch [domain] where we have strategy guidance?"

**For large multi-topic strategies** (e.g., `strategy-component-styling.md`): Search for specific component/pattern
rather than reading entire document.

**Why this matters:** Strategy docs codify decisions, patterns, and token systems. Following them ensures consistency and
prevents rework when non-standard approaches are caught in review.

## Session Context Management

**Principle:** Work quality never bends to context pressure. Sessions are bounded: they start from the session notes
and end with a handoff the Owner asks for.

- **Hand off at natural boundaries:** a finished work unit or phase, or a clean commit point with no immediate next
  step. Also hand off when quality slips (losing track of earlier decisions, needing more correction than before): a
  fresh session with good notes beats a long degraded one
- **Compact and recover between boundaries:** when context runs low mid-work, let the harness compact; the recovery
  hook names what to re-read, and the summary covers only the current work locus. When the pressure arrives at a
  boundary, hand off instead
- **Context monitoring is the Owner's:** the harness shows usage, and the agent's own estimate is a backstop, not the
  trigger
- Finish the current edit before stopping; **never** degrade work quality or make "efficiency" trade-offs because of
  context size

**Ending a session:** commit complete work ([atomic-commit](../workflows/supplemental/atomic-commit.md)), leave partial
work uncommitted, and hand off with the notes describing it. When commits can't happen first, the notes' Uncommitted
Work carries commit-level detail and the next session commits from it.

## Core Document Reference Protocol

Core documents (QUICK-REFERENCE, DEVELOPMENT-RULES) are read each session but should be re-checked when triggered.

**QUICK-REFERENCE - Re-check when:**

- Bash command fails with path/environment errors (ENOENT, "no such file or directory", "config not found")
- About to run quality gate commands and uncertain which tool/path to use (Docker vs host? Which flags?)
- **About to run TypeScript type checks** - Verify exact command (NEVER use `npx tsc` directly, ALWAYS use `npm run type-check`)
- Working directory context feels uncertain or commands aren't working as expected

**DEVELOPMENT-RULES - Re-check when:**

- Uncertainty about quality standards (what's the zero-tolerance policy? which gates are required?)
- Approaching context limits (verify Session Context Management protocol and agent-specific guidance)
- Confusion about verification, strategy, or task management protocols

**Don't re-check for:**

- Operations with dedicated workflow docs (commit operations, session handoffs, etc; workflows are authoritative, not DEVELOPMENT-RULES)

**Why this matters:** Session-start reading establishes baseline context. Trigger-based re-checking ensures accuracy
when specific patterns/commands are needed. Active verification beats passive recall, especially later in long sessions.

## Task Management Protocol

### Task Interlock

- **One task per review increment:** each checkbox is one increment. Complete it, mark it, report, and stop for
  approval before advancing or committing
- **Deferred review** widens the increment only when the Owner opens it: by naming a scope, or by approving the
  agent's proposal to review a parent's tightly coupled subtasks as one. It is a bounded convenience, not an autonomy
  mode, and its stop conditions still apply
- **Implied permission**: User approval implies permission to proceed UNLESS explicitly stated otherwise
  (e.g., "that's done, but before moving on..."). Address such concerns before proceeding to the next task.
- **Full protocol:** [Task Processing Workflow](../workflows/3_process-task-loop.md)

### Design Before Implementation

Settle every settleable design decision in the PRD before implementation starts. A design question that surfaces
during a task stops it and goes back to the PRD
([1_create-prd.md § Amending a PRD](../workflows/1_create-prd.md#amending-a-prd)); it never becomes debt in code or
notes.

### Task Granularity

Break a task into subtasks if it requires:

- Multiple interdependent changes
- Complex debugging/investigation

### Sub-agent Scope

Delegation follows function. Two things hold whatever delegates: the Owner stays involved in each change as it
forms, and judgment stays with the primary agent.

- **Derivation** (read-only: search, research, review, finding generation): freely delegable. Outputs are advisory
  until the primary verifies them against source
- **Execution** (work that lands in the change): stays with the primary, unless the Owner explicitly approves
  otherwise
- **Judgment** (validation against ground truth, gates, commits): never delegated

Run an independent review in a fresh subagent when the harness supports one: fresh context, at the primary's own
capability by default, with read-only tools. Without subagents, skip it with a note (delegated review is advisory) or
run it in a fresh session; never present a review in the primary's own context as independent.

### Review Findings

Verify every review finding against source with your own judgment, whoever raised it; reviewer and subagent output
is advisory. Present the complete proposed disposition set and get approval before applying any finding-driven fix
([agent-pre-merge-review.md](../workflows/supplemental/agent-pre-merge-review.md)).

### Test-First Protocol

**BEFORE implementing any sub-task, assess test-first requirement:**

**Requires test-first** (write tests BEFORE implementation):

- New models (Django models, data schemas)
- New API endpoints or endpoint modifications
- New service classes or business logic
- Complex algorithms or data transformations
- Non-trivial validation or processing logic

**Test-after acceptable**:

- Simple CRUD operations with no custom logic
- Presentational UI components
- Configuration file changes
- Trivial refactoring (renaming, moving files)
- Documentation-only changes

**If unsure whether test-first applies, default to test-first.** Writing tests after implementation is harder and less effective.

**During task list creation:** Ensure test sub-tasks appear BEFORE implementation sub-tasks for test-first work.
This makes the protocol visible during execution.

## Testing Requirements

- **Test-first protocol**: See Task Management Protocol section above for when to write tests before vs. after implementation
- **Integration focus**: Prefer flow-level coverage over isolated units when practical
- **All tests must pass** before any commit discussion (see quality gates above)
- **Command patterns**: See [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) for execution commands
- **Detailed guidance**: See [Testing Methodology Strategy](../strategies/project/strategy-testing-methodology.md)

## Code Quality Principles

Apply standard software engineering principles:

- **DRY** (don't repeat yourself)
- **SOLID** (single responsibility, open/closed, dependency inversion)
- **KISS** (keep it simple)
- **YAGNI** (you aren't gonna need it)

Separate concerns, prefer composition over duplication, favor readability when principles conflict.

### Layered Architecture (Backend)

Backend uses strict layered architecture: API routes handle HTTP concerns only, Service layer contains ALL
business logic (filtering, calculations, presets, orchestration).

**Rule of thumb:** If an API route does more than extract params → call service → return response, the extra
logic likely belongs in Service layer.

### Component Styling Standards (Frontend)

Frontend uses semantic token system for all styling. Components MUST use semantic tokens, never hardcoded colors or
direct style values.

**Required practices:**

- Always use semantic tokens (e.g., `color="tertiary"`, `bg="layer-01"`)
- Never hardcode colors (`color="#4299e1"`, `bg="blue.500"`)
- Never use Chakra raw color tokens (`color="red.600"`, `colorScheme="blue"`)
- Use recipes and wrapper components for consistent patterns
- Reference strategy docs before implementing: [Color Token System](../strategies/project/style/strategy-color-tokens.md),
  [Component Styling Strategy](../strategies/project/style/strategy-component-styling.md)

**Rule of thumb:** If you're writing inline color/style values instead of semantic tokens, check the strategy
docs for the correct pattern.

### Import Standards (Frontend)

Use absolute imports (`@/`) for cross-directory references and relative imports (`./`) for same-directory references.

**Examples:**

- ✅ `import { foo } from "@/services/apiClient"` (from hooks/ to services/)
- ✅ `import { bar } from "./httpService"` (within services/)
- ❌ `import { foo } from "../services/apiClient"` (cross-directory relative)

**Why:** Absolute imports are resilient to file moves and make import paths self-documenting. The `@/` alias maps
to `src/`, configured in `tsconfig.json` and `vite.config.ts`.

### Code Documentation Standards

- **No meta-project references in code**: Never reference planning IDs (task IDs, phase numbers, requirement IDs,
  PRD section citations), the named processes, methods or workflows that organize the work, or `.arc/` paths in code,
  tests, or durable documentation outside `.arc/` (READMEs, docs, config comments). This covers comments,
  docstrings, identifiers, test names and prose. A citation that justifies code by appeal to a process artifact ("per
  the test-first method", "implements the PRD") couples the code to a document with its own schedule: say what the
  code does instead, and put process rationale in the PRD, task list, ADR or the commit's `Context:` footer.
  Substantive references (test names describing behavior, comments on non-obvious invariants) stay.

- **References to `.arc/` work documents**: PRDs, task lists, notes and completion docs move between `backlog/`,
  `active/` and `archive/`, so:
    - **To one:** backticked filename only, no links or paths, from anywhere. For tasks, include the task ID and the
      task-list filename: "Task 8.3 - `tasks-oauth-headless-migration.md`"
    - **From one:** no relative-path links, even to stable docs; its own path changes when it moves

  Code and PR text never reference them, except one commit-pinned link to the PRD from a PR whose diff contains it;
  a commit references them only in its `Context:` footer.

- **Write for the reader, not the author**: When removing or restructuring content, don't leave notes explaining
  what was removed or where it went; document what is. History belongs in commit messages and task-list completion
  notes. The same holds for PR descriptions and handoffs: they describe what the change delivers, not the author's
  workflow state.

- **Commit and PR surface language**: Commit prose reads as the operation performed, legible without this
  repository's process vocabulary; traceability (task IDs, phases) goes in the `Context:` footer. Before writing any
  PR title or body, load [pull-request-format](../methods/pull-request-format.md): the repository is public, so PR
  text carries no process vocabulary, `.arc/` references (except the one commit-pinned PRD link) or review metadata.

- **Collaborative voice in documentation**: Commits, task lists, and project docs should read
  naturally from an author or team perspective. Avoid third-person references to collaborators;
  write as the work's author would.

## Architecture Documentation

### Architecture Decision Records (ADRs)

Document significant architectural decisions in ADRs (`.arc/reference/adr/`). ADRs capture the context,
decision, and consequences of important design choices, serving as historical record and reference for
understanding system constraints.

**Write an ADR when:**

- Decision affects system structure or external contracts
- Multiple alternatives were considered
- Decision driven by external constraint (API limitations, regulatory requirements)
- Future developers will ask "why did we do it this way?"
- Decision could be reversed later (context needed for reversal)

**Don't write an ADR for:**

- Purely tactical implementation choices (variable names, loop constructs)
- Decisions obvious from reading code (standard CRUD, framework conventions)
- Temporary or experimental choices

**Format and guidance:** See [ADR Methodology Strategy](../strategies/arc/strategy-adr-methodology.md)
**Template:** See `.arc/reference/adr/adr-template.md`

ADRs are immutable once accepted - new decisions require new ADRs that supersede old ones.

## Reference Documentation

This document provides core rules and standards. See related documentation:

- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Environment context, command patterns, and tool usage
- [Task Processing Workflow](../workflows/3_process-task-loop.md) - Detailed task execution workflow
- [Methods](../methods/README.md) - Review, planning and pull-request methods the workflows run
- [Atomic Commit Workflow](../workflows/supplemental/atomic-commit.md) - Enhanced commit workflow with task context analysis
- [AI Agent Reference Card](../agent/AGENTS.md) - Complete project context for AI
- [Technical Overview](TECHNICAL-OVERVIEW.md) - High-level system architecture and technology stack
- [ADR Methodology Strategy](../strategies/arc/strategy-adr-methodology.md) - Architecture decision record guidance
- [Type Safety Strategy](../strategies/project/strategy-type-safety.md) - Type checking approach and patterns
- [Testing Methodology Strategy](../strategies/project/strategy-testing-methodology.md) - Testing philosophy and practices
