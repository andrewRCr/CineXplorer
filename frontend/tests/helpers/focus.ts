import { waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * Dialogs and drawers trap focus a frame after they open. Keys sent before then land outside the dialog or move with
 * the trap when it activates, and closing before then leaves no focus to restore, so wait until the dialog holds it.
 */
export async function waitForFocusWithin(element: HTMLElement): Promise<void> {
    await waitFor(() =>
        expect(element.contains(document.activeElement)).toBe(true),
    );
}
