import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import {
  styleSystem,
  expectResolvedColor,
  resolveTokenColor,
} from "@tests/helpers/theme-styles";
import { FloatingAlert } from "@/components/common/FloatingAlert";

it("uses the raised strong border for an action in dark mode", () => {
  render(
    <div className="dark">
      <FloatingAlert
        status="info"
        action={{ label: "Resend", onClick: () => {} }}
      >
        Check your email
      </FloatingAlert>
    </div>,
    { system: styleSystem },
  );
  const button = screen.getByRole("button", { name: "Resend" });
  const raised = resolveTokenColor(
    button,
    "border-color",
    "var(--chakra-colors-border-strong-02)",
  );
  const neutral = resolveTokenColor(
    button,
    "border-color",
    "var(--chakra-colors-button-outline)",
  );
  expect(raised).not.toBe(neutral);
  expectResolvedColor(
    button,
    "border-color",
    "var(--chakra-colors-border-strong-02)",
  );
});
