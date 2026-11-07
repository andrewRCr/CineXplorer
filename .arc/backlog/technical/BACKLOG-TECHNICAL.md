# Technical Backlog

**Purpose:** Organized collection of technical improvement ideas that will become work units.

**Structure:** Use domain-based sections. When scope is defined, graduate to:

- `plan-{name}.md` (planning/analysis phase)
- `prd-{name}.md` (ready for task generation, delete plan file)

Then **delete** the item from this file (no strikethrough clutter).

**This file contains ONLY non-atomic ideas** - a simple one-off is an errand: it runs now or waits in the personal
inbox until it runs.

---

## Backend Architecture

- **Dependency Injection Framework Evaluation** - Consider adopting a DI framework (e.g., python-dependency-injector,
punq, or injector) to replace manual service factory patterns. Current state: Centralized mock path constants reduce
string duplication but coupling remains. Benefits: Eliminate remaining mock path strings entirely, simplify test setup
with automatic mock injection, enable easier service swapping for testing. Trade-offs: Added complexity, learning curve.
Evaluate when: Adding new service layers, significant test infrastructure work, or when mock paths exceed 20+ constants.
See Task 6.3.e (`tasks-service-layer-modernization.md`) for context on current centralized approach.

## Frontend Architecture

<!-- Technical ideas for frontend structure, state management, patterns -->

## Infrastructure & DevOps

- **Deployment Enablement** - Draft deployment/runbook PRD outlining hosting target, environment provisioning, secrets
rotation, migration strategy, smoke-test checklist, and rollback approach. Inventory external integrations(ZeptoMail,
Google/GitHub OAuth, Celery/Redis) with required environment variables and credential rotation steps.

- **Observability & Runtime Guardrails** - Extend logging foundations with metrics/tracing
(e.g., Prometheus/OpenTelemetry) and basic alerting targets. Select error-reporting tool (Sentry/Rollbar) and define
shared instrumentation patterns so frontend ties into same pipeline.

## Testing & Quality

- **Mobile Responsiveness Remediation** - Address mobile viewport layout, touch interaction, and functional parity
issues.

- **Python Protocol Classes for Type Abstraction** - Consider using Python Protocol classes for structural typing when
pattern appears across 3+ places. Current verdict: 4 documented type ignores in test infrastructure cheaper than
Protocol overhead. Revisit if: adding multiple HTTP client implementations, implementing repository pattern
abstractions, building plugin/extension systems, or supporting multiple OAuth providers in headless implementation.
See `strategy-type-safety.md` for threshold criteria.

## Performance & Optimization

<!-- Technical ideas for performance improvements, caching, optimization -->

## Security & Privacy

- **Security & Compliance Hygiene** - Document dependency scanning cadence and tooling (GitHub Dependabot, pip-audit)
plus expectations for handling advisories. Capture secrets-management guidance (where secrets live locally vs.
production, rotation frequency) and lightweight incident-response checklist for portfolio reviewers.

- **Authentication Security Alert Thresholds** - Implement automatic alerting when N reuse attempts occur for blacklisted
tokens within time window (potential credential theft). Current: Individual WARNING logs with forensic data.
Future: Redis-based counter with sliding window, integrate with monitoring dashboards and incident response workflows.
See tasks-incidental-security-updates.md Task 4.3.3 for context.

## Developer Experience

- **Documentation & Onboarding** - Plan refreshed "Getting Started" + architecture evolution guide once modernization
phases land. Include diagrams showing DRF→Django Ninja and custom auth→django-allauth transitions. Ensure
README/TECHNICAL-OVERVIEW docs call out new quality gates (Pyright strict, Celery workers, Playwright) so onboarding
reflects the final stack.

- **Portfolio Storytelling & Metrics** - Record before/after metrics for each modernization phase (type errors,
coverage, response times) to highlight measurable improvements in case study write-up. Outline final retrospective
section for portfolio site or README summarizing modernization lessons learned and next opportunities.

## Unsorted

<!-- Temporary holding area - sort into sections at the drain -->
