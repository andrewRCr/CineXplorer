import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import { TestProviders } from "@tests/helpers/test-providers";
import { authHandlers, clearBrowserAuth, token } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";
import App from "../App";

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
  window.location.pathname = "/";
  window.location.search = "";
  window.history.replaceState({}, "", "/");
});
function startAt(path: string) {
  // The test environment supplies a writable location; keep its path aligned with browser history.
  window.location.pathname = path;
  window.location.search = "";
  window.history.replaceState({}, "", path);
  return render(
    <ThemeSelectProvider>
      <TestProviders>
        <App />
      </TestProviders>
    </ThemeSelectProvider>,
  );
}

it("contains a shell failure in the last-resort full-page display", async () => {
  window.__dismissPreloadOverlay = () => {
    throw new Error("Shell failed");
  };
  startAt("/login");
  expect(
    await screen.findByRole("heading", { name: "Oops! Something went wrong" }),
  ).toBeVisible();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
});

it("loads the protected development page with a page-level fallback", async () => {
  setAuthTokens(token());
  startAt("/testlogin");
  expect(screen.getByText("Loading...")).toBeVisible();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: "Get User Details" }),
  ).toBeVisible();
});
