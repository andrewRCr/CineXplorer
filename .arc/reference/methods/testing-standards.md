---
name: testing-standards
description: Execution-time testing discipline applied when a task writes or modifies tests
related:
  - test-first
override-active: true
override-mode: extend
---

<!--
Vendored from arc-framework .arc/system/methods/testing-standards.md at a49ebba40. The default text is verbatim;
out-of-set link targets are retargeted per README.md § Link map; CineXplorer changes live only in §
testing-standards.override.
-->

# Method: testing-standards

> - **Workflow:** [process-task-loop.md][process-task-loop]
> - **When:** A task writes or modifies tests — the self-gating trigger; inert otherwise
>
> - **Contract:** Tests verify observable behavior through faithful boundaries, fail before they pass, and
>   cover error and boundary paths.
> - **Related:** [test-first](test-first.md) — the two methods partition the testing apparatus along the
>   planning / execution seam, so overriding one should prompt review of the other.

## testing-standards.override

Applied on top of `.default` (`override-mode: extend`), instantiated for CineXplorer: a Django + pytest backend and a
React + Vitest frontend. This replaces arc-framework's own project override.

- **Backend tests run in Docker** against Postgres and Redis (`docker compose ... exec backend nice -n 15 pytest`,
  per QUICK-REFERENCE), never from the host venv.
- **Boundaries** are TMDB, the OAuth providers, ZeptoMail and time. Mock them at the client with responses shaped like
  the real service's, including its error shapes; let the database be real.
- **Chakra recipe variants.** Shared renderers provide the project's default system. Recipe styles sit in `@layer`
  blocks that jsdom's `getComputedStyle` skips, so variant style checks need a layer-free system. Render under
  `createSystem(defaultSystem._config, { disableLayers: true })` with `defaultSystem` from `@/theme`, then assert the
  token on `background`.
- **Layout, fixtures and commands** are in `.arc/reference/strategies/project/strategy-testing-methodology.md`.

## testing-standards.default

- Test observable behavior through public interfaces; don't assert on implementation — including **don't assert
  on spy / call args as the outcome** · `[invariant]` (that verifies wiring, not behavior).
- **Keep mocked boundaries and fixtures faithful** · `[invariant]` — a stub inventing dependency outcomes, or a
  hand-built fixture in a shape its producer never emits, passes against a fiction; prefer deriving fixture
  invariants from the producer; cover response-dependent behavior at a tier that runs the real thing.
- **See every behavior fail first** · `[invariant]` — this includes behavior the current implementation satisfies
  incidentally. If a new test passes before red, reconstruct only the narrow pre-behavior implementation, run the
  test to a behavioral failure, then restore the current implementation. At completion, retain reconstruct-and-revert
  evidence: the test fails against the reconstruction and passes after restoration. Compile or import errors do not
  prove fail-first behavior.
- **One behavior at a time** — don't batch tests for imagined behavior. Several coupled behaviors may share one
  pre-implementation test batch only when they have one indivisible implementation and every test can genuinely fail
  first.
- **Mock at boundaries; never mock internals** — if that is hard, the interface is wrong, not the test; don't
  test your dependencies.
- **Design for testability** — inject dependencies; separate computation from I/O.
- **Keep tests isolated** — no test depends on another's state or run order; reset shared state between tests.
- **Cover error and boundary paths.**
- **Meaningful assertions over coverage targets.**

---

[process-task-loop]: ../workflows/3_process-task-loop.md
