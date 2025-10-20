# CineXplorer Frontend Testing

## Directory Structure

```
frontend/
├── tests/                      # Test configuration & integration tests
│   ├── setup.ts               # Global test setup (Vitest config)
│   ├── helpers/               # Test utility functions
│   │   └── test-renderer.tsx  # Custom render with providers
│   ├── mocks/                 # Mock data & API responses
│   │   ├── movieData.ts       # Movie mock factories
│   │   └── apiMocks.ts        # API service mocks
│   └── README.md              # This file
└── src/
    └── components/
        └── __tests__/         # Component unit tests (co-located)
            └── Component.test.tsx
```

## Testing Philosophy

### Co-located Tests

- Unit tests are placed in `__tests__/` directories next to components
- Integration tests go in the main `tests/` directory
- This keeps tests close to the code they're testing

### Test Types

1. **Unit Tests** - Individual components/hooks/utilities
2. **Integration Tests** - Component interactions, routing, API integration
3. **End-to-End Tests** - Full user workflows (separate E2E setup)

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test MovieCard.test.tsx

# Run tests for specific directory
npm run test src/components/movie
```

## Test Structure Guidelines

### 1. Component Tests

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Reset mocks, setup common data
  });

  it('renders correctly with default props', () => {
    // Test basic rendering
  });

  it('handles user interactions', () => {
    // Test click handlers, form submissions, etc.
  });

  it('handles edge cases', () => {
    // Test error states, missing data, etc.
  });
});
```

### 2. Hook Tests

```typescript
describe('useCustomHook', () => {
  it('returns expected initial state', () => {
    // Test initial values
  });

  it('updates state correctly', () => {
    // Test state changes
  });
});
```

## Mock Strategy

### API Mocks

- Use factory functions for consistent mock data
- Mock at the service layer, not the HTTP layer
- Reset mocks between tests

### Component Mocks

- Mock heavy/complex child components
- Mock external dependencies (router, etc.)
- Use real implementations when possible

## Best Practices

### ✅ Do

- Test user behavior, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test error states and edge cases
- Keep tests focused and isolated
- Use descriptive test names

### ❌ Don't

- Test implementation details
- Use snapshot testing excessively
- Create overly complex test setups
- Test third-party library functionality
- Ignore async behavior

## Available Testing Utilities

### Custom Render

```typescript
import { render } from '@tests/helpers/test-renderer';
// Includes Chakra UI and React Router providers
```

### Mock Factories

```typescript
import { createMockMovie, createMockMovies } from '@tests/mocks/movieData';
```

### API Mocks

```typescript
import { mockMovieService, resetAllMocks } from '@tests/mocks/apiMocks';
```

## Coverage Goals

- **Lines**: 70%+ (configured in vitest.config.ts)
- **Functions**: 70%+
- **Branches**: 70%+
- **Statements**: 70%+

Focus on testing critical paths and user-facing functionality rather than achieving 100% coverage.

## TypeScript Configuration

The test environment is fully TypeScript compatible:

- **Path Aliases**: `@tests/*`, `@shared`, `@/*` all work correctly
- **jest-dom Matchers**: `toBeInTheDocument()`, `toHaveAttribute()` fully typed
- **JSX Support**: Full React component testing with proper type checking
- **Shared Types**: Access to shared API types from backend

### VSCode Integration

The project includes VSCode settings for optimal TypeScript experience:

- Auto-imports from path aliases
- Proper IntelliSense for test utilities
- Error highlighting for test files

### Type Checking

```bash
# Check all TypeScript (including tests)
npm run type-check

# Run tests with TypeScript validation
npm test
```
