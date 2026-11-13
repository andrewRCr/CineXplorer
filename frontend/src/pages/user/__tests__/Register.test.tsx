import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import Register from "../Register";

it("gives the registration form one visually hidden page heading", () => {
  render(<Register />);
  const heading = screen.getByRole("heading", {
    name: "Create an account",
    level: 1,
  });
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(getComputedStyle(heading).position).toBe("absolute");
  expect(getComputedStyle(heading).width).toBe("1px");
});
