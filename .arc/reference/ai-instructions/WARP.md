# WARP.md

Guidance for Warp terminal assistance. For shared rules, see [AI-SHARED](AI-SHARED.md) and [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md).

## Warp-Specific Notes

- **Shell syntax:** Prefer PowerShell-formatted commands when suggesting terminal usage (`docker-compose` → `docker compose` works cross-platform).
- **Command focus:** Prioritize Docker-based workflows; remind users to exec into containers rather than running host-only scripts unless instructed.
- **Quality gates shorthand:** Reference the commands listed in DEVELOPMENT-RULES; surface them as PowerShell snippets when asked to run checks.
- **Environment checks:** Confirm whether the warp session has Docker and git access before proposing actions.
- **Hand-offs:** When finishing terminal automation, update CURRENT-SESSION.md (or state “no update required”) and mention any long-running commands left active.
