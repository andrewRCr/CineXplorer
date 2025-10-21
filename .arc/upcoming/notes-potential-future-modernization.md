# Potential Future Modernization Backlog Notes

This note captures cross-cutting follow-ups to revisit after the core modernization phases
(authentication → API Layer Phase 2 → backend → frontend) are underway.
Use it as the starting point when planning post-backend tasks or preparing a deployment-readiness push.

## Deployment Enablement

- Draft a deployment/runbook PRD outlining hosting target, environment provisioning, secrets rotation, migration
  strategy, smoke-test checklist, and rollback approach after backend modernization stabilizes.
- Inventory external integrations (ZeptoMail, Google/GitHub OAuth, Celery/Redis) with required environment variables
  and credential rotation steps so the release story reads production-ready.

## Observability & Runtime Guardrails

- Extend logging foundations with metrics/tracing (e.g., Prometheus/OpenTelemetry) and basic alerting targets;
  decide whether this belongs in backend modernization or a follow-up task.
- Select an error-reporting tool (Sentry/Rollbar) and define shared instrumentation patterns so frontend modernization
  ties into the same pipeline.

**Authentication Security Alert Thresholds**

- **Context:** During security updates (Task 4.3.3), deferred implementing automatic alert thresholds for multiple
  blacklisted token reuse attempts
- **Current solution:** Individual WARNING logs for each reuse attempt with full forensic data (user_id, IP, user_agent)
- **Deferred feature:** Automatic alerting when N reuse attempts occur within time window
  (potential credential theft or attack pattern)
- **Implementation options evaluated:**
    - In-memory counter: Simple but non-persistent, doesn't scale across instances
    - Redis-based counter: Production-ready, scales, but adds complexity
    - Monitoring dashboard integration: Holistic approach with metrics, dashboards, incident response
- **Decision rationale:**
    - Current logging provides complete audit trail for manual review and forensics
    - Alert thresholds should be designed holistically with observability infrastructure
    - Over-engineering now creates technical debt vs. proper observability design later
    - Security already strong: token rotation, auto-blacklist, comprehensive logging
- **When to revisit:**
    - During observability sprint when implementing monitoring dashboards
    - When establishing incident response workflows and SLOs
    - When adding centralized log aggregation (ELK, Datadog, etc.)
    - If manual log monitoring becomes operational burden
- **Implementation guidance for future:**
    - Use Redis for counter storage (already available from Task 3 rate limiting)
    - Track attempts by user_id + IP combination with sliding time window (e.g., 5 attempts in 15 minutes)
    - Trigger elevated log level (ERROR/CRITICAL) or external alert (PagerDuty, Slack)
    - Consider automatic account lockout after extreme threshold (e.g., 10 attempts)
    - Integrate with SIEM/security monitoring if available
- **Reference:** tasks-incidental-security-updates.md Task 4.3.3
- **Tracking date:** 2025-10-10

## Security & Compliance Hygiene

- Document dependency scanning cadence and tooling (GitHub Dependabot, pip-audit) plus expectations for handling advisories.
- Capture secrets-management guidance (where secrets live locally vs. production, rotation frequency)
  and a lightweight incident-response checklist for portfolio reviewers.

## Documentation & Onboarding

- Plan a refreshed "Getting Started" + architecture evolution guide once modernization phases land,
  including diagrams that show DRF→Django Ninja and custom auth→django-allauth transitions.
- Ensure README/tech-architecture docs call out new quality gates (mypy —strict, Celery workers,
  Playwright) so onboarding reflects the final stack.

## Type Safety & Code Quality Improvements

**Python Protocol Classes for Type Abstraction**

- **Context:** During Task 8 (Core app type fixes), identified 4 type ignores for mock object support in test infrastructure
  (tmdb_api_client.py headers handling)
- **Current solution:** Documented type ignores with inline explanations (pragmatic, low maintenance)
- **Alternative:** Python Protocol classes (e.g., `HeaderLike` protocol) for structural typing
- **Decision criteria:** Only consider Protocols when you have 2+ concrete implementations of a concept or
  building plugin/extension systems
- **Threshold:** If same type ignore pattern appears across 3+ places, reassess if Protocol would reduce complexity
- **When to revisit:**
    - Adding multiple HTTP client implementations (requests, httpx, aiohttp)
    - Implementing domain layer with repository pattern abstractions
    - Building plugin/extension systems (payment processors, notification backends)
    - Supporting multiple OAuth providers in headless implementation
- **Current verdict:** Not justified for current scale - documented type ignores cheaper and clearer
- **Reference:** strategy-type-safety.md emphasizes "Low maintenance" - Protocols add ~10 lines overhead
  vs 4 lines of documented ignores
- **Tracking date:** 2025-10-09

## Portfolio Storytelling & Metrics

- Record before/after metrics for each modernization phase (type errors, coverage, response times) to highlight
  measurable improvements in the case study write-up.
- Outline a final retrospective section for the portfolio site or README summarizing modernization lessons learned
  and next opportunities.

### Suggested Revisit Point

Re-evaluate this list immediately after backend modernization completes, then fold the prioritized items into formal PRDs
or task lists as scope solidifies.
