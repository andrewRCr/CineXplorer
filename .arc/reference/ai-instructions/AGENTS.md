# AI Usage Quick Start

Use this checklist for any AI agent (Claude, Gemini, Warp, Copilot, etc.). All rules and workflows live in the canonical docs—don't copy them here.

1. **Load current context**
   - Read `.arc/active/CURRENT-SESSION.md` for branch, PRD, tasks, notes
   - **Execute Session Startup Protocol** (in CURRENT-SESSION.md): Verify working directory, Docker status, venv availability, path context
   - Open the referenced task list (and PRD/notes as needed)

2. **Review the core authorities**
   - [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) v2.6 – Quality gates, approvals, error handling
   - [QUICK-REFERENCE](../QUICK-REFERENCE.md) v1.0 – Environment context, path patterns, command examples (repo root perspective)
   - [Process Task Loop](../workflows/3-process-task-loop.md) – One subtask at a time, documentation protocol

3. **Reference shared background when needed**
   - [AI-SHARED](AI-SHARED.md) – Stable project snapshot and canonical references
   - [TECHNICAL-ARCHITECTURE](../constitution/TECHNICAL-ARCHITECTURE.md) – Architecture, testing, type safety
   - [META-PRD](../constitution/META-PRD.md) / [PROJECT-STATUS](../constitution/PROJECT-STATUS.md) – Product vision & current progress

4. **Follow platform notes**
   - Tool-specific tips live in `CLAUDE.md`, `GEMINI.md`, `WARP.md`, `copilot-instructions.md`

5. **Work the plan**
   - Execute the current subtask, run required checks, update docs, pause for approval
   - **Path awareness**: Commands in QUICK-REFERENCE assume repo root - adjust paths based on your current working directory from Session Startup Protocol
   - Never initiate commits; use [atomic-commit workflow](../workflows/supplemental/atomic-commit.md) only when explicitly approved
