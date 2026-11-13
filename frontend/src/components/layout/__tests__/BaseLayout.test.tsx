import { lazy, Suspense, useState, type ReactNode } from "react";
import {
  MemoryRouter,
  Routes,
  Route,
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import ErrorBoundary from "@/components/core/ErrorBoundary";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import { TestProviders } from "@tests/helpers/test-providers";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import BaseLayout from "../BaseLayout";

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  server.use(
    http.post(`${apiBaseUrl}/logs/`, () =>
      HttpResponse.json({ success: true }),
    ),
  );
});
afterEach(() => {
  delete window.__dismissPreloadOverlay;
});

function renderLayout(children: ReactNode, entry = "/broken") {
  return render(
    <ThemeSelectProvider>
      <TestProviders system={styleSystem}>
        <MemoryRouter initialEntries={[entry]}>
          <AuthContextProvider>
            <Suspense fallback={<p>Outside loading...</p>}>
              <Link to="/broken?fixed=1">Change query</Link>
              <Routes>
                <Route
                  element={
                    <BaseLayout>
                      <Outlet />
                    </BaseLayout>
                  }
                >
                  <Route path="/broken" element={children} />
                  <Route path="/browse" element={<h1>Film catalog</h1>} />
                </Route>
              </Routes>
            </Suspense>
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>
    </ThemeSelectProvider>,
  );
}
function BrokenPage() {
  const { search } = useLocation();
  if (!search) throw new Error("Page failed");
  return <h1>Recovered page</h1>;
}

it("contains a page error between a working bar and footer", async () => {
  const user = userEvent.setup();
  renderLayout(<BrokenPage />);
  const heading = screen.getByRole("heading", {
    level: 1,
    name: "Oops! Something went wrong",
  });
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Try Again" })).toBeVisible();
  const banner = screen.getByRole("banner");
  const footer = screen.getByRole("contentinfo");
  expect(
    banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    heading.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  await user.click(screen.getByRole("link", { name: "Films" }));
  expect(
    await screen.findByRole("heading", { name: "Film catalog" }),
  ).toBeVisible();
  expect(
    screen.queryByText("Oops! Something went wrong"),
  ).not.toBeInTheDocument();
});

it("clears a page error when only the query changes", async () => {
  const user = userEvent.setup();
  renderLayout(<BrokenPage />);
  expect(screen.getByText("Oops! Something went wrong")).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Change query" }));
  expect(
    await screen.findByRole("heading", { name: "Recovered page" }),
  ).toBeVisible();
});

it("retries a failed page in place", async () => {
  let fail = true;
  function RetryPage() {
    if (fail) throw new Error("Retryable failure");
    return <h1>Ready after retry</h1>;
  }
  const user = userEvent.setup();
  renderLayout(<RetryPage />);
  expect(screen.getByText("Oops! Something went wrong")).toBeVisible();
  fail = false;
  await user.click(screen.getByRole("button", { name: "Try Again" }));
  expect(
    screen.getByRole("heading", { name: "Ready after retry" }),
  ).toBeVisible();
});

it("keeps state inside the content area across path and query navigation", async () => {
  function StatefulLayout() {
    const [count, setCount] = useState(0);
    return (
      <>
        <button onClick={() => setCount(count + 1)}>Count {count}</button>
        <Link to="/second">Next path</Link>
        <Link to="/second?x=1">Next query</Link>
        <Outlet />
      </>
    );
  }
  const user = userEvent.setup();
  render(
    <ThemeSelectProvider>
      <TestProviders>
        <MemoryRouter initialEntries={["/first"]}>
          <AuthContextProvider>
            <Routes>
              <Route
                element={
                  <BaseLayout>
                    <Outlet />
                  </BaseLayout>
                }
              >
                <Route element={<StatefulLayout />}>
                  <Route path="/first" element={<h1>First</h1>} />
                  <Route path="/second" element={<h1>Second</h1>} />
                </Route>
              </Route>
            </Routes>
          </AuthContextProvider>
        </MemoryRouter>
      </TestProviders>
    </ThemeSelectProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Count 0" }));
  await user.click(screen.getByRole("link", { name: "Next path" }));
  expect(screen.getByRole("button", { name: "Count 1" })).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Next query" }));
  expect(screen.getByRole("button", { name: "Count 1" })).toBeVisible();
});

it.each([null, "google", "github"])(
  "loads a lazy page under the bar (provider=%s)",
  async (provider) => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const Page = lazy(async () => {
      await pending;
      return { default: () => <h1>Lazy page</h1> };
    });
    if (provider) sessionStorage.setItem("oauth_in_progress", provider);
    const dismissed = vi.fn();
    window.__dismissPreloadOverlay = dismissed;
    renderLayout(<Page />);
    expect(screen.getByRole("banner")).toBeVisible();
    const message = provider
      ? `Logging in with ${provider === "google" ? "Google" : "GitHub"}...`
      : "Loading...";
    expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(dismissed).toHaveBeenCalledTimes(1);
    await act(async () => {
      release?.();
      await pending;
    });
    expect(
      await screen.findByRole("heading", { name: "Lazy page" }),
    ).toBeVisible();
    expect(dismissed).toHaveBeenCalledTimes(1);
  },
);

it("colors the error display separator with the subtle theme border", async () => {
  function Throw(): never {
    throw new Error("Details failure");
  }
  render(
    <ThemeSelectProvider>
      <TestProviders system={styleSystem}>
        <ErrorBoundary showErrorDetails>
          <Throw />
        </ErrorBoundary>
      </TestProviders>
    </ThemeSelectProvider>,
  );
  const separator = await screen.findByRole("separator");
  expectResolvedColor(
    separator,
    "border-top-color",
    "var(--chakra-colors-border-subtle-01)",
  );
});
