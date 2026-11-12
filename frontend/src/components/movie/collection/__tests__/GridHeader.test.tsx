import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { GridHeader } from "../GridHeader";

it("keeps its title visible while the count is hidden", () => {
  render(
    <GridHeader title="Selection" resultText="20 results" visible={false} />,
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Selection" }),
  ).toBeVisible();
  expect(screen.getByText("20 results")).not.toBeVisible();
});

it("keeps hidden pagination inert", () => {
  render(
    <GridHeader
      resultText="20 results"
      visible={false}
      paginationControls={<button>Next page</button>}
    />,
  );
  expect(screen.getByText("20 results")).not.toBeVisible();
  const button = screen.getByRole("button", { name: "Next page" });
  expect(button).not.toBeVisible();
  expect(getComputedStyle(button).pointerEvents).toBe("none");
});
