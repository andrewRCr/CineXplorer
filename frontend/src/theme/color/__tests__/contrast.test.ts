import { describe, expect, it } from "vitest";
import { resolveColorStack } from "@/theme/color/contrast";

const colors = {
    background: "#ffffff",
    layer: "#0000ff",
    red: "#ff0000",
    green: "#00ff00",
    reset: "#000000",
    border: "#888",
};

describe("translucent color stacks", () => {
    it("accepts the existing shorthand hex border colors", () => {
        expect(resolveColorStack(["border"], colors)).toEqual([136, 136, 136]);
    });

    it("uses the specified backing surface", () => {
        expect(resolveColorStack(["layer", "red/50"], colors)).toEqual([
            127.5, 0, 127.5,
        ]);
    });

    it("composites nested overlays in painting order", () => {
        expect(
            resolveColorStack(["layer", "red/50", "green/50"], colors),
        ).toEqual([63.75, 127.5, 63.75]);
    });

    it("lets an opaque layer replace the layers below it", () => {
        expect(
            resolveColorStack(["layer", "red/50", "reset", "green/50"], colors),
        ).toEqual([0, 127.5, 0]);
    });

    it("retains fractional channel values for contrast calculations", () => {
        expect(resolveColorStack(["background", "reset/50"], colors)).toEqual([
            127.5, 127.5, 127.5,
        ]);
    });

    it("refuses a missing backing token instead of substituting background", () => {
        expect(
            resolveColorStack(["layer", "missing", "red/50"], colors),
        ).toBeUndefined();
    });

    it("refuses opacity outside the supported range", () => {
        expect(
            resolveColorStack(["background", "red/101"], colors),
        ).toBeUndefined();
    });
});
