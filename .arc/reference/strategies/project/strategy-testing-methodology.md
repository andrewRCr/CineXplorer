# Testing Methodology Strategy

**Version:** 1.5 | **Updated:** 2026-10-30 | **Status:** Active | **Scope:** Full-stack

## Purpose

Testing standards and patterns for CineXplorer's full-stack infrastructure (Django + React):

- **DRY principle** - Eliminate duplicate test utilities
- **Type safety** - Consistent helper signatures (Python + TypeScript)
- **Database compatibility** - `--keepdb` support
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
2. **Service Layer Tests** - Business logic isolated from HTTP/ORM
3. **Specialized Tests** - Edge cases, mocks, performance

**Frontend:**

1. **Component Tests** - User interactions with React Testing Library
2. **Integration Tests** - Feature flows with mocked APIs
3. **E2E Tests** - Critical paths with Playwright

### Coverage Targets

**Backend:**

- Minimum: 80% branch coverage (general application code)
- Critical paths: 90%+ branch coverage (auth, payments, data integrity)
- Security-critical: 95%+ branch coverage (token management, session handling)
- Focus: Integration over unit tests

**Frontend:**

- Minimum: 80% branch coverage (component/feature coverage)
- Critical paths: 90%+ branch coverage (auth, checkout, flows)
- Focus: User behavior over implementation

**Rationale:** Targets align with industry consensus (Google "commendable" tier, Microsoft standard, OWASP
security guidance). 80% represents practical ROI inflection point; 90%+ for critical paths reflects
risk-based testing prioritization per industry best practices.

### Quality Gates

**Backend:** 100% pass rate, 80%+ coverage, zero lint/type errors
**Frontend:** 100% pass rate, 80%+ coverage, zero lint/type errors

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
    ├── integration/
    │   ├── conftest.py          # Integration-specific fixtures (if needed)
    │   ├── test_api_endpoints.py
    │   └── test_database_queries.py
    └── e2e/                     # Placeholder for future E2E tests
        └── test_workflows.py
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

# Future E2E structure (Playwright)
e2e/
├── playwright.config.ts
└── specs/
    ├── auth.spec.ts
    └── movie-discovery.spec.ts
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

**E2E Tests** (`tests/e2e/` or `e2e/specs/*.spec.ts`):

- Critical user workflows (registration → login → feature use)
- Cross-layer interactions (frontend → API → database)
- Payment/transaction flows
- OAuth authentication flows
- Slowest execution (1s+ per test)

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

# Full quality gates
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

**Standards:** Type-safe `TypedDict` signatures, `get_or_create()` for unique constraints, `--keepdb` compatible.

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

**Standards:** Import from core helpers, extend with domain defaults, use `get_or_create()`.

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

### Centralized Mock Paths

**Purpose:** Prevent stale mocks when implementations change by centralizing mock target paths.

**Pattern:** Each app maintains a `mock_paths.py` file with constants for commonly-mocked module paths.

```python
# apps/{app}/tests/mock_paths.py
"""Centralized mock target paths for {app} tests."""

AUTH_SERVICE_SEND_VERIFICATION_EMAIL = (
    "apps.authentication.services.authentication_service.send_verification_email_to_address"
)

AUTH_SERVICE_TRANSACTION_ATOMIC = (
    "apps.authentication.services.authentication_service.transaction.atomic"
)
```

**Usage:**

```python
from apps.authentication.tests.mock_paths import AUTH_SERVICE_SEND_VERIFICATION_EMAIL

@patch(AUTH_SERVICE_SEND_VERIFICATION_EMAIL)
def test_registration_sends_email(mock_send_email: Mock) -> None:
    mock_send_email.return_value = True
    # ...
```

**Benefits:**

- **Single update point:** When implementation changes, update one file
- **Discoverability:** All mockable paths visible in one place
- **Consistency:** Prevents typos and path drift across test files
- **Refactoring safety:** IDE can find all usages when paths change

**Current mock_paths.py files:**

| App             | File                  | Paths                                         |
|-----------------|-----------------------|-----------------------------------------------|
| authentication  | `tests/mock_paths.py` | Email sending, transaction, schema validation |
| core            | `tests/mock_paths.py` | TMDB settings, API client, DB connections     |
| movie           | `tests/mock_paths.py` | TMDB client, blacklist, dedup, batch logger   |
| user_movie_data | `tests/mock_paths.py` | Fetch movies batch                            |

**When to add paths:**

- Path is used in 2+ test files
- Path targets internal implementation likely to change
- Path is complex (nested modules, long strings)

**Anti-pattern:** Hardcoding paths directly in test decorators.

```python
# ❌ WRONG - hardcoded path
@patch("apps.authentication.services.authentication_service.send_verification_email_to_address")

# ✅ CORRECT - centralized path
@patch(AUTH_SERVICE_SEND_VERIFICATION_EMAIL)
```

### Database Compatibility

**`--keepdb` Support:** Use `get_or_create()` for unique constraints.

```python path=null start=null
# ❌ WRONG - fails with --keepdb
EmailAddress.objects.create(user=user, email=user.email, verified=True)

# ✅ CORRECT - works with --keepdb
EmailAddress.objects.get_or_create(
    user=user, email=user.email,
    defaults={'verified': True, 'primary': True}
)
```

**Pattern:**

```python path=null start=null
def create_user(email_verified: bool = True, **params: Unpack[UserParams]) -> AbstractUser:
    user = User.objects.create_user(**{**defaults, **params})
    if email_verified:
        EmailAddress.objects.get_or_create(
            user=user, email=user.email,
            defaults={'verified': True, 'primary': True}
        )
    return user
```

### Re-exporting Stdlib Utilities

```python path=null start=null
# core/tests/test_helpers.py
from http import HTTPStatus
__all__ = ["HTTPStatus", "create_user", "json_post", "json_patch", "json_put"]
```

**Benefits:** Single import point, no DRF dependency, type-safe IntEnum.

### Current State

**Test Organization Standardization Complete (2025-11):**

- ✅ 441 tests across 48 test files
- ✅ Unit/integration directory structure standardized across all apps
- ✅ Parallel execution supported
- ✅ CI/CD runs all tests via `pytest apps/`

**Test Counts by App:**

| App             | Test Files | Directory Structure                                   |
|-----------------|------------|-------------------------------------------------------|
| movie           | 23         | `unit/services/`, `unit/helpers/`, `integration/api/` |
| authentication  | 13         | `integration/` (all integration tests)                |
| user_movie_data | 6          | `unit/`, `integration/`                               |
| core            | 6          | `integration/`                                        |

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
- Use `create()` for unique constraints
- Import DRF utilities in Django Ninja tests

**✅ Do:**

- Import from shared locations
- Use `get_or_create()` with defaults
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

// API Mocking (MSW)
const server = setupServer(
  rest.post('/api/token/', (req, res, ctx) => {
    return res(ctx.json(createMockLoginResponse()));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Asserting Chakra Recipe Styles

The shared renderer (`tests/helpers/test-renderer.tsx`) wraps Chakra's own `defaultSystem` from `@chakra-ui/react`,
which doesn't include the project's recipes. Recipe styles also sit in CSS `@layer` blocks, which jsdom's
`getComputedStyle` skips. So a style assertion under the shared renderer can pass without the recipe ever applying.

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
- ✅ 321 tests passing
- ⚠️ Test helpers consolidation deferred to Phase 6

**Next:** Phase 5 integration with Django Ninja, Phase 6 helper consolidation.

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

**When to use E2E tests:**

- Critical user flows (registration → verification → login)
- Cross-layer interactions (frontend → API → database)
- Payment/transaction flows
- OAuth authentication flows

### E2E Test Structure

```typescript path=null start=null
test('user can register and verify email', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name="username"]', 'newuser');
  await page.fill('[name="email"]', 'new@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=Check your email')).toBeVisible();
});
```

### E2E Best Practices

- Happy paths and critical flows only
- Unit/integration tests for edge cases
- Mock external services (TMDB, email)
- Keep suite small and fast (<5 minutes)

---

## References

- [TECHNICAL-OVERVIEW.md](../../constitution/TECHNICAL-OVERVIEW.md) - `--keepdb` strategy, test database config
- [DEVELOPMENT-RULES.md](../../constitution/DEVELOPMENT-RULES.md) - Quality gates, test execution standards
- [Type Safety Strategy](./strategy-type-safety.md) - Type safety patterns for test code
- [testing-standards](../../methods/testing-standards.md) and [test-first](../../methods/test-first.md) - Test
  discipline and test-first decisions
- Task 6.0 - `tasks-api-layer-modernization-p2.md` - Test helper utilities implementation
- `notes-api-layer-modernization-p2.md` - "Test Helper Utilities Audit" section
