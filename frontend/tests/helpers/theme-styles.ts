import { createSystem } from "@chakra-ui/react";
import { expect } from "vitest";
import { defaultSystem } from "@/theme";

/** jsdom resolves recipe colors when the project's cascade layers are disabled. */
export const styleSystem = createSystem(defaultSystem._config, {
    disableLayers: true,
});

/** Resolve a token beside the element, preserving its inherited theme and mode. */
export function resolveTokenColor(
    element: HTMLElement,
    property: string,
    expression: string,
): string {
    const reference = document.createElement("span");
    reference.style.setProperty(property, expression, "important");
    element.after(reference);
    let expected: string;
    try {
        expected = getComputedStyle(reference).getPropertyValue(property);
    } finally {
        reference.remove();
    }
    expect(expected).not.toBe("");
    expect(expected).not.toBe("transparent");
    expect(expected).not.toBe("rgba(0, 0, 0, 0)");
    expect(expected).not.toContain("var(");
    return expected;
}

/** Compare the rendered color with an independently resolved semantic expression. */
export function expectResolvedColor(
    element: HTMLElement,
    property: string,
    expression: string,
) {
    expect(element).toBeInTheDocument();
    const expected = resolveTokenColor(element, property, expression);
    expect(getComputedStyle(element).getPropertyValue(property)).toBe(expected);
}
