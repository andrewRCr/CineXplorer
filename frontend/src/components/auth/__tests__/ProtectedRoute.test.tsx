import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HttpResponse, http } from "msw/http";
import { siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import {
  authHandlers,
  clearBrowserAuth,
  profile,
  token,
} from "@tests/helpers/auth";
import { TestProviders } from "@tests/helpers/test-providers";
import { gate } from "@tests/helpers/web-locks";
import AuthContextProvider from "../AuthContextProvider";
import ProtectedRoute from "../ProtectedRoute";

const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;

function SignInPage() {
  const location = useLocation();
  return (
    <p>
      Sign-in page at {location.pathname}
      {location.search}
    </p>
  );
}

function renderAt(entry: string) {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <AuthContextProvider>
          <Routes>
            <Route path="/login" element={<SignInPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/watchlist" element={<h1>Watchlist page</h1>} />
            </Route>
          </Routes>
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});

describe("pages that need a signed-in user", () => {
  it("wait while the sign-in check is pending", async () => {
    const held = gate();
    server.use(
      http.get(sessionUrl, async () => {
        await held.wait;
        return HttpResponse.json({ status: 401 }, { status: 401 });
      }),
    );
    renderAt("/watchlist");
    expect(screen.getByText("Checking your sign-in...")).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign-in page/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Watchlist page" }),
    ).not.toBeInTheDocument();
    held.release();
    expect(await screen.findByText(/Sign-in page/)).toBeVisible();
  });

  it("send a signed-out visitor to sign in, carrying the page to return to", async () => {
    renderAt("/watchlist?sort=added");
    expect(
      await screen.findByText(
        "Sign-in page at /login?next=%2Fwatchlist%3Fsort%3Dadded",
      ),
    ).toBeVisible();
  });

  it("show the page to a user signed in with a password", () => {
    setAuthTokens(token());
    renderAt("/watchlist");
    expect(
      screen.getByRole("heading", { name: "Watchlist page" }),
    ).toBeVisible();
  });

  it("show the page once a provider session is found", async () => {
    server.use(
      http.get(sessionUrl, () =>
        HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        }),
      ),
    );
    renderAt("/watchlist");
    expect(
      await screen.findByRole("heading", { name: "Watchlist page" }),
    ).toBeVisible();
    expect(screen.queryByText(/Sign-in page/)).not.toBeInTheDocument();
  });
});
