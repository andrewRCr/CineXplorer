import { describe, expect, it } from "vitest";
import { createThemeSystem, themeRegistry } from "@/theme";
import { styleSystem } from "@tests/helpers/theme-styles";

/** Chakra's own token names that its recipes and global styles draw, with the theme role each must render. */
const EXPECTED_COLOR_ROLES: Record<string, string> = {
    bg: "background",
    "bg-subtle": "layer-01",
    "bg-muted": "muted",
    "bg-emphasized": "layer-hover-01",
    "bg-inverted": "foreground",
    "bg-panel": "popover",
    fg: "foreground",
    "fg-muted": "on-muted",
    "fg-subtle": "on-muted",
    "fg-inverted": "background",
    "fg-error": "destructive",
    "fg-warning": "warning",
    "fg-success": "success",
    "fg-info": "info",
    border: "border-strong-01",
    "border-muted": "border-subtle-01",
    "border-subtle": "border-subtle-00",
    "border-emphasized": "border-strong-02",
    "border-inverted": "foreground",
    "border-error": "destructive",
    "border-warning": "warning",
    "border-success": "success",
    "border-info": "info",
    "gray-contrast": "background",
    "gray-fg": "foreground",
    "gray-subtle": "layer-01",
    "gray-muted": "muted",
    "gray-emphasized": "layer-hover-01",
    "gray-solid": "foreground",
    "gray-focus-ring": "ring",
    "gray-border": "border-strong-01",
};

const EXPECTED_TINTS: Record<string, string> = {
    "bg-error": "destructive",
    "bg-warning": "warning",
    "bg-success": "success",
    "bg-info": "info",
};

const EXPECTED_SHADOW_ROLES: Record<string, string> = {
    xs: "shadow-sm",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-lg",
    "2xl": "shadow-lg",
};

/** Every value the system emits for one CSS variable, across all color-mode conditions. */
function declarations(
    theme: (typeof themeRegistry)[keyof typeof themeRegistry],
) {
    const css = JSON.stringify(createThemeSystem(theme).getTokenCss());
    return (variable: string) =>
        [
            ...css.matchAll(
                new RegExp(`"--chakra-${variable}":"([^"]+)"`, "g"),
            ),
        ].map((match) => match[1]);
}

describe.each(Object.values(themeRegistry))("$label", (theme) => {
    const valuesOf = declarations(theme);

    it.each(Object.entries(EXPECTED_COLOR_ROLES))(
        "renders Chakra's %s color as the %s role",
        (name, role) => {
            expect(valuesOf(`colors-${name}`)).toEqual([
                `var(--chakra-colors-${role})`,
            ]);
        },
    );

    it.each(Object.entries(EXPECTED_TINTS))(
        "renders Chakra's %s background as a 10% %s tint",
        (name, role) => {
            expect(valuesOf(`colors-${name}`)).toEqual([
                `color-mix(in srgb, var(--chakra-colors-${role}) 10%, transparent)`,
            ]);
        },
    );

    it.each(Object.entries(EXPECTED_SHADOW_ROLES))(
        "renders Chakra's %s shadow as the %s role",
        (name, role) => {
            expect(valuesOf(`shadows-${name}`)).toEqual([
                `var(--chakra-shadows-${role})`,
            ]);
        },
    );
});

it("draws selected text in foreground on a 20% tertiary tint", () => {
    expect(styleSystem.getGlobalCss()).toMatchObject({
        "&*::selection": {
            "--mix-background":
                "color-mix(in srgb, var(--chakra-colors-tertiary) 20%, transparent)",
            background: "var(--mix-background, var(--chakra-colors-tertiary))",
            color: "var(--chakra-colors-foreground)",
        },
    });
});
