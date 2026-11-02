# ADR-022: Retire the Maintained Project Status Dashboard

## Status

Accepted (2026-11-01)

## Context

`PROJECT-STATUS.md` duplicated current work, priorities and completion history from other records. Its contents
became stale, and refreshing it would retain a second summary that could drift again.

[ADR-021](adr-021-capture-in-a-personal-inbox.md) included checking this dashboard in the optional backlog pass.
That part of the accepted decision needs to change along with the live workflows.

## Decision

We will retire `.arc/reference/constitution/PROJECT-STATUS.md` and remove its live read, update, initialization and
navigation requirements.

We will read current work from active task lists and their branches and pull requests, and completed work from
archived records and Git history. Intended priorities and dependencies come from the Owner and the relevant plans.

This supersedes only ADR-021's inclusion of PROJECT-STATUS in the optional backlog pass. Its personal inbox,
Owner-approved routing and remaining backlog checks continue to apply. Historical ADRs and archived work records
remain intact.

## Consequences

### Positive

- Development workflows no longer maintain a duplicate project-wide progress summary.
- Current work and completion history are read from the records that already track them.

### Negative

- There is no consolidated tracked dashboard; a project-wide picture requires consulting the relevant records.
