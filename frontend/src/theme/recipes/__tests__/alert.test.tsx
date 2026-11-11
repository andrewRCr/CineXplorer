import { expect, it } from "vitest";
import { Alert } from "@chakra-ui/react";
import { render, screen } from "@tests/helpers/test-renderer";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";

const statuses = ["success", "warning", "error", "info"] as const;
for (const variant of [undefined, "subtle"] as const) {
  it.each(statuses)(
    `renders %s with its theme tint and foreground root text (variant=${variant})`,
    (status) => {
      render(
        <Alert.Root status={status} variant={variant}>
          {status} feedback
        </Alert.Root>,
        { system: styleSystem },
      );
      const alert = screen.getByText(`${status} feedback`);
      const role = status === "error" ? "destructive" : status;
      expectResolvedColor(
        alert,
        "background-color",
        `color-mix(in srgb, var(--chakra-colors-${role}) 10%, transparent)`,
      );
      expectResolvedColor(alert, "color", "var(--chakra-colors-foreground)");
      expect(alert).toBeVisible();
    },
  );
}
