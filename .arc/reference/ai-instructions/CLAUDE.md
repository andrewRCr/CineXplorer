# CLAUDE.md

Guidance for Claude when working in this repository. For shared rules and architecture, defer to the canonical docs:

- [AI-SHARED](AI-SHARED.md) – Stable project snapshot and canonical references
- [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) v2.6 – Non-negotiable standards
- [QUICK-REFERENCE](../QUICK-REFERENCE.md) v1.0 – Environment context and command patterns
- [Process Task Loop](../workflows/3-process-task-loop.md) – One-subtask workflow

## Claude-Specific Notes

- **Session startup:** Execute Session Startup Protocol in CURRENT-SESSION.md first (verify working directory, Docker, venv, paths)
- **Path awareness:** Commands in QUICK-REFERENCE assume repo root - adjust based on current working directory from Session Startup Protocol
- **Summaries first:** Lead responses with concise bullet findings before deep dives
- **Clarifying questions:** Offer numbered/lettered options to keep user replies short
- **Large diffs:** If a change won't fit in context, propose a chunking strategy and wait for approval
- **Tooling awareness:** Docker and venv are available - check QUICK-REFERENCE for command patterns
- **Session handoffs:** Explicitly state whether CURRENT-SESSION.md was updated or left unchanged

Use the general `AGENTS.md` checklist for startup order, then operate under DEVELOPMENT-RULES.
