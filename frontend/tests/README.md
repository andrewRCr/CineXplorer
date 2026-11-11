# CineXplorer Frontend Testing

## Directory Structure

```text
frontend/
├── tests/
│   ├── setup.ts                         # Browser shims and MSW lifecycle
│   ├── browser-storage.ts               # jsdom storage before MSW loads
│   ├── helpers/
│   │   ├── test-providers.tsx            # App theme and isolated query client
│   │   ├── test-renderer.tsx             # Shared render with MemoryRouter
│   │   └── test-renderer-with-routes.tsx  # Route-aware render helpers
│   ├── mocks/
│   │   ├── handlers/                    # Shared HTTP response handlers
│   │   ├── server.ts                    # MSW Node server
│   │   └── movieData.ts                 # Movie fixture factories
│   └── integration/
└── src/
    └── .../__tests__/                   # Co-located component and hook tests
```

## Running Tests

Run these commands from `frontend/`:

```bash
npm run test
npm run test:watch
npm run test:coverage
npm run test -- src/pages/user/__tests__/Watchlist.test.tsx
npm run typegen
npm run type-check
```

Vitest executes the tests; TypeScript checking is a separate command. Generate
Chakra's types before type-checking in a fresh checkout.

## Shared Renderers

Import `render`, queries, and async utilities from the shared renderer:

```tsx
import { render, screen } from "@tests/helpers/test-renderer";
import Watchlist from "@/pages/user/Watchlist";

render(<Watchlist />);
expect(await screen.findByText("Fight Club")).toBeInTheDocument();
```

Both shared renderers provide:

- The application's default Marquee Chakra system, including its semantic
  tokens and recipes.
- A fresh TanStack Query client for each render call, with query and mutation
  retries disabled. Its cache survives `rerender` and is separate from other
  renders. Unused query caches do not schedule garbage-collection timers.
- A memory router. For route parameters, history entries, or navigation across
  routes, use `renderWithRoute` or `renderWithRoutes` from
  `@tests/helpers/test-renderer-with-routes`.

The shared renderers do not mount theme selection, color-mode management, or
background persistence. Tests of theme switching and saved preferences must
explicitly mount the production providers they exercise and control storage and
document state. The global `next-themes` mock also limits color-mode integration
coverage.

For computed recipe-style assertions, jsdom skips CSS `@layer` blocks. Use a
layer-free `styleSystem` and `expectResolvedColor` from `@tests/helpers/theme-styles`.
Both shared renderers accept an optional `system`, including when rendering routes:

```tsx
render(<Component />, { system: styleSystem });
renderWithRoute("/movie/:id", <MovieDetail />, {
  initialRoute: "/movie/123",
  system: styleSystem,
});
expectResolvedColor(element, "border-color", "var(--chakra-colors-border-subtle-01)");
```

The assertion resolves an independent sibling probe and compares computed colors;
assert transparent backgrounds directly because the probe rejects transparent values.

## Network Responses with MSW

Keep the component, hooks, services, and HTTP client real. Replace API responses
at the HTTP boundary with MSW 3's `http` and `HttpResponse` APIs.

Vitest fixes the document and application URLs to `http://localhost:3000`,
independent of the local frontend environment, so these application tests use
the same-origin API relationship.

The global setup starts the Node server with `onUnhandledFrame: "error"`.
Unexpected requests are blocked rather than sent to a live backend. Each test's
runtime handlers are reset afterward, and the server closes after the file.
Vitest resolves only MSW's server entry through Node; application dependencies
keep their browser exports.

Shared happy-path handlers live in `tests/mocks/handlers/`. Add a test-local
handler for empty, delayed, or error responses:

```tsx
import { http, HttpResponse } from "msw/http";
import { render, screen } from "@tests/helpers/test-renderer";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import Watchlist from "@/pages/user/Watchlist";

it("shows an empty watchlist", async () => {
    server.use(
        http.get(`${apiBaseUrl}/user-movie-data/movies`, () =>
            HttpResponse.json({
                page: 1,
                total_pages: 0,
                total_results: 0,
                results: [],
            }),
        ),
    );

    render(<Watchlist />);
    expect(
        await screen.findByText("No movies on watchlist"),
    ).toBeInTheDocument();
});
```

`Watchlist.test.tsx` also covers filtering, loading until a request completes,
and an HTTP failure. Its fixtures follow the generated API response types. Finish
delayed requests before ending a test so later tests inherit no pending work.

## Test Discipline

- Assert user-visible behavior, including error and empty states.
- Prefer role and accessible-name queries; use `userEvent` for interactions.
- Await asynchronous UI updates with `findBy*` or `waitFor`.
- Keep state and network responses isolated between tests.
- Use fixture factories from `@tests/mocks/movieData` for reusable movie data.
- Run integration flows against real components and services; avoid assertions
  whose only outcome is a mocked service's call arguments.

## Coverage

`npm run test:coverage` enforces the measured regression floors in
`vitest.config.ts`. Ordinary `npm run test` does not measure coverage. Prioritize
critical paths, error handling, and meaningful assertions over a percentage.
