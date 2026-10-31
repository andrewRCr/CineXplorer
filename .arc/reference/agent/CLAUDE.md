# CLAUDE.md

Guidance for Claude when working in this repository. For shared rules and architecture, defer to the canonical docs:

- [AGENTS](AGENTS.md) – Project context, lookup guide, and collaboration principles
- [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) v2.17 – Non-negotiable standards
- [QUICK-REFERENCE](../QUICK-REFERENCE.md) v1.2 – Environment context and command patterns
- [Process Task Loop](../workflows/3_process-task-loop.md) – Task interlock and deferred review

## Claude-Specific Notes

- **Session startup:** Follow [session-init.md](../workflows/supplemental/session-init.md): it orients from the
  work unit's session notes and git
- **Path awareness:** Commands in QUICK-REFERENCE assume repo root - adjust them when working from a subdirectory
- **Summaries first:** Lead responses with concise bullet findings before deep dives
- **Clarifying questions:** Offer numbered/lettered options to keep user replies short
- **Large diffs:** If a change won't fit in context, propose a chunking strategy and wait for approval
- **Tooling awareness:** Docker and venv are available - check QUICK-REFERENCE for command patterns
- **Session notes:** State in each report that the pointer fields were updated
- **Console logs:** Browser console logs automatically captured to `backend/logs/frontend.log`.
  Check proactively when debugging frontend issues - no MCP or copy/paste needed. See QUICK-REFERENCE for commands.

## Context Window Management

Follow [DEVELOPMENT-RULES § Session Context Management](../constitution/DEVELOPMENT-RULES.md#session-context-management):
hand off at natural boundaries, and between them let Claude Code compact. The SessionStart hook on compaction runs
`.arc/reference/harness-hooks/compaction-recovery.mjs`, which names what to re-read. The Owner watches context usage;
there are no token thresholds.

## Deferred Review

Working through several tasks without a stop is
[deferred review](../workflows/3_process-task-loop.md#deferred-review): the Owner names the scope ("work through
4.2-4.4 while I'm away"), and its stop conditions still apply. The `/autonomous-work` command opens it with the scope
as its argument.

Claude-specific: before starting each task in the scope, judge whether the remaining context covers that task plus
the Owner's review edits, a commit and a handoff. If unsure, stop at the task boundary with the task list updated:
"Paused for review. Completed Tasks X.Y-X.Z."

## MCP Server Availability

**Project-enabled MCPs (always available):**

- **Chakra UI** (`mcp__chakra-ui__*`) - ALWAYS enabled for this project
    - Use for: Component examples, props, theme queries, v2→v3 migration guidance
    - Prefer over: WebFetch/WebSearch for Chakra documentation
    - Available tools: `get_component_example`, `get_component_props`, `get_theme`, `customize_theme`,
      `list_components`, `v2_to_v3_code_review`
    - When to use: Any Chakra-related questions (component usage, styling, theming, migration)

**Available but disabled by default (request if needed):**

- **Firefox Developer Tools** - Browser automation and debugging
- **Playwright** - Browser automation and testing

These MCPs consume significant tokens when enabled, so they're disabled by default. If you have a legitimate need
(debugging UI issues, testing browser interactions, etc.), ask the user to enable them. Don't assume availability.

## Sub-Agent Availability

**External Research Analyst** - Available for web research and external documentation synthesis.

**When to use:**

- ✅ Researching third-party libraries or best practices
- ✅ Investigating security advisories or error messages from external sources
- ✅ Any web research expected to require 3+ WebFetch calls
- ✅ Tasks requiring synthesis across multiple external sources
- ✅ Gathering context about external APIs, frameworks, or tools

**When NOT to use:**

- ❌ Simple 1-2 WebFetch queries with clear targets (use WebFetch directly)
- ❌ Checking a single documentation page
- ❌ Quick lookups of known information

**Why this matters:** The external-research-analyst agent can autonomously perform multiple fetches, synthesize
information, and handle expanding research scope. Using it for broader research tasks is more efficient than
sequential WebFetch calls in the main conversation.
