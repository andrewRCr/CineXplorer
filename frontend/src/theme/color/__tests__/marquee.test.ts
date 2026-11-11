import { describe, expect, it } from "vitest";
import { createUnifiedTheme, createCarbonAdapter } from "@/theme/color";
import { carbonShadows } from "@/theme/color/shadows";
import {
    deriveBorderHierarchy,
    deriveInteractionStates,
} from "@/theme/color/utils";

const palettes = {
    dark: {
        background: "#110E0A",
        "layer-01": "#191510",
        "layer-02": "#221E18",
        "layer-03": "#2D2721",
        foreground: "#EFE9DC",
        "on-muted": "#B1A898",
        primary: "#D1AF6B",
        "on-primary": "#110E0A",
        tertiary: "#D8BA7E",
        ring: "#D8BA7E",
        "imdb-gold": "#DCB970",
        secondary: "#3A332B",
        badge: "#433C34",
        success: "#86C163",
        destructive: "#D08F93",
        warning: "#FED071",
        info: "#8DB4D6",
        "on-success": "#110E0A",
        "on-destructive": "#110E0A",
        "on-warning": "#110E0A",
        "on-info": "#110E0A",
    },
    light: {
        background: "#F2E8CE",
        "layer-01": "#FBF6E9",
        "layer-02": "#F2E8CE",
        "layer-03": "#FBF6E9",
        foreground: "#221E14",
        "on-muted": "#5F594B",
        primary: "#755327",
        "on-primary": "#FFFFFF",
        tertiary: "#755327",
        ring: "#755327",
        "imdb-gold": "#7F5806",
        secondary: "#D6C8A9",
        badge: "#DFD2B4",
        success: "#376A0D",
        destructive: "#693137",
        warning: "#9C3A11",
        info: "#2F5E86",
        "on-success": "#FFFFFF",
        "on-destructive": "#FFFFFF",
        "on-warning": "#FFFFFF",
        "on-info": "#FFFFFF",
    },
} as const;

function brightness(hex: string) {
    const channels = [1, 3, 5].map(
        (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
    );
    const linear = channels.map((v) =>
        v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
    );
    return linear.reduce(
        (sum, value, index) =>
            sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0),
        0,
    );
}

describe.each(["dark", "light"] as const)("Marquee %s", (mode) => {
    it("provides the palette's exact surface, text, action and status colors", () => {
        expect(createUnifiedTheme("marquee", mode)).toMatchObject(
            palettes[mode],
        );
    });

    it("maps surface and button roles consistently", () => {
        const theme = createUnifiedTheme("marquee", mode);
        const mappings = {
            popover: "layer-02",
            "on-popover": "foreground",
            muted: "layer-01",
            brand: "primary",
            "on-brand": "on-primary",
            "on-tertiary": "on-primary",
            "on-secondary": "foreground",
            "on-badge": "foreground",
            "on-button-outline": "foreground",
            "on-button-subtle": "foreground",
            "on-button-subtle-selected": "foreground",
            "button-outline": "border-strong-01",
            "button-outline-primary": "primary",
            "on-button-outline-primary": "primary",
            "button-subtle": "secondary",
            "button-subtle-selected": "layer-selected-02",
            "drag-active": "secondary-hover",
            "drop-zone": "muted",
        } as const;
        for (const [role, source] of Object.entries(mappings)) {
            expect(Reflect.get(theme, role), role).toBe(theme[source]);
        }
    });

    it("derives borders and interaction states from their own surfaces", () => {
        const theme = createUnifiedTheme("marquee", mode);
        const borders =
            mode === "dark"
                ? deriveBorderHierarchy("#413B33", "#736A5F", "progressive")
                : deriveBorderHierarchy("#D3C5AA", "#7C705B", "alternating");
        expect(theme).toMatchObject({
            "border-subtle-00": borders.subtle00,
            "border-subtle-01": borders.subtle01,
            "border-subtle-02": borders.subtle02,
            "border-strong-01": borders.strong01,
            "border-strong-02": borders.strong02,
            "border-strong-03": borders.strong03,
        });
        for (const layer of ["01", "02"] as const) {
            const states = deriveInteractionStates(
                theme[`layer-${layer}`],
                theme.foreground,
            );
            for (const state of ["hover", "selected", "active"] as const) {
                expect(theme[`layer-${state}-${layer}`]).toBe(states[state]);
            }
        }
        for (const role of ["primary", "secondary"] as const) {
            const states = deriveInteractionStates(
                theme[role],
                role === "primary" ? theme["on-primary"] : theme.foreground,
            );
            expect(theme[`${role}-hover`]).toBe(states.hover);
            expect(theme[`${role}-active`]).toBe(states.active);
        }
    });

    it("makes link states progressively lighter in dark mode and darker in light", () => {
        const theme = createUnifiedTheme("marquee", mode);
        const direction = mode === "dark" ? 1 : -1;
        const hover =
            direction *
            (brightness(theme["tertiary-hover"]) - brightness(theme.tertiary));
        const active =
            direction *
            (brightness(theme["tertiary-active"]) - brightness(theme.tertiary));
        expect(hover).toBeGreaterThan(0);
        expect(active).toBeGreaterThan(hover);
    });

    it("keeps Carbon's shadows, backdrop and complete role vocabulary", () => {
        const theme = createUnifiedTheme("marquee", mode);
        expect(theme).toMatchObject({
            "shadow-sm": carbonShadows[mode].sm,
            "shadow-md": carbonShadows[mode].md,
            "shadow-lg": carbonShadows[mode].lg,
            backdrop: "rgba(0, 0, 0, 0.7)",
        });
        expect(Object.keys(theme).sort()).toEqual(
            Object.keys(createCarbonAdapter(mode)).sort(),
        );
    });
});
