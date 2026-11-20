import { render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { expect, it } from "vitest";
import { actUntil } from "../act-until";
import { gate } from "../web-locks";

function RequestStatus({ started }: { started: Promise<void> }) {
  const [status, setStatus] = useState("Waiting");
  useEffect(() => {
    void started.then(() => setStatus("Started"));
  }, [started]);
  return <output>{status}</output>;
}

it("flushes queued updates and allows later renders when a request times out", async () => {
  const started = gate();
  const request = gate();
  render(<RequestStatus started={started.wait} />);

  try {
    await expect(
      actUntil(
        "the request",
        () => {
          started.release();
          return request.wait;
        },
        20,
      ),
    ).rejects.toThrow("Timed out waiting for the request");
    expect(screen.getByRole("status")).toHaveTextContent("Started");

    render(<h1>Next test</h1>);
    expect(screen.getByRole("heading", { name: "Next test" })).toBeVisible();
  } finally {
    request.release();
  }
});
