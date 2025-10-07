# Testing Methodology Strategy

**Version**: 1.1
**Last Updated**: 2025-01-07
**Status**: Active
**Scope**: Full-stack (Backend + Frontend)

## Purpose

This document establishes testing standards and patterns for CineXplorer's **full-stack** test infrastructure (Django backend + React frontend) to ensure:
- **DRY principle**: Eliminate duplicate test utilities across domains and layers
- **Type safety**: Consistent type-safe test helper signatures (Python + TypeScript)
- **Database compatibility**: Support for `--keepdb` flag per TECHNICAL-ARCHITECTURE.md (backend)
- **Clear organization**: Know where to find/add test utilities across the stack

## Table of Contents

### Part 1: Common Principles

- [Test Helper Hierarchy (Common)](#test-helper-hierarchy-common)

### Part 2: Common Testing Philosophy

- [Testing Philosophy (Full-Stack)](#testing-philosophy-full-stack)
    - [Three-Layer Testing](#three-layer-testing-per-phase-1-blueprint)
    - [Test Coverage Targets](#test-coverage-targets-per-technical-architecturemd)
    - [Quality Gates](#quality-gates-full-stack)

### Part 3: Backend Testing (Django/Ninja)

- [Backend Test Helper Hierarchy](#backend-test-helper-hierarchy)
    - [Tier 1: Core Shared Helpers](#tier-1-core-shared-helpers-backendappscoreteststest_helperspy)
    - [Tier 2: Domain Fixtures](#tier-2-domain-fixtures)
    - [Tier 3: Inline Helpers](#tier-3-inline-test-helpers)
- [Backend Type Safety Standards](#type-safety-standards)
- [Backend Database Compatibility](#database-compatibility)
- [Re-exporting Stdlib Utilities](#re-exporting-stdlib-utilities)
- [Backend Migration Guide (Phase 6)](#backend-migration-guide-phase-6)
- [Backend Current State (Phase 4)](#backend-current-state-phase-4)
- [Backend Anti-Patterns](#backend-anti-patterns-to-avoid)

### Part 4: Frontend Testing (React/Vitest)

- [Frontend Test Helper Hierarchy](#frontend-test-helper-hierarchy)
    - [Tier 1: Core Shared Helpers](#tier-1-core-shared-helpers-frontendsrctesthelpers)
    - [Tier 2: Feature Test Utilities](#tier-2-feature-test-utilities)
    - [Tier 3: Inline Helpers](#tier-3-inline-test-helpers-1)
- [Frontend Type Safety Standards](#frontend-type-safety-standards)
- [Frontend Testing Patterns](#frontend-testing-patterns)
- [Frontend Current State](#frontend-current-state)
- [Frontend Anti-Patterns](#frontend-anti-patterns-to-avoid)

### Part 5: Integration Testing

- [E2E Test Coordination](#e2e-test-coordination)
- [E2E Test Structure](#e2e-test-structure)
- [E2E Best Practices](#e2e-best-practices)

### References

- [References](#references)

---

## Part 1: Common Principles

These principles apply to **both backend and frontend** testing.

## Test Helper Hierarchy (Common)

CineXplorer uses a three-tier hierarchy for test utilities across the stack:

1. **Core Shared Helpers**: Cross-cutting utilities (HTTP, basic models, common assertions)
2. **Domain/Feature Fixtures**: Domain-specific factories and complex setup
3. **Inline Helpers**: Test-specific one-offs

This hierarchy applies to both:
- **Backend**: `backend/apps/{app}/tests/` directories
- **Frontend**: `frontend/src/{feature}/__tests__/` directories

---

## Part 2: Common Testing Philosophy

## Testing Philosophy (Full-Stack)

### Three-Layer Testing (per Phase 1 blueprint)

**Backend:**
1. **API Integration Tests**: Full request/response cycle via Django test client
2. **Service Layer Tests**: Business logic isolated from HTTP/ORM
3. **Specialized Tests**: Edge cases, mocks, performance

**Frontend:**
1. **Component Tests**: User interactions with React Testing Library
2. **Integration Tests**: Feature flows with mocked APIs
3. **E2E Tests**: Critical paths with Playwright

### Test Coverage Targets (per TECHNICAL-ARCHITECTURE.md)

**Backend:**
- **Minimum**: 70% coverage across entire API layer
- **Critical paths**: 90%+ (authentication, payment flows, data integrity)
- **Focus**: Integration tests over unit tests (test real workflows)

**Frontend:**
- **Minimum**: 70% coverage across components and features
- **Critical paths**: 90%+ (authentication, checkout, user flows)
- **Focus**: User-visible behavior over implementation details

### Quality Gates (Full-Stack)

**Backend:**
- 100% test pass rate (`python manage.py test`)
- 70%+ coverage minimum
- Zero linting violations (ruff)
- Zero type errors (Pyright + MyPy)

**Frontend:**
- 100% test pass rate (`npm test`)
- 70%+ coverage minimum
- Zero linting violations (ESLint)
- Zero type errors (TypeScript)

---

## Part 3: Backend Testing (Django/Ninja)

## Backend Test Helper Hierarchy

### Tier 1: Core Shared Helpers (`backend/apps/core/tests/test_helpers.py`)

**Purpose**: Cross-cutting utilities used across multiple domains

**What Belongs Here:**
- HTTP request helpers (`json_post`, `json_patch`, `json_put`)
- HTTP status code utilities (re-exported `HTTPStatus` from stdlib)
- Basic model creation (`create_user` without domain-specific setup)
- Generic assertion helpers
- Type definitions used across test files (`UserParams`, etc.)

**Example:**

```python
from core.tests.test_helpers import create_user, json_post, HTTPStatus

user = create_user(username='testuser', email='test@example.com')
response = json_post(client, '/api/endpoint/', {'data': 'value'})
assert response.status_code == HTTPStatus.OK
```

**Standards:**
- Type-safe signatures using `TypedDict` for parameters
- Use `get_or_create()` for models that may exist across test runs (EmailAddress)
- Document `--keepdb` compatibility in docstrings
- Minimal domain-specific logic (keep generic)

### Tier 2: Domain Fixtures

**Purpose**: Domain-specific test data factories and complex setup

**What Belongs Here:**
- Domain-specific model factories with rich defaults
- Complex domain setup (OAuth social accounts, TMDB mock responses, etc.)
- Payload creation helpers with domain validation
- Mock service factories (mock TMDB client, mock email service, etc.)

**Examples by Domain:**

**Authentication** (`authentication/tests/fixtures.py`):

```python
# Rich user creation with email verification
create_user(email_verified=True, **params)

# Social authentication setup
create_social_app(provider='google')
create_social_account(user, provider='google')

# Payload factories
create_register_payload(username='user', email='user@example.com')
create_login_payload(identifier='user', use_email=False)
```

**Movie** (future: `movie/tests/fixtures.py`):

```python
# TMDB mock response factories
create_mock_tmdb_response(tmdb_id=550, title='Fight Club')

# Movie creation with TMDB data
create_movie(tmdb_id=550, **overrides)
```

**UserMovieData** (future: `user_movie_data/tests/fixtures.py`):

```python
# User-movie relationship creation
create_user_movie_data(user, movie, user_watched=True, user_rating=5)
```

**Standards:**
- Import basic utilities from `core/tests/test_helpers`
- Extend basic helpers with domain-specific defaults
- Document what each fixture represents in docstrings
- Use `get_or_create()` for external dependencies (EmailAddress, SocialApp)

### Tier 3: Inline Test Helpers

**Purpose**: Test-specific one-off utilities that don't generalize

**What Belongs Here:**
- Edge case data generators (malformed payloads, boundary values)
- Test-specific assertion helpers (used in single test class)
- Unusual state setup (corrupt data, race conditions, etc.)

**When to Use:**
- Helper is used in only ONE test file
- Helper is testing an edge case, not normal operation
- Extracting would make code less readable (too specific)

**Example:**

```python
class MovieAPIEdgeCaseTests(TestCase):
    def create_malformed_tmdb_response(self):
        """Create TMDB response with missing required fields."""
        return {'id': 550}  # Missing title, poster_path, etc.
```

## When to Use Each Tier

### Use Core Helpers When

- ✅ Utility is used in 2+ domains
- ✅ Logic is generic (HTTP, basic models, assertions)
- ✅ No domain-specific business rules

### Use Domain Fixtures When

- ✅ Utility is specific to one domain
- ✅ Complex setup with multiple steps
- ✅ Domain-specific validation/defaults
- ✅ Used across multiple test files in same domain

### Use Inline Helpers When

- ✅ Used in single test file only
- ✅ Edge case or unusual scenario
- ✅ Test-specific assertion logic

## Type Safety Standards

All test helpers must follow type safety patterns:

### Parameter Types

```python
from typing import TypedDict, Unpack

class UserParams(TypedDict, total=False):
    """Type for user creation parameters."""
    username: str
    email: str
    password: str
    first_name: str
    last_name: str

def create_user(**params: Unpack[UserParams]) -> AbstractUser:
    """Create and return a new user for testing."""
    # Implementation
```

### Return Types

```python
def json_post(
    client: Client,
    url: str,
    data: dict[str, object],
    **kwargs: object
) -> HttpResponse:
    """POST JSON data to Django Ninja endpoint."""
    return client.post(url, json.dumps(data), content_type='application/json', **kwargs)
```

### Avoid `Any`

- Use `object` for unknown types
- Use `dict[str, object]` for generic dictionaries
- Document type limitations with comments

## Database Compatibility

### `--keepdb` Support

Per TECHNICAL-ARCHITECTURE.md, all test helpers must support `--keepdb` flag:

**Problem**: Models with unique constraints fail on second test run

```python
# ❌ WRONG - fails with --keepdb
EmailAddress.objects.create(user=user, email=user.email, verified=True)
# IntegrityError: duplicate key on second run
```

**Solution**: Use `get_or_create()` with defaults

```python
# ✅ CORRECT - works with --keepdb
EmailAddress.objects.get_or_create(
    user=user,
    email=user.email,
    defaults={'verified': True, 'primary': True}
)
```

**Models Requiring `get_or_create()`:**
- `allauth.account.models.EmailAddress` (user + email unique constraint)
- `allauth.socialaccount.models.SocialApp` (provider unique constraint)
- Any model with unique constraints used across tests

**Standard Pattern:**

```python
def create_user(email_verified: bool = True, **params: Unpack[UserParams]) -> AbstractUser:
    """Create user with --keepdb support."""
    user = User.objects.create_user(**{**defaults, **params})

    if email_verified:
        EmailAddress.objects.get_or_create(  # get_or_create, not create
            user=user,
            email=user.email,
            defaults={'verified': True, 'primary': True}
        )

    return user
```

## Re-exporting Stdlib Utilities

To reduce imports and provide consistent testing interface, core helpers re-export useful stdlib tools:

```python
# core/tests/test_helpers.py
from http import HTTPStatus

__all__ = ["HTTPStatus", "create_user", "json_post", "json_patch", "json_put"]
```

**Benefits:**
- Single import point: `from core.tests.test_helpers import HTTPStatus, json_post`
- No dependency on DRF: `HTTPStatus` is stdlib, not `rest_framework.status`
- Type-safe: `HTTPStatus` is an IntEnum with full type checker support

## Backend Migration Guide (Phase 6)

When Phase 6 comprehensive testing begins, follow this consolidation process:

### Step 1: Audit Duplicate Helpers

```bash
# Find duplicate create_user implementations
grep -rn "def create_user" backend/apps/*/tests/ --include="*.py"
```

### Step 2: Identify Domain-Specific Needs

- Does helper need EmailAddress verification? → Use `core.tests.test_helpers.create_user(email_verified=True)`
- Does helper need OAuth setup? → Create `authentication/tests/fixtures.py` wrapper
- Does helper need TMDB mocks? → Create `movie/tests/fixtures.py` helper

### Step 3: Update Imports

```python
# OLD (inline helper in test file)
def create_user(**params):
    return User.objects.create_user(**params)

# NEW (import from core)
from core.tests.test_helpers import create_user
```

### Step 4: Verify Tests Pass

```bash
# Run domain tests after migration
docker compose exec backend python manage.py test apps.{domain} --keepdb --settings=config.settings_test
```

## Backend Current State (Phase 4)

### Consolidated Helpers

- ✅ `core/tests/test_helpers.py` - HTTP helpers, basic `create_user`, HTTPStatus
- ✅ `authentication/tests/fixtures.py` - OAuth fixtures, verified user creation
- ✅ `movie/tests/test_movie_api.py` - Now imports from core (duplicates removed)
- ✅ `user_movie_data/tests/test_user_movie_data_api.py` - Now imports from core (duplicates removed)

### Next Steps

1. **Phase 6**: Create domain fixture files for movie (TMDB mocks) and user_movie_data
2. **Phase 6**: Implement shared helpers per notes-api-layer-modernization-p2.md "Test Helper Utilities Audit"

## Backend Anti-Patterns to Avoid

### ❌ Don't: Copy-paste helpers between test files

```python
# movie/tests/test_movie_api.py
def create_user(**params):
    return User.objects.create_user(**params)

# user_movie_data/tests/test_user_movie_data_api.py
def create_user(**params):  # DUPLICATE!
    return User.objects.create_user(**params)
```

### ✅ Do: Import from shared location

```python
# Both files
from core.tests.test_helpers import create_user
```

### ❌ Don't: Use `create()` for unique-constraint models

```python
EmailAddress.objects.create(user=user, email=user.email)  # Fails with --keepdb
```

### ✅ Do: Use `get_or_create()` with defaults

```python
EmailAddress.objects.get_or_create(
    user=user, email=user.email,
    defaults={'verified': True, 'primary': True}
)
```

### ❌ Don't: Import DRF utilities in Django Ninja tests

```python
from rest_framework.test import APIClient  # Wrong framework!
from rest_framework import status
```

### ✅ Do: Use Django test client and stdlib

```python
from django.test import Client
from core.tests.test_helpers import HTTPStatus  # stdlib re-export
```

---

## Part 4: Frontend Testing (React/Vitest)

## Frontend Test Helper Hierarchy

### Tier 1: Core Shared Helpers (`frontend/src/test/helpers/`)

**Purpose**: Cross-cutting utilities used across multiple features

**What Belongs Here:**
- Render helpers with providers (`renderWithProviders`, `renderWithRouter`)
- Mock factory functions (`createMockUser`, `createMockMovie`)
- Common test utilities (`waitForLoadingToFinish`, `findByTestId`)
- Type definitions for test data (`MockUserData`, `MockMovieData`)

**Example Structure:**

```typescript
// frontend/src/test/helpers/render.ts
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContextProvider } from '@/components/auth/AuthContextProvider';

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

**Standards:**
- Type-safe signatures with TypeScript generics
- Export reusable mock factories
- Document provider requirements in JSDoc comments
- Minimal feature-specific logic (keep generic)

### Tier 2: Feature Test Utilities

**Purpose**: Feature-specific test helpers and mocks

**What Belongs Here:**
- Feature-specific mock data factories
- Component-specific setup utilities
- Feature API mock responses
- Custom matchers for feature assertions

**Examples by Feature:**

**Authentication** (`frontend/src/features/auth/__tests__/utils.ts`):

```typescript
// Mock auth responses
export const createMockLoginResponse = (overrides = {}) => ({
  access: 'mock_access_token',
  refresh: 'mock_refresh_token',
  user_id: 1,
  email_verified: true,
  ...overrides
});

// Setup authenticated state
export const setupAuthenticatedUser = (user = createMockUser()) => {
  // Mock localStorage, cookies, etc.
};
```

**Movies** (`frontend/src/features/movies/__tests__/utils.ts`):

```typescript
// Mock movie data
export const createMockMovie = (overrides = {}) => ({
  tmdb_id: 550,
  title: 'Fight Club',
  poster_path: '/path.jpg',
  release_date: '1999-10-15',
  ...overrides
});

// Mock TMDB API responses
export const mockTMDBResponse = (movies: Movie[]) => ({
  results: movies,
  page: 1,
  total_pages: 1,
  total_results: movies.length
});
```

### Tier 3: Inline Test Helpers

**Purpose**: Component-specific test utilities

**When to Use:**
- Helper used in single test file only
- Component-specific setup/teardown
- Edge case data generators

**Example:**

```typescript
describe('LoginForm', () => {
  const createInvalidFormData = () => ({
    login: '', // Invalid: empty
    password: 'abc' // Invalid: too short
  });

  it('shows validation errors', () => {
    // Use inline helper
  });
});
```

## Frontend Type Safety Standards

### Mock Type Definitions

```typescript
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
```

### Factory Functions

```typescript
export function createMockUser(overrides: DeepPartial<MockUserData> = {}): MockUserData {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    email_verified: true,
    ...overrides
  };
}
```

## Frontend Testing Patterns

### Component Testing

```typescript
import { renderWithProviders } from '@/test/helpers/render';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginPage', () => {
  it('submits login form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });
});
```

### API Mocking (MSW)

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/token/', (req, res, ctx) => {
    return res(ctx.json(createMockLoginResponse()));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Frontend Current State

### Test Infrastructure

- ✅ Vitest configured with React Testing Library
- ✅ 321 frontend tests (all passing per Phase 1)
- ⚠️ Test helpers not yet consolidated (deferred to Phase 6)

### Next Steps

1. **Phase 5**: Frontend integration with new Django Ninja endpoints
2. **Phase 6**: Consolidate frontend test helpers following this strategy
3. **Phase 6**: Create feature-specific test utilities per testing pyramid

## Frontend Anti-Patterns to Avoid

### ❌ Don't: Test implementation details

```typescript
// Bad: Testing state internals
expect(component.state.isLoading).toBe(false);
```

### ✅ Do: Test user-visible behavior

```typescript
// Good: Testing what users see
expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
```

### ❌ Don't: Duplicate mock factories

```typescript
// auth/__tests__/Login.test.tsx
const mockUser = () => ({ id: 1, username: 'test' });

// profile/__tests__/Profile.test.tsx
const mockUser = () => ({ id: 1, username: 'test' }); // DUPLICATE!
```

### ✅ Do: Import from shared helpers

```typescript
import { createMockUser } from '@/test/helpers/mocks';
```

---

## Part 5: Integration Testing (Full-Stack)

## E2E Test Coordination

### When to Use E2E Tests

- Critical user flows (registration → verification → login → feature use)
- Cross-layer interactions (frontend → API → database → frontend)
- Payment/transaction flows
- OAuth authentication flows

### E2E Test Structure

```typescript
// e2e/tests/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test('user can register and verify email', async ({ page }) => {
  // Frontend: Fill registration form
  await page.goto('/register');
  await page.fill('[name="username"]', 'newuser');
  await page.fill('[name="email"]', 'new@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Backend: Verify email sent (mock or test inbox)
  // Frontend: Verify success message
  await expect(page.locator('text=Check your email')).toBeVisible();
});
```

### E2E Best Practices

- Use E2E for happy paths and critical flows only
- Rely on unit/integration tests for edge cases
- Mock external services (TMDB, email) in E2E
- Keep E2E suite small and fast (<5 minutes)

---

## References

- [TECHNICAL-ARCHITECTURE.md](../constitution/TECHNICAL-ARCHITECTURE.md) - `--keepdb` strategy, test database config
- [DEVELOPMENT-RULES.md](../constitution/DEVELOPMENT-RULES.md) - Quality gates, test execution standards
- [Type Safety Strategy](./strategy-type-safety.md) - Type safety patterns for test code
- [Phase 2 Task List](../../active/tasks-api-layer-modernization-p2.md) - Task 6.0: Test helper utilities implementation
- [Phase 2 Notes](../../active/notes-api-layer-modernization-p2.md) - "Test Helper Utilities Audit" section
