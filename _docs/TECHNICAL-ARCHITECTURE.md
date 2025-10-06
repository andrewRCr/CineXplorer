# CineXplorer Architecture

This document outlines the technical architecture of the CineXplorer application, covering the frontend, backend, and infrastructure.

## 1. Overview

CineXplorer is a modern full-stack web application. The architecture is composed of:

- A **React/TypeScript frontend** responsible for all UI and user interaction.
- A **Django/Python backend** that serves a RESTful API.
- A **PostgreSQL** database for data persistence.
- **Docker** for containerizing all services for consistent development and deployment.
- **Caddy** as a reverse proxy to route traffic to the appropriate service.

## 2. Backend

The backend is a REST API built with Django and Django REST Framework (DRF).

- **Framework**: Django `5.2` with Django REST Framework.
- **Language**: Python `3.x`.
- **Database**: PostgreSQL, configured via environment variables.
- **Authentication**: Authentication is handled by `rest_framework_simplejwt` using JSON Web Tokens. A custom `JWTCookieAuthentication` backend is implemented to manage tokens securely in HTTP-only cookies.
- **API Documentation**: `drf-spectacular` is used to automatically generate an OpenAPI 3 schema and Swagger UI, available at `/api/docs/`.
- **Code Style**: Linting is enforced using `.flake8`.
- **Type Checking**: Hybrid approach using Pyright (development) and MyPy (CI/CD)
    - **Pyright**: Primary type checker with Python 3.13 support, configured via `backend/pyrightconfig.json`
    - **MyPy**: Django-aware validation with django-stubs plugin, configured via `backend/mypy.ini`
    - **Custom Type Stubs**: Located in `backend/stubs/` to supplement third-party libraries
        - `allauth/` - django-allauth models (EmailAddress, EmailConfirmation)
        - `rest_framework_simplejwt/` - JWT token types
        - `django/contrib/auth/` - Supplements django-stubs for UserManager and AbstractBaseUser
    - **Stub Maintenance**: Each stub file documents version synchronization and upgrade procedures
    - **Type Safety Goal**: Minimize `type: ignore` comments; remaining ones are documented (Django settings, framework internals)
    - **See**: `_docs/reference/type-safety-strategy.md` for complete type safety approach
- **Key Libraries**:
    - `django-cors-headers` for managing Cross-Origin Resource Sharing (CORS).
    - `django-debug-toolbar` for debugging during development.
    - `environ` for managing environment variables.
- **Directory Structure**: The backend code is organized into discrete Django `apps` within the `backend/apps/` directory with clear domain boundaries. Note that `accounts` holds persistent user data/models (User, EmailVerificationToken), while `authentication` contains stateless auth flows (JWT handling, serializers, views, middleware for login/verification):
    - `accounts`: User authentication models (`User`, `EmailVerificationToken`)
    - `authentication`: Authentication processes (JWT, serializers, views, middleware)
    - `core`: Core business models (`Movie` and shared utilities)
    - `movie`: Movie-related functionality and API endpoints
    - `user_movie_data`: User-movie interaction models and API (`UserMovieData`, watchlist, ratings)

## 3. Frontend

The frontend is a single-page application (SPA) built with React.

- **Framework**: React `19` with Vite for the build tooling.
- **Language**: TypeScript `5.x`.
- **UI Components**: The UI is built using **Chakra UI v3**. This provides a rich set of accessible and composable components.
- **Routing**: `react-router-dom v7` is used for all client-side routing.
- **State Management**: Global state, such as the user's authentication status, is managed using React's built-in Context API (`AuthContext`). Component-level state is managed with standard React hooks (`useState`, `useReducer`). A more complex, unified state management system is in place for the movie filter controls, handling shared state between default, minimal, and advanced filter UIs.
- **Data Fetching**: API communication is handled by a service layer (`src/services/`) that uses `axios`. Custom hooks like `useApiRequest` provide a consistent, reusable interface for components to fetch and mutate data.
- **Advanced Filtering Logic**: The filtering system is a hybrid model. While most filters map to TMDB API queries, it also applies custom client-side filtering to correct data inconsistencies from the API (e.g., movies with incorrect release dates). To prevent empty spaces in the UI from these removals, the application dynamically fills gaps using a pre-fetched buffer of results from subsequent pages.
- **Forms**: `formik` is used to manage form state and validation.
- **Testing**: `vitest` is the testing framework, used for unit and component testing. `react-testing-library` is used for rendering components in tests.
- **Directory Structure**: The `frontend/src/` directory is organized by feature and function:
    - `pages/`: Top-level components for each route.
    - `components/`: Reusable UI components.
    - `hooks/`: Custom React hooks.
    - `services/`: Modules for interacting with the backend API.
    - `contexts/`: Global state providers.

## 4. Shared Code

To ensure type safety and consistency between the frontend and backend, a `shared/` directory is used. This directory contains TypeScript files with type definitions (`api-types.ts`) and shared constants (`error-codes.ts`) that can be used by both the frontend and, where applicable, the backend, facilitating smoother integration.

## 5. Infrastructure

The entire application is designed to be run and deployed using containers.

- **Containerization**: Docker and Docker Compose are used to define and run the multi-container application (`backend`, `frontend`, `postgres`, `caddy`). Separate `docker-compose.*.yml` files exist for different environments (dev, CI, prod).
- **Web Server / Reverse Proxy**: **Caddy** is used as the reverse proxy. It handles routing requests to the appropriate service (e.g., `/api/*` to the backend, all other requests to the frontend) and provides automatic HTTPS for secure connections.
- **CI/CD**: Continuous integration is set up using **GitHub Actions**. The workflow, defined in `.github/workflows/ci.yml`, runs linters and tests on every push and pull request to ensure code quality.

## 6. Testing Methodology

The project follows a **Modified Test-Driven Development (TDD)** approach that balances development speed with code quality:

### Testing Strategy

- **Test-First Priority**: New models, API endpoints, and complex business logic
- **Test-After Acceptable**: Simple CRUD operations, UI components, configuration code
- **Always Required**: All new features must have appropriate test coverage
- **Integration Focus**: Test feature workflows, not just individual components
- **Regression Protection**: Existing tests must pass before any commits

### Backend Testing

- **Framework**: Django's built-in test framework with custom test settings
- **Database**: Uses `--keepdb` flag for performance during development
- **Coverage**: Focus on models, API endpoints, and service layer logic
- **Command**: `docker-compose exec backend python manage.py test --keepdb`

### Frontend Testing

- **Framework**: Vitest with React Testing Library for component testing
- **Environment**: JSDOM with comprehensive browser API mocking
- **Structure**: Co-located tests in `__tests__/` directories near components
- **Coverage Goals**: 70%+ for critical paths and user-facing functionality
- **Command**: `docker-compose exec frontend npm test`

### Quality Gates

Before any commit, the following checks must pass:

1. **Test Coverage**: New code has appropriate tests
2. **All Tests Pass**: Both backend and frontend test suites
3. **Linting**: `flake8` (backend) and `eslint` (frontend)
4. **Type Checking**: TypeScript compilation without errors
