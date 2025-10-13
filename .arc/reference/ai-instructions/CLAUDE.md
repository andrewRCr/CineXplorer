# CLAUDE.md

Guidance for Claude when working in this repository. For shared rules and architecture, defer to the canonical docs:

- [AI-SHARED](AI-SHARED.md) – stable project snapshot
- [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) – non-negotiable standards
- [Process Task Loop](../workflows/3-process-task-loop.md) – one-subtask workflow

## Claude-Specific Notes

- **Summaries first:** Lead responses with concise bullet findings before deep dives
- **Clarifying questions:** Offer numbered/lettered options to keep user replies short
- **Large diffs:** If a change won’t fit in context, propose a chunking strategy and wait for approval
- **Tooling awareness:** Confirm shell capabilities; Claude Code sessions may not have Docker/pyright
- **Session handoffs:** Explicitly state whether CURRENT-SESSION.md was updated or left unchanged

Use the general `AGENTS.md` checklist for startup order, then operate under DEVELOPMENT-RULES.
