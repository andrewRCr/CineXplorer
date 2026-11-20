import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { actUntil } from "../act-until";
import { gate } from "../web-locks";

it("allows a later render after the expected request never arrives", async () => {
  const request = gate();

  try {
    await expect(
      actUntil("the request", () => request.wait, 20),
    ).rejects.toThrow("Timed out waiting for the request");

    render(<h1>Next test</h1>);
    expect(screen.getByRole("heading", { name: "Next test" })).toBeVisible();
  } finally {
    request.release();
  }
});
