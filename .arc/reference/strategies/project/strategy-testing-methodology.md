# Testing Methodology Strategy

**Version:** 1.6 | **Updated:** 2026-11-03 | **Status:** Active | **Scope:** Full-stack

## Purpose

Testing standards and patterns for CineXplorer's full-stack infrastructure (Django + React):

- **DRY principle** - Eliminate duplicate test utilities
- **Type safety** - Consistent helper signatures (Python + TypeScript)
- **Clear organization** - Know where to find/add utilities

## Table of Contents

1. [Common Principles](#common-principles)
2. [Test Discipline](#test-discipline)
3. [Testing Philosophy](#testing-philosophy)
   - [Coverage Targets](#coverage-targets)
   - [Quality Gates](#quality-gates)
4. [Backend Testing (Django/Ninja)](#backend-testing-djangoninja)
5. [Frontend Testing (React/Vitest)](#frontend-testing-reactvitest)
   - [Testing Patterns](#testing-patterns)
   - [Asserting Chakra Recipe Styles](#asserting-chakra-recipe-styles)
   - [Anti-Patterns](#anti-patterns)
6. [Integration Testing](#integration-testing)
   - [E2E Test Structure](#e2e-test-structure)
   - [E2E Best Practices](#e2e-best-practices)
7. [References](#references)

---

## Common Principles

**Three-tier hierarchy** for test utilities (backend + frontend):

1. **Core Shared Helpers** - Cross-cutting utilities (HTTP, models, assertions)
2. **Domain/Feature Fixtures** - Domain-specific factories and setup
3. **Inline Helpers** - Test-specific one-offs

**Locations:**

- Backend: `backend/apps/{app}/tests/`
- Frontend: `frontend/src/{feature}/__tests__/`

## Test Discipline

These hold for every test, test-first or not. The full rules are in
[testing-standards](../../methods/testing-standards.md) (CineXplorer's override names the boundaries below) and
[test-first](../../methods/test-first.md).

- **Observable behavior, not wiring.** Assert what a user or caller can observe: a response, rendered text, a saved
  row. A spy's call arguments prove only that something was called; never make them the outcome.
- **Faithful boundaries.** Mock only the boundaries (TMDB, the OAuth providers, ZeptoMail, time), at the client, with
  responses shaped like the real service's, including its error shapes. Let the database be real. A hand-built
  fixture in a shape the producer never emits passes against a fiction.
- **Every test seen failing.** Run a new test before the code that satisfies it and watch it fail for the right
  reason; a compile or import error doesn't count. If it passes first, the behavior already exists or the test is
  wrong: find out which before going on.
- **Isolated, with error paths.** No test depends on another's state or order. Cover error and boundary paths, not
  just the happy path; meaningful assertions matter more than coverage numbers.

## Testing Philosophy

### Three-Layer Testing

**Backend:**

1. **API Integration Tests** - Full request/response via Django test client
2. **Service Layer Tests** - Business logic called directly, against the real test database, with only external
   clients replaced
3. **Specialized Tests** - Edge cases, mocks, performance

**Frontend:**

1. **Component Tests** - User interactions with React Testing Library
2. **Integration Tests** - Feature flows with mocked APIs
3. **E2E Tests** - Critical paths with Playwright

### Coverage Targets

**Backend:**

- Minimum: 90% statement coverage (general application code)
- Critical paths: 90%+ statement coverage (auth, payments, data integrity)
- Security-critical: 95%+ statement coverage (token management, session handling)
- Current enforcement: CI fails below `fail_under` in `backend/pyproject.toml` (90%)
- Focus: Integration over unit tests

**Frontend:**

- Long-term target: 80% branch coverage (component/feature coverage)
- Critical-path target: 90%+ branch coverage (auth, checkout, flows)
- Current enforcement: the measured floors in `frontend/vitest.config.ts`, initially set one whole percentage point
  below each rounded-down baseline metric. These floors prevent regressions while coverage improves toward the targets.
- Scope: `src/**`, excluding `src/pages/dev/**`, `src/main.tsx` and the configuration's existing exclusions;
  unexecuted source files remain included.
- Focus: User behavior over implementation

**Rationale:** Targets align with industry consensus (Google "commendable" tier, Microsoft standard, OWASP
security guidance). 80% represents practical ROI inflection point; 90%+ for critical paths reflects
risk-based testing prioritization per industry best practices.

### Quality Gates

**Backend:** 100% pass rate, coverage at or above the floor CI enforces (`fail_under` in `backend/pyproject.toml`,
90%), zero lint/type errors
**Frontend:** 100% pass rate, zero lint/type errors, and the configured measured floors when running
`npm run test:coverage`. Frontend CI enforces the same floors and uploads a compact JSON coverage summary.

---

## Test Organization Standards

### Directory Structure

**Backend (pytest):** Use directory-based separation for test types.

```
backend/apps/{app}/
├── models.py
├── services/
├── api.py
└── tests/
    ├── conftest.py              # App-level shared fixtures
    ├── fixtures.py              # Factory functions (optional)
    ├── unit/
    │   ├── conftest.py          # Unit-specific fixtures (if needed)
    │   ├── test_models.py
    │   ├── test_services.py
    │   └── test_validators.py
    └── integration/
        ├── conftest.py          # Integration-specific fixtures (if needed)
        ├── test_api_endpoints.py
        └── test_database_queries.py
```

**Frontend (Vitest):** Co-locate tests with components, use suffixes for test types.

```
frontend/src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx              # Co-located unit test
│   └── MovieCard/
│       ├── MovieCard.tsx
│       ├── MovieCard.test.tsx           # Unit tests
│       └── MovieCard.integration.test.tsx  # Integration tests
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
└── __tests__/                           # Optional: cross-feature integration
    └── integration/
        └── checkout-flow.integration.test.tsx
```

**Browser smoke tests (Playwright):**

```
frontend/
├── playwright.config.ts
└── e2e/
    ├── sign-up.spec.ts
    ├── sign-in.spec.ts
    ├── browse.spec.ts
    ├── movie-detail.spec.ts
    ├── back-to-results.spec.ts
    ├── fixtures.ts
    ├── catalogue.ts
    ├── target.ts
    ├── axe.ts
    ├── axe-baseline.ts
    └── axe-reporter.ts
```

### When to Use Each Test Type

**Unit Tests** (`tests/unit/` or `.test.tsx`):

- Isolated business logic (services, models, utilities)
- Pure functions and transformations
- Component behavior without external dependencies
- Fast execution (<100ms per test)

**Integration Tests** (`tests/integration/` or `.integration.test.tsx`):

- API endpoints (full request/response cycle)
- Database interactions (queries, transactions)
- Service layer with real dependencies
- Component interactions with mocked backend
- Slower execution (100ms-1s per test)

**E2E Tests** (`frontend/e2e/*.spec.ts`):

- Real sign-up to the check-your-email notice, and sign-in/sign-out through session cookies
- Browse pagination, movie detail with preserved filters, and Back to Results after a reload
- Browser layout and scroll restoration across the frontend, API, and database
- axe scans on every distinct page each spec reaches; Chromium only, with no retries

### File Splitting Guidelines

**When to split test files:**

| File Size     | Action             | Rationale                                |
|---------------|--------------------|------------------------------------------|
| < 200 lines   | Keep together      | Manageable, easy to navigate             |
| 200-400 lines | Consider splitting | If testing multiple features/endpoints   |
| 400-800 lines | Should split       | Hard to navigate, split into 2-3 files   |
| 800+ lines    | **Must split**     | Unmaintainable, aim for 200-400 per file |

**How to split:**

1. **API integration tests:** Split by endpoint + aspect
   - Example: `test_discover_filtering.py`, `test_discover_pagination.py`, `test_search_queries.py`
   - Group related endpoint behavior together

2. **Business logic tests:** Split by domain/feature
   - Example: `test_genre_filters.py`, `test_rating_filters.py`, `test_date_filters.py`
   - Each filter type gets its own file

3. **Service tests:** Split by service method or concern
   - Example: `test_movie_service_discovery.py`, `test_movie_service_enrichment.py`
   - Group related methods together

**Naming conventions:**

```
Backend:  test_{resource}_{feature}_{aspect}.py
          test_movie_discover_filtering.py
          test_user_authentication_tokens.py

Frontend: {Component}.{type}.test.tsx
          MovieCard.test.tsx
          MovieCard.integration.test.tsx
          CheckoutFlow.integration.test.tsx
```

**When NOT to split:**

- Tests share significant setup/fixtures (refactor fixtures instead)
- Tests are tightly coupled conceptually
- File is well-organized with classes/describe blocks and <400 lines
- Splitting would create artificial separation

### Organizing Split Files

**Option 1: Subdirectories** (when splitting creates 3+ files)

```
tests/integration/api/movies/
├── conftest.py                    # Shared fixtures for movie API tests
├── test_discover_filtering.py
├── test_discover_pagination.py
├── test_discover_sorting.py
└── test_search.py
```

**Option 2: Flat structure** (when splitting creates 2-3 files)

```
tests/integration/
├── test_movie_discover_api.py
├── test_movie_search_api.py
└── test_user_profile_api.py
```

---

## Backend Testing (Django/Ninja)

### Running Tests

**Framework:** pytest with pytest-django

**Basic Commands:**

```bash
# Run all tests
pytest apps/

# Run specific app
pytest apps/authentication/tests/

# Run with verbose output
pytest apps/ -v

# Parallel execution (2-4x faster)
pytest -n auto apps/

# With coverage
pytest --cov=apps --cov-report=term-missing apps/

# Keep database between runs (faster iteration)
pytest --reuse-db apps/
```

**Directory-based execution:**

```bash
# Run only unit tests
pytest apps/{app}/tests/unit/

# Run only integration tests
pytest apps/{app}/tests/integration/

# Run all unit tests across all apps
pytest apps/*/tests/unit/

# Run all integration tests across all apps
pytest apps/*/tests/integration/
```

**Marker-based execution** (behavioral markers only - organizational markers replaced by directory structure):

```bash
# Run all except slow tests (behavioral marker)
pytest -m "not slow"

# Skip tests that need throttling enabled
pytest -m "not enable_throttling"
```

**Note:** Organizational markers (`unit`, `integration`, `api`) are intentionally not used.
Directory structure (`tests/unit/`, `tests/integration/`) provides organization.
Markers are reserved for behavioral flags (`slow`, `enable_throttling`).

**Docker Execution** (required for tests that need database/Redis):

```bash
# From repo root
docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/

# With parallel execution
docker compose -f infrastructure/docker-compose.yml exec backend pytest -n auto apps/

# Specific test file
docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/test_movie_api.py -v
```

**Quality Checks:**

```bash
# Type checking (fast)
npx pyright backend/apps/ --project backend

# Linting (with auto-fix)
.venv-backend/bin/ruff check backend/apps/ --fix

# Full run (verification, or a wider run when the affected surface calls for one)
pytest apps/  # All tests pass
npx pyright backend/apps/ --project backend  # 0 type errors
.venv-backend/bin/ruff check backend/apps/  # 0 violations
```

### pytest Patterns

**Function-based tests with fixtures:**

```python
import pytest
from django.test import Client
from http import HTTPStatus

@pytest.fixture
def authenticated_user(api_client: Client, db: None) -> tuple[Client, User]:
    """Create verified user and return authenticated client."""
    user = create_user(username="testuser", email_verified=True)
    # Authenticate via JWT
    response = json_post(api_client, "/api/token/", {
        "username": user.username,
        "password": "testpass123"
    })
    return api_client, user

def test_get_user_profile(authenticated_user: tuple[Client, User]) -> None:
    """Test authenticated user can retrieve their profile."""
    client, user = authenticated_user

    response = client.get(f"/api/users/{user.username}/")

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["username"] == user.username
    assert data["email"] == user.email
```

**Parametrized tests for validation:**

```python
import pytest

@pytest.mark.parametrize("invalid_rating,expected_msg", [
    (0, "Rating must be between 1 and 10"),
    (11, "Rating must be between 1 and 10"),
    (-5, "Rating must be between 1 and 10"),
])
def test_create_rating_validation(
    authenticated_user: tuple[Client, User],
    invalid_rating: int,
    expected_msg: str
) -> None:
    """Test rating validation rejects invalid values."""
    client, user = authenticated_user
    csrf_token = get_csrf_token(client)

    response = client.post(
        "/api/user-movie-data/create/",
        json.dumps({"tmdb_id": 550, "user_rating": invalid_rating}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert expected_msg in str(response.content)
```

**Database tests:**

```python
@pytest.mark.django_db
def test_user_email_normalized() -> None:
    """Test user email domain is normalized to lowercase."""
    user = User.objects.create_user(
        username="testuser",
        email="Test@EXAMPLE.COM",
        password="testpass123"
    )

    assert user.email == "Test@example.com"
```

### Test Helper Hierarchy

#### Tier 1: Core Shared Helpers (`backend/apps/core/tests/test_helpers.py`)

**Purpose:** Cross-cutting utilities for multiple domains

**Contents:**

- HTTP helpers (`json_post`, `json_patch`, `json_put`)
- CSRF helper (`get_csrf_token`)
- Status codes (re-exported `HTTPStatus`)
- Basic model creation (`create_user`)
- Authentication helpers (`create_user_and_auth_payload`)
- Generic assertions
- Cross-test type definitions (`UserParams`)

```python path=null start=null
from core.tests.test_helpers import (
    create_user,
    create_user_and_auth_payload,
    json_post,
    get_csrf_token,
    HTTPStatus
)

# Basic user creation
user = create_user(username='testuser', email='test@example.com')

# Authentication tests (DRY pattern - reduces 3 lines to 1)
user, payload = create_user_and_auth_payload(username='testuser', password='TestPass123!')
response = json_post(client, '/api/token/', payload)
assert response.status_code == HTTPStatus.OK

# Generic endpoint test
response = json_post(client, '/api/endpoint/', {'data': 'value'})
assert response.status_code == HTTPStatus.OK

# For CSRF-protected endpoints
csrf_token = get_csrf_token(client)
response = client.post('/api/mutations/', data, HTTP_X_CSRFTOKEN=csrf_token)
```

**Standards:** Type-safe `TypedDict` signatures.

#### Tier 2: Domain Fixtures

**Purpose:** Domain-specific factories and complex setup

**Contents:**

- Domain model factories with rich defaults
- Complex setup (OAuth, TMDB mocks, etc.)
- Payload creation helpers
- Mock service factories

**Examples:**

```python path=null start=null
# authentication/tests/fixtures.py
create_user(email_verified=True, **params)
create_social_app(provider='google')
create_register_payload(username='user', email='user@example.com')

# movie/tests/fixtures.py (future)
create_mock_tmdb_response(tmdb_id=550, title='Fight Club')
create_movie(tmdb_id=550, **overrides)

# user_movie_data/tests/fixtures.py (future)
create_user_movie_data(user, movie, user_watched=True, user_rating=5)
```

**Standards:** Import from core helpers, extend with domain defaults.

#### Tier 3: Inline Test Helpers

**Purpose:** Test-specific utilities that don't generalize

**Use when:**

- Used in single test file only
- Testing edge cases
- Too specific to extract

```python path=null start=null
def test_movie_api_edge_case():
    """Test movie API with malformed TMDB response."""
    def create_malformed_tmdb_response():
        return {'id': 550}  # Missing title, poster_path, etc.

    response = create_malformed_tmdb_response()
    # Test handling of malformed data...
```

### When to Use Each Tier

**Core Helpers:** 2+ domains, generic logic, no business rules
**Domain Fixtures:** Single domain, complex setup, multiple test files
**Inline Helpers:** Single test file, edge cases, specific assertions

### Type Safety Standards

```python path=null start=null
from typing import TypedDict, Unpack

class UserParams(TypedDict, total=False):
    username: str
    email: str
    password: str
    first_name: str
    last_name: str

def create_user(**params: Unpack[UserParams]) -> AbstractUser:
    # Implementation

def json_post(
    client: Client,
    url: str,
    data: dict[str, object],
    **kwargs: object
) -> HttpResponse:
    return client.post(url, json.dumps(data), content_type='application/json', **kwargs)
```

**Avoid `Any`:** Use `object` for unknown types, `dict[str, object]` for dictionaries.

**Mock Type Annotations:** Explicit type annotations on Mock variables are **optional**. `Mock()` returns type
`Mock`, not `Any` - Pyright correctly infers the type without annotations.

```python
# Both are valid - explicit annotation is optional, not required
mock_message = Mock()              # ✅ Pyright infers Mock type
mock_message: Mock = Mock()        # ✅ Also valid, but redundant

# Mock(spec=...) is about runtime safety (catching typos), not type safety
mock_response = Mock(spec=Response)  # Raises AttributeError on typos at runtime
```

**Note:** `Mock(spec=SomeType)` provides runtime attribute checking (catches typos) but doesn't improve static
type safety - Pyright sees `Mock` either way. Use `spec=` when runtime safety matters, not for type checking.

### Replacing Boundaries

Replace only what [Test Discipline](#test-discipline) names, at its client:

- **TMDB:** inject a stub client into the service, built from `movie/tests/tmdb_test_builders.py` so its responses
  and errors have TMDB's shapes. Tests of the HTTP client itself raise real `requests` exceptions.
- **Mail:** Django's test outbox (`mailoutbox` in pytest-django); the test settings already swap the backend.
- **Time:** freezegun.
- **OAuth providers:** at the provider client allauth calls.

Don't patch the project's own functions, services, repositories or `transaction.atomic`. If a test can't reach a
behavior without that, the code needs a seam: inject the dependency. The existing `mock_paths.py` files shrink as
their tests are changed; add no new paths.

### Re-exporting Stdlib Utilities

```python path=null start=null
# core/tests/test_helpers.py
from http import HTTPStatus
__all__ = ["HTTPStatus", "create_user", "json_post", "json_patch", "json_put"]
```

**Benefits:** Single import point, no DRF dependency, type-safe IntEnum.

### Current State

- ✅ Unit/integration directory structure standardized across all apps
- ✅ Parallel execution supported
- ✅ CI/CD runs all tests via `pytest apps/`

**Test Infrastructure:**

- ✅ `apps/conftest.py` - Root fixtures (api_client, user, auth_client)
- ✅ `core/tests/test_helpers.py` - HTTP helpers, CSRF, `create_user`, `HTTPStatus`
- ✅ `authentication/tests/conftest.py` - OAuth, throttling, verified_user fixtures
- ✅ `authentication/tests/fixtures.py` - Factory functions for test data
- ✅ `movie/tests/test_helpers.py` - TMDB response mock helpers
- ✅ `movie/tests/tmdb_test_builders.py` - Pydantic model builders for TMDB data
- ✅ `movie/tests/integration/api/endpoint_configs.py` - Parametrized endpoint configs

**Design Decisions:**

- Directory structure (`tests/unit/`, `tests/integration/`) for organization
- Behavioral markers (`slow`, `enable_throttling`) only - no organizational markers
- Empty `conftest.py` files kept as placeholders for future app-specific fixtures

### Anti-Patterns

**❌ Don't:**

- Copy-paste helpers between files
- Patch the project's own code (functions, services, repositories, `transaction.atomic`)
- Mock a repository in a service test
- Assert only what a mock was set up to return
- Import DRF utilities in Django Ninja tests

**✅ Do:**

- Import from shared locations
- Use Django test client and stdlib

---

## Frontend Testing (React/Vitest)

### Test Helper Hierarchy

#### Tier 1: Core Shared Helpers (`frontend/src/test/helpers/`)

**Purpose:** Cross-cutting utilities for multiple features

**Contents:**

- Render helpers (`renderWithProviders`, `renderWithRouter`)
- Mock factories (`createMockUser`, `createMockMovie`)
- Common utilities (`waitForLoadingToFinish`, `findByTestId`)
- Type definitions (`MockUserData`, `MockMovieData`)

```typescript path=null start=null
// frontend/src/test/helpers/render.ts
export function renderWithProviders(ui: React.ReactElement, options = {}) {
  return render(
    <BrowserRouter>
      <AuthContextProvider>
        {ui}
      </AuthContextProvider>
    </BrowserRouter>,
    options
  );
}
```

**Standards:** Type-safe generics, reusable factories, JSDoc comments, minimal feature logic.

#### Tier 2: Feature Test Utilities

**Purpose:** Feature-specific helpers and mocks

**Contents:**

- Feature mock factories
- Component-specific setup
- API mock responses
- Custom assertions

```typescript path=null start=null
// auth/__tests__/utils.ts
export const createMockLoginResponse = (overrides = {}) => ({
  access: 'token', refresh: 'refresh', user_id: 1, ...overrides
});

// movies/__tests__/utils.ts
export const createMockMovie = (overrides = {}) => ({
  tmdb_id: 550, title: 'Fight Club', ...overrides
});

export const mockTMDBResponse = (movies: Movie[]) => ({
  results: movies, page: 1, total_results: movies.length
});
```

#### Tier 3: Inline Test Helpers

**Use when:** Single test file, component-specific setup, edge cases

```typescript path=null start=null
describe('LoginForm', () => {
  const createInvalidFormData = () => ({
    login: '', password: 'abc' // Too short
  });
  // ...
});
```

### Type Safety Standards

```typescript path=null start=null
// frontend/src/test/types.ts
export interface MockUserData {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function createMockUser(overrides: DeepPartial<MockUserData> = {}): MockUserData {
  return {
    id: 1, username: 'testuser', email: 'test@example.com',
    email_verified: true, ...overrides
  };
}
```

### Testing Patterns

Query elements by role and accessible name, interact with `userEvent`, and mock the network with MSW rather than
internal modules.

```typescript path=null start=null
// Component Testing
describe('LoginPage', () => {
  it('submits login form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });
});

// API Mocking (MSW): override a response on the shared server for this test file.
import { http, HttpResponse } from 'msw';
import { apiBaseUrl } from '@/config/baseUrls';
import { server } from '@tests/mocks/server';

beforeEach(() => {
  server.use(
    http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
      HttpResponse.json({ page: 1, total_pages: 0, total_results: 0, results: [] }),
    ),
  );
});
```

`tests/setup.ts` starts the shared server, resets runtime handlers after each test and closes it after the suite.

### Asserting Chakra Recipe Styles

The shared renderers provide the project's default system, including its recipes. Recipe styles sit in CSS
`@layer` blocks, which jsdom's `getComputedStyle` skips. A style assertion under the shared renderer can therefore
pass without checking the recipe's computed style.

To test that a recipe variant applies a token, render under the project theme with layers disabled, then assert the
computed style:

```tsx
import { ChakraProvider, createSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { defaultSystem } from "@/theme";

const system = createSystem(defaultSystem._config, { disableLayers: true });

render(
  <ChakraProvider value={system}>
    <Button variant="secondary">Cancel</Button>
  </ChakraProvider>,
);
// Assert the token's resolved value on `background` (not `backgroundColor`)
```

### Current State

- ✅ Vitest + React Testing Library configured

### Anti-Patterns

**❌ Don't:**

- Test implementation details (component state)

```typescript
// Bad: pokes at internal state
expect(component.state.isLoading).toBe(false);
```

- Duplicate mock factories across files

```typescript
// auth/__tests__/Login.test.tsx
const createMockUser = () => ({ id: 1, username: 'test' });

// profile/__tests__/Profile.test.tsx
const createMockUser = () => ({ id: 1, username: 'test' }); // DUPLICATE!
```

**✅ Do:**

- Test user-visible behavior

```typescript
expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
```

- Import from shared helpers

```typescript
import { createMockUser } from '@/test/helpers/mocks';
```

---

## Integration Testing

### E2E Test Coordination

The five specs in `frontend/e2e/` cover sign-up, sign-in and sign-out, browse pagination, filtered movie detail, and
Back to Results after reloading detail. They run in Chromium at 1280×800 with no retries. Sign-up stops at the
check-your-email notice; email-link verification, OAuth, watchlists, other browsers, and mobile viewports are outside
this tier.

- **`local`** (default): the real development backend, PostgreSQL, Redis, registration, and session cookies. Browser
  fixtures answer catalogue paths beginning `/api/movies`, `/api/genres`, `/api/keywords`, and `/api/people`. An
  unhandled catalogue method/path aborts and fails the spec with its method and path; requests to another origin are
  aborted. Synthetic fixtures use generated API types and cover all score badge variants. Worktrees and CI discard
  mail through Django's dummy backend; the primary checkout's stack sends real verification mail.
- **`staging`**: live catalogue data and an existing verified, non-staff account. Registration is skipped. The Back to
  Results reload scenario supplies its own browse/detail fixtures in both targets to control page height; those
  overrides serve only same-origin GETs. The specs change none of the staging account's saved data.

`/api/user-movie-data` also reaches TMDB, but these specs never call it. A future spec that does supplies its own
fixtures. Assertions read titles from the browse responses the page received rather than assuming synthetic data;
each movie card's link must be named by its title. Since two card links share that name, use an exact name and
`first()`.

The pull-request job runs the development stack and is required by `ci-ok`. The staging job runs after deployment
and its health check; a failure makes the workflow red without rollback. Local failures retain a trace and screenshot
in the HTML report. Staging keeps neither and uploads no artifact, since browser artifacts can carry credentials and
cookies.

Agent-driven browser checks provide visual and development feedback, recorded with the change. They never gate a
merge or substitute for these deterministic specs.

### E2E Test Structure

Specs use the shared `test` and `expect` from `./fixtures`; the target selects catalogue interception and credentials.
Outside fixture and axe helpers, every element lookup starts with `getByRole`, `getByLabel`, or `getByText`, narrowed
only by `filter`, `first`, `last`, or `nth`. CSS and XPath selector strings, `getByTestId`, and DOM queries inside
`evaluate()` are prohibited. Reading a found element's state or `boundingBox()` is allowed.

Each spec scans each distinct reached page with axe after its ready check: a heading or result count, or the first
labelled field on the auth forms. Scans use WCAG 2.0 and 2.1 A/AA rules. `axe-baseline.ts` excuses only explicit route
patterns and rule IDs, each with a reason; a new violation of that same rule on that route is also excused until the
entry is removed. Other violations fail with the route, rule, and affected elements. The reporter lists unmatched
entries without failing, so focused runs and staging can omit a baselined page. Remove an entry when its violation
is fixed; staging can reveal live-content violations that local fixture data does not show.

### E2E Best Practices

Bring up a worktree's browsable stack from its root; the command migrates, seeds `dev` / `cinexplorer-dev`, and prints
its address. From `frontend/`, one command runs the five specs:

```bash
# Worktree root
node scripts/worktree.mjs browse

# frontend/; substitute SITE_PORT from infrastructure/.env
E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e

# Run only the flow changed by a task
E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/movie-detail.spec.ts
```

`E2E_BASE_URL` is required. Local credentials default to the seeded account, with `E2E_USERNAME` and `E2E_PASSWORD`
overrides available. The local target accepts the development certificate. Running sign-up against the primary
checkout sends real mail: use the worktree's browsable stack for the supported local run.

Registration permits three attempts per client IP per hour, including requests rejected for an existing account.
Repeated local sign-up runs can hit this limit. From the worktree root, clear only that stack's registration history,
then rerun:

```bash
docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml exec -T redis \
  sh -c 'redis-cli --scan --pattern "*:throttle_auth_register_*" | xargs -r redis-cli del'
```

For staging, export `E2E_BASE_URL`, `E2E_USERNAME`, and `E2E_PASSWORD` in your own terminal without putting credential
values in shell history, then run `E2E_TARGET=staging npm run test:e2e` from `frontend/`. All three settings are
required. Staging validates its HTTPS certificate. CI reads the URL variable and credential secrets from the
`staging` GitHub environment. Confirm a manual staging run before merge; registration is skipped, and its local
confirmation-notice baseline can therefore be listed as unmatched.

Keep the tier small and its run under five minutes. Backend and frontend integration tests cover detailed error and
boundary cases; a failure is diagnosed and corrected rather than retried.

---

## References

- [TECHNICAL-OVERVIEW.md](../../constitution/TECHNICAL-OVERVIEW.md) - `--keepdb` strategy, test database config
- [DEVELOPMENT-RULES.md](../../constitution/DEVELOPMENT-RULES.md) - Quality gates, test execution standards
- [Type Safety Strategy](./strategy-type-safety.md) - Type safety patterns for test code
- [testing-standards](../../methods/testing-standards.md) and [test-first](../../methods/test-first.md) - Test
  discipline and test-first decisions
- Task 6.0 - `tasks-api-layer-modernization-p2.md` - Test helper utilities implementation
- `notes-api-layer-modernization-p2.md` - "Test Helper Utilities Audit" section
