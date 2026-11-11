import { beforeEach, describe, expect, it } from "vitest";
import { getInitialTheme, STORAGE_KEY } from "@/hooks/useThemeSelect";
import { themeRegistry } from "@/theme";

beforeEach(() => localStorage.clear());

describe("initial theme selection", () => {
    it("uses Marquee when nothing is stored", () => {
        expect(getInitialTheme()).toBe("marquee");
    });
    it("preserves a stored IBM Carbon choice", () => {
        localStorage.setItem(STORAGE_KEY, "ibm-carbon");
        expect(getInitialTheme()).toBe("ibm-carbon");
    });
    it("uses Marquee for an unknown stored choice", () => {
        localStorage.setItem(STORAGE_KEY, "unknown-theme");
        expect(getInitialTheme()).toBe("marquee");
    });
    it("lists Marquee first", () => {
        expect(Object.keys(themeRegistry)[0]).toBe("marquee");
    });
});
