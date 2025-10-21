# Sub-PRD: API Layer Modernization with Django Ninja

**Document Version:** 1.0
**Created:** 2025-09-25
**Feature Priority:** High
**Implementation Phase:** In Planning

## 1. Introduction/Overview

This document outlines a strategic modernization of the CineXplorer backend API layer. The current implementation using Django REST Framework (DRF), while functional, presents significant friction when enforcing strict, modern static type checking, which is a primary goal of the project.

This initiative will replace the DRF-based API layer with **Django Ninja**, a modern library that brings a type-first design philosophy (inspired by FastAPI) directly into the Django ecosystem. The goal is to achieve demonstrable, end-to-end type safety for the API, showcasing a commitment to code quality and modern Python best practices for a portfolio audience.

## 2. Implementation Phases

This modernization will be executed in two distinct phases to de-risk the project and ensure a methodical rollout.

* **Phase 1: Proof of Concept (PoC) - The `movie` Application (This Document's Scope)**
    The initial effort will focus on migrating a single, representative slice of the API: the `movie` application. This will allow us to establish a clear blueprint and identify all necessary patterns for the full migration in a controlled environment.

* **Phase 2: Full Migration (Future Scope)**
    Following the successful completion of the PoC, a new task list will be created to apply the established patterns to the remaining applications (`authentication`, `user_movie_data`, etc.), completing the full API layer modernization.

## 3. Goals

1. **Demonstrate Modern API Practices:** Showcase expertise in modern, type-driven API design and implementation, a key skill for prospective employers.
2. **Achieve Strict Type Safety:** Eliminate the current class of ~700 type errors in the API layer by adopting a framework designed for static typing.
3. **Improve Developer Experience:** Leverage Pydantic's automatic data validation and serialization to write more robust, less error-prone code with greater confidence.
4. **Establish a Scalable API Pattern:** Create a clean, type-safe blueprint that can be applied to all current and future backend development.

## 4. User Stories

* **As a prospective employer,** I want to see a backend API that uses modern, type-driven design so that I can assess the developer's commitment to code quality and contemporary best practices.
* **As a developer,** I want the API layer to have strict, static type checking so that I can catch bugs during development, not in production, and refactor with confidence.
* **As a developer,** I want to define my API's data shapes in a single place (Pydantic schemas) and have them automatically validated, serialized, and documented, reducing boilerplate and the chance of error.

## 5. Functional Requirements (Phase 1: PoC)

This migration will begin with a proof-of-concept (PoC) focused on the `movie` application.

1. **Replace DRF Views:** All DRF-based views within the `backend/apps/movie/` directory must be refactored into Django Ninja path operation functions using decorated routers.
2. **Replace DRF Serializers:** All DRF serializers in `backend/apps/movie/serializers.py` must be replaced with equivalent Pydantic schemas in a new `backend/apps/movie/schemas.py` file.
3. **Adapt Authentication (Cookie-JWT with CSRF):**
    * Use `APIKeyCookie` (or custom) for access token; enforce CSRF on unsafe methods (POST/PUT/PATCH/DELETE).
    * Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (or `None` for cross-site with HTTPS only).
    * Implement refresh token rotation + reuse detection; short-lived access tokens.
    * Standardize 401 (unauthenticated) vs 403 (unauthorized) responses and error body.
    * This should have already been implemented prior to this phase, but ensure it is fully functional and integrated with Django-Ninja.
4. **Preserve Functionality:** The new `movie` API endpoints must provide the exact same functionality and adhere to the same business logic as the old endpoints.
    4a. **Preserve pagination strategy** (page size, param names, response shape).
    4b. **Preserve filtering and ordering** query params and semantics.
    4c. **Preserve error envelope and status codes** (map DRF `{"detail": ...}` to Ninja consistently).
    4d. **Preserve content types and headers** (JSON only vs negotiation).
5. **Update Tests:** All existing backend tests for the `movie` API must be updated to use the new Ninja endpoint structure, and all tests must pass.
6. **Establish Type Generation Workflow:** A process must be established to demonstrate the automatic generation of TypeScript interfaces from the new Pydantic schemas, replacing the manually maintained types for the `movie` API.

## 6. Non-Goals (Out of Scope)
* This migration will not alter the database schema or the core business logic contained within service layers.
* Changes to other applications (`authentication`, `user_movie_data`, etc.) are out of scope for this initial PoC.
* Minor adjustments to adjacent components (e.g., URL structures) are permissible if they result in a more idiomatic and maintainable integration with Django Ninja, in line with the project's goal of demonstrating best practices.

## 7. Technical Considerations

* The new API will be built around a central `NinjaAPI` instance with dependencies: `django-ninja>=1.0,<2.0` and `pydantic>=2.0,<3.0`.
* Pydantic v2 `ModelSchema` will be used to automatically generate schemas from Django models, reducing boilerplate. Note that this uses Pydantic v2's configuration patterns (e.g., `model_config` with `from_attributes=True`), not the legacy v1 syntax.
* The custom JWT cookie authentication will be adapted into a class that implements one of Ninja's security schemes (e.g., `HttpBearer`, `APIKeyCookie`).
* The frontend impact will be managed by ensuring API contracts are maintained and by leveraging auto-generated TypeScript types.

## 8. Success Metrics (Phase 1: PoC)

1. **Zero Strict Typing Errors:** The migrated `movie` app (views and schemas) must pass `pyright` checks with zero errors. Full `mypy --strict` validation is deferred to Phase 2 due to django-stubs compatibility issues (see <https://github.com/typeddjango/django-stubs/issues/2461>). Minimal, well-documented `type: ignore` statements for unavoidable Django core issues are acceptable if necessary.
2. **Full Test Pass Rate:** 100% of the adapted backend tests for the `movie` app must pass.
3. **End-to-End Type Safety:** A clear, repeatable process for generating TypeScript types from the backend Pydantic schemas is successfully demonstrated.
4. **Functionality Parity:** The new API endpoints are verified to work correctly with the existing frontend application.

## 9. Implementation Notes

**Foundational Issues Discovered (September 2025):**
During initial Django Ninja setup, several foundational issues were identified that require resolution before full authentication migration:

* Import path inconsistencies between `apps.core.models` vs `core.models` across the codebase
* Missing `shared` module dependency containing TMDB API type definitions (available in Docker but not local development)
* These issues prevent `python manage.py check` from passing, blocking validation of Django Ninja setup

These foundational issues are being addressed in Task 2.0 before continuing with the authentication layer migration.

**Type Checking Strategy:**
Pyright is used as the primary static type checker for Phase 1 due to upstream django-stubs compatibility issues that prevent `mypy --strict` from running on Django projects. The django-stubs library currently has internal errors that block full-project mypy validation, so Pyright provides our type safety guardrail while we track the upstream fix for future Phase 2 mypy integration.

## 10. Open Questions

* What is the most idiomatic and secure way to implement the custom cookie-based authentication in Django Ninja?
* What is the optimal strategy for rolling out this change to the `authentication` and `user_movie_data` apps after the PoC is successful?
* Should the `shared` module be integrated into the Django project structure or maintained as a separate Docker-mounted dependency?
