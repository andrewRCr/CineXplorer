import { expect, it } from "vitest";
import { render, screen, waitFor } from "@tests/helpers/test-renderer";
import { FormField } from "@/components/auth/FormField";

it("describes an invalid input with its visible validation error", async () => {
  render(
    <FormField
      name="email"
      label="Email Address"
      type="email"
      value="invalid-email"
      error="Enter a valid email address"
      touched
      onChange={() => undefined}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Email Address" });
  expect(input).toBeInvalid();
  expect(screen.getByText("Enter a valid email address")).toBeVisible();
  await waitFor(() =>
    expect(input).toHaveAccessibleDescription("Enter a valid email address"),
  );
});
