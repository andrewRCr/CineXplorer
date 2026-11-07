import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HttpResponse, http } from "msw/http";
import { siteOrigin } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { authHandlers, clearBrowserAuth, profile } from "@tests/helpers/auth";
import { TestProviders } from "@tests/helpers/test-providers";
import { gate } from "@tests/helpers/web-locks";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import NavBarUserMenu from "../NavBarUserMenu";

const sessionUrl = `${siteOrigin}/_allauth/browser/v1/auth/session`;

function renderMenu() {
  return render(
    <TestProviders>
      <MemoryRouter>
        <AuthContextProvider>
          <NavBarUserMenu />
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}

beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});

describe("the navigation bar's sign-in control", () => {
  it("shows neither Login nor the user while the sign-in check is pending", async () => {
    const held = gate();
    server.use(
      http.get(sessionUrl, async () => {
        await held.wait;
        return HttpResponse.json({
          meta: { is_authenticated: true },
          data: { user: profile },
        });
      }),
    );
    renderMenu();
    expect(
      screen.queryByRole("button", { name: "Login" }),
    ).not.toBeInTheDocument();
    held.release();
    expect(
      await screen.findByRole("button", { name: /Movie|viewer/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Login" }),
    ).not.toBeInTheDocument();
  });

  it("shows Login once the visitor is known to be signed out", async () => {
    renderMenu();
    expect(await screen.findByRole("button", { name: "Login" })).toBeVisible();
  });
});
