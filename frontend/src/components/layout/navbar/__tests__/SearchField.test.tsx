import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { TestProviders } from "@tests/helpers/test-providers";
import { expectResolvedColor, styleSystem } from "@tests/helpers/theme-styles";
import SearchField from "../SearchField";

function Example({ autoFocus = false }) {
  const location = useLocation();
  const [submitted, setSubmitted] = useState(0);
  const [escaped, setEscaped] = useState(false);
  return (
    <>
      <SearchField
        autoFocus={autoFocus}
        onSubmit={() => setSubmitted((n) => n + 1)}
        onEscape={() => setEscaped(true)}
      />
      <output aria-label="Location">
        {location.pathname}
        {location.search}
      </output>
      <output aria-label="Submissions">{submitted}</output>
      {escaped && <p>Search closed</p>}
    </>
  );
}

function renderField(autoFocus = false) {
  return render(
    <TestProviders system={styleSystem}>
      <MemoryRouter>
        <Example autoFocus={autoFocus} />
      </MemoryRouter>
    </TestProviders>,
  );
}

it.each(["Enter", "button"])(
  "submits a trimmed, encoded query with %s",
  async (method) => {
    const user = userEvent.setup();
    renderField();
    const input = screen.getByRole("textbox", { name: "Search films" });
    expect(input).toHaveAttribute("placeholder", "Search films");
    await user.type(input, "  horror & comedy  ");
    if (method === "Enter") await user.keyboard("{Enter}");
    else await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByLabelText("Location")).toHaveTextContent(
      "/search?query=horror%20%26%20comedy",
    );
    expect(screen.getByLabelText("Submissions")).toHaveTextContent("1");
  },
);

it("ignores a blank query on Enter and on the button", async () => {
  const user = userEvent.setup();
  renderField();
  await user.type(
    screen.getByRole("textbox", { name: "Search films" }),
    "   {Enter}",
  );
  await user.click(screen.getByRole("button", { name: "Search" }));
  expect(screen.getByLabelText("Location")).toHaveTextContent(/^\/$/);
  expect(screen.getByLabelText("Submissions")).toHaveTextContent("0");
});

it("focuses on mount when requested and handles Escape", async () => {
  const user = userEvent.setup();
  renderField(true);
  expect(screen.getByRole("textbox", { name: "Search films" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.getByText("Search closed")).toBeVisible();
});

it("marks the wrapper only while its input has keyboard focus", async () => {
  const user = userEvent.setup();
  renderField();
  const wrapper = screen.getByRole("search");
  expect(getComputedStyle(wrapper).borderWidth).toBe("1px");
  expectResolvedColor(
    wrapper,
    "border-color",
    "var(--chakra-colors-border-strong-01)",
  );
  await user.tab();
  const input = screen.getByRole("textbox", { name: "Search films" });
  expect(input).toHaveFocus();
  expectResolvedColor(wrapper, "border-color", "var(--chakra-colors-tertiary)");
  expect(getComputedStyle(input).borderStyle).toBe("none");
  expect(getComputedStyle(input).outlineStyle).toBe("none");
  await user.type(input, "film");
  await user.tab();
  const button = screen.getByRole("button", { name: "Search" });
  expect(button).toHaveFocus();
  expectResolvedColor(
    wrapper,
    "border-color",
    "var(--chakra-colors-border-strong-01)",
  );
  expectResolvedColor(button, "outline-color", "var(--chakra-colors-ring)");
});
