import { describe, expect, it } from "vitest";
import { createThemeSystem, themeRegistry } from "@/theme";

describe("themes with absent optional colors", () => {
    it.each([
        themeRegistry["github-primer"],
        themeRegistry["material-design-3"],
    ])("initializes $label without registering absent roles", (theme) => {
        const system = createThemeSystem(theme);

        for (const [mode, palette] of [
            ["light", theme.lightUnified],
            ["dark", theme.darkUnified],
        ] as const) {
            for (const [role, value] of Object.entries(palette)) {
                const category = role.startsWith("shadow-")
                    ? "shadows"
                    : "colors";
                expect(system.token(`${category}.${mode}.${role}`)).toBe(value);
                if (value === undefined) {
                    expect(system.token(`${category}.${role}`)).toBeUndefined();
                }
            }
        }
    });
});
