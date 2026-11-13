import { act } from "react";
import { afterEach, expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import {
  expectResolvedColor,
  resolveTokenColor,
  styleSystem,
} from "@tests/helpers/theme-styles";
import { Toaster, toaster } from "@/components/core/chakra/toaster";

afterEach(() => act(() => toaster.remove()));

it.each(["success", "warning", "error", "info"] as const)(
  "draws %s toasts and their action in the toast's own roles",
  async (type) => {
    render(<Toaster />, { system: styleSystem });
    act(() => {
      toaster[type]({
        title: "Saved",
        action: { label: "Undo", onClick: () => undefined },
      });
    });
    const undo = await screen.findByRole("button", { name: "Undo" });
    // The action's border and hover fill come from custom properties on the toast's root.
    // eslint-disable-next-line testing-library/no-node-access
    const toast = undo.closest("[data-part=root]");
    if (!(toast instanceof HTMLElement)) throw new Error("Missing toast root");
    expectResolvedColor(toast, "color", "var(--chakra-colors-foreground)");
    expect(getComputedStyle(undo).borderTopColor).toBe(
      getComputedStyle(toast).borderTopColor,
    );
    expect(
      resolveTokenColor(undo, "background-color", "var(--toast-trigger-bg)"),
    ).toBe(
      resolveTokenColor(undo, "background-color", "var(--chakra-colors-muted)"),
    );
  },
);
