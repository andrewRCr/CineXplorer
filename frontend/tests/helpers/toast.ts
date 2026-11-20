import { act } from "@testing-library/react";

// Zag subscribes to the mounted toast store in a microtask.
export function settleToastSubscriptions() {
    return act(() => new Promise<void>((resolve) => queueMicrotask(resolve)));
}
