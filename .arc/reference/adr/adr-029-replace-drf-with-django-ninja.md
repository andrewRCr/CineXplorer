# ADR-029: Replace Django REST Framework with Django Ninja

## Status

Accepted (Owner, 2025-09-25)

Recorded 2026-11-04 from sources of the time.

Implemented by: PR #1 (`db13b358`, 2025-09-30), the `movie` app and the generated frontend types; PR #3
(`927cda65`, 2025-10-21), the remaining apps and the removal of DRF's views, serializers and routes.

## Context

CineXplorer's API was built on Django REST Framework (DRF). Strict static type checking was a primary goal of the
project, and the proposal of 2025-09-25 found that DRF, "while functional, presents significant friction when
enforcing strict, modern static type checking". The frontend kept hand-written TypeScript types for the API's
requests and responses.

The proposal's goals:

- "Eliminate the current class of ~700 type errors in the API layer by adopting a framework designed for static
  typing."
- Use Pydantic's automatic validation and serialization "to write more robust, less error-prone code".
- Set a type-safe blueprint for all current and future backend work.

Alternatives considered:

- **Keep DRF.** It worked, but the type errors and the hand-written frontend types stayed.
- **Django Ninja with Pydantic schemas (chosen).** The proposal described it as bringing "a type-first design
  philosophy (inspired by FastAPI) directly into the Django ecosystem". The finished proof of concept summed up the
  choice as "Modern, fast, automatic OpenAPI generation, Pydantic integration".

No other framework was compared.

For the frontend, the proposal required TypeScript types generated from the backend's schemas, "replacing the
manually maintained types", and named "End-to-End Type Safety" a success metric. The change that set this up gave
its reasons as a "single source of truth from backend OpenAPI endpoint" that "reduces type drift between frontend
and backend". The next day, answering a code-review finding on the stability of type generation, the generator was
pinned to an exact version (to prevent "type drift from CLI version changes"), the schema file was committed beside
the types, and CI was made to fail when the regenerated types differ from the committed ones.

## Decision

We will build the API on Django Ninja, with Pydantic schemas in place of DRF serializers: the `movie` app first, as
a proof of concept, then authentication and the user movie data app.

We will generate the frontend's API types (`frontend/src/types/api.ts`) from the backend's OpenAPI schema with
`openapi-typescript`, pinned to an exact version. Both the schema (`frontend/openapi.json`) and the generated types
are committed, and CI fails when types regenerated from the schema differ from the committed ones.

## Consequences

### Positive

- Request and response shapes are declared once, as Pydantic schemas, which validate input and produce the OpenAPI
  schema. Interactive documentation is served at `/api/docs`.
- The frontend's API types come from that same schema, so a contract change the frontend hasn't taken up fails CI
  instead of surfacing at runtime.
- The migrated code reached zero Pyright errors: the `movie` app's production code after the proof of concept, and
  the whole API in strict mode after the full migration.

### Negative

- Every API change means regenerating and committing `openapi.json` and `api.ts`. `npm run generate-types` exports
  the schema from the checkout's own backend container, so the backend has to be running.
- Dropping DRF meant replacing its JWT library: `djangorestframework-simplejwt` gave way to `django-ninja-jwt`, a fork
  of it, adopted "to eliminate DRF dependency", with type stubs the project writes itself (`backend/stubs/ninja_jwt/`).
- Django Ninja's CSRF check on cookie authentication rejected valid tokens (its issue #1464), so the API turns that
  check off and relies on a custom CSRF middleware instead (`backend/config/api.py`).

**Amendment (2026-11-06):** On 2026-11-05 the custom CSRF middleware gave way to a subclass of Django's own,
which checks every unsafe request ([ADR-035](adr-035-check-csrf-on-every-unsafe-request.md)). Django Ninja's check
stays off, so that Django's middleware owns the validation.

Current state: DRF's views, serializers and routes were gone by 2025-10-21, but the unused `djangorestframework`
package stayed in `backend/requirements/req.txt` until 2026-10-30; the drift check, first added as its own workflow,
now runs in `.github/workflows/ci.yml`.

## References

- `.arc/reference/archive/2025-q4/technical/02_api-layer-modernization-p1/prd-api-layer-modernization-p1.md`
  §§ 1, 3, 5 (requirement 6) and 8
- `.arc/reference/archive/2025-q4/technical/02_api-layer-modernization-p1/completion-api-layer-modernization-p1.md`
  § Architecture Decisions
- `.arc/reference/archive/2025-q4/technical/10_api-layer-modernization-p2/notes-api-layer-modernization-p2.md`
  § Django Ninja JWT Migration
- `.arc/reference/archive/2025-q4/incidental/08_security-updates/notes-security-updates.md`
  § CSRF Integration Issue Resolution
- Commits `fef8620f` (dependency added), `ddd0be54` (type generation), `175577aa`, `9d6e9378` and `0948e27c` (pin,
  committed schema, drift check), `d5e2a55a` (JWT library), `17ee7b80` (DRF package removed)
- `frontend/package.json` (`generate-types`), `frontend/scripts/export-openapi.js`, `.github/workflows/ci.yml`
  (step "Check for type drift")
- Django Ninja: <https://github.com/vitalik/django-ninja>; issue #1464:
  <https://github.com/vitalik/django-ninja/issues/1464>
