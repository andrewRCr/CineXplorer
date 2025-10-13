# AI Usage Quick Start

Use this checklist for any AI agent (Claude, Gemini, Warp, Copilot, etc.). All rules and workflows live in the canonical docs—don’t copy them here.

1. **Load current context**
   - Read `.arc/active/CURRENT-SESSION.md` for branch, PRD, tasks, notes
   - Open the referenced task list (and PRD/notes as needed)

2. **Review the two authorities**
   - [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) – quality gates, approvals, error handling
   - [Process Task Loop](../workflows/3-process-task-loop.md) – one subtask at a time, documentation protocol

3. **Reference shared background when needed**
   - [AI-SHARED](AI-SHARED.md) – stable project snapshot
   - [TECHNICAL-ARCHITECTURE](../constitution/TECHNICAL-ARCHITECTURE.md) – architecture, testing, type safety
   - [META-PRD](../constitution/META-PRD.md) / [PROJECT-STATUS](../constitution/PROJECT-STATUS.md) – product vision & current progress

4. **Follow platform notes**
   - Tool-specific tips live in `CLAUDE.md`, `GEMINI.md`, `WARP.md`, `copilot-instructions.md`

5. **Work the plan**
   - Execute the current subtask, run required checks, update docs, pause for approval
   - Never initiate commits; use [atomic-commit workflow](../workflows/atomic-commit.md) only when explicitly approved
