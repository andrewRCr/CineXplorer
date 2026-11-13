import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import AuthContextProvider from "@/components/auth/AuthContextProvider";
import { TestProviders } from "@tests/helpers/test-providers";
import { authHandlers, clearBrowserAuth } from "@tests/helpers/auth";
import PhoneNavBar from "../PhoneNavBar";

function Location() {
  const location = useLocation();
  return (
    <output aria-label="Location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function renderPhone() {
  return render(
    <TestProviders>
      <MemoryRouter>
        <AuthContextProvider>
          <PhoneNavBar />
          <Location />
        </AuthContextProvider>
      </MemoryRouter>
    </TestProviders>,
  );
}
beforeEach(() => {
  clearBrowserAuth();
  authHandlers();
});

it("shows the menu, wordmark, search button and account control", async () => {
  renderPhone();
  expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(screen.getByRole("link", { name: "CineXplorer" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Search films" })).toBeVisible();
  expect(await screen.findByRole("link", { name: "Sign in" })).toBeVisible();
});

it("replaces the row with a focused search field and excludes its other controls from Tab", async () => {
  const user = userEvent.setup();
  renderPhone();
  await screen.findByRole("link", { name: "Sign in" });
  await user.click(screen.getByRole("button", { name: "Search films" }));
  const input = screen.getByRole("textbox", { name: "Search films" });
  expect(input).toHaveFocus();
  expect(screen.getByRole("button", { name: "Close search" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Open menu" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Search films" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "CineXplorer" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Sign in" }),
  ).not.toBeInTheDocument();
  await user.type(input, "film");
  await user.tab();
  expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Close search" })).toHaveFocus();
  await user.tab();
  await user.tab();
  expect(input).toHaveFocus();
});

it.each(["Escape", "close button"])(
  "returns focus to the search button after %s",
  async (method) => {
    const user = userEvent.setup();
    renderPhone();
    await screen.findByRole("link", { name: "Sign in" });
    await user.click(screen.getByRole("button", { name: "Search films" }));
    if (method === "Escape") await user.keyboard("{Escape}");
    else await user.click(screen.getByRole("button", { name: "Close search" }));
    expect(
      screen.queryByRole("textbox", { name: "Search films" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search films" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
  },
);

it.each(["Search", "Close search"])(
  "closes with Escape while %s has keyboard focus",
  async (control) => {
    const user = userEvent.setup();
    renderPhone();
    await screen.findByRole("link", { name: "Sign in" });
    await user.click(screen.getByRole("button", { name: "Search films" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search films" }),
      "Alien",
    );
    await user.tab();
    if (control === "Close search") await user.tab();
    expect(screen.getByRole("button", { name: control })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("textbox", { name: "Search films" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search films" })).toHaveFocus();
  },
);

it("submits the query and restores the row on the results page", async () => {
  const user = userEvent.setup();
  renderPhone();
  await user.click(screen.getByRole("button", { name: "Search films" }));
  await user.type(
    screen.getByRole("textbox", { name: "Search films" }),
    "  thriller  {Enter}",
  );
  expect(screen.getByLabelText("Location")).toHaveTextContent(
    "/search?query=thriller",
  );
  expect(screen.getByRole("button", { name: "Search films" })).toBeVisible();
  expect(screen.getByRole("link", { name: "CineXplorer" })).toBeVisible();
});
