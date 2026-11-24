import { act, render } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { afterEach, beforeEach, vi } from "vitest";
import App from "@/App";
import { ThemeSelectProvider } from "@/components/core/chakra/theme-provider";
import {
  PriorityToaster,
  priorityToaster,
} from "@/components/core/chakra/toaster";
import { apiBaseUrl } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { authHandlers, clearBrowserAuth } from "./auth";
import { TestProviders } from "./test-providers";

declare const jsdom: { window: Window };
const mockLocation = window.location;

export function setupAppTest() {
  beforeEach(() => {
    // BrowserRouter needs history writes to update the location it reads.
    Object.defineProperty(window, "location", {
      value: jsdom.window.location,
      writable: true,
    });
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
    act(() => priorityToaster.remove());
    delete window.__dismissPreloadOverlay;
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });
  });
}

export function startAt(path: string) {
  // The test environment supplies a writable location; keep its path aligned with browser history.
  window.history.replaceState({}, "", path);
  return render(
    <ThemeSelectProvider>
      <TestProviders>
        <App />
        <PriorityToaster />
      </TestProviders>
    </ThemeSelectProvider>,
  );
}

export const signInField = { name: "Username or Email Address" };

export function openLink(path: string) {
  act(() => {
    window.history.pushState(window.history.state, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}
