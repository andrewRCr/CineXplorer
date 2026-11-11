import { describe, expect, it } from "vitest";
import {
    ALL_TOKEN_PAIRS,
    THRESHOLDS,
    validateTheme,
    type TokenPair,
} from "@/theme/color/contrast-checks";
import { resolveColorStack } from "@/theme/color/contrast";
import { createUnifiedTheme, type ThemeName } from "@/theme/color";

const themes: ThemeName[] = [
    "marquee",
    "ibm-carbon",
    "github-primer",
    "gitlab-pajamas",
    "material-design-3",
];
const surfaces = ["background", "layer-01", "layer-02", "layer-03"];
const chipSurfaces = [...surfaces, "layer-hover-01", "layer-hover-02"];
const statuses = ["success", "destructive", "warning", "info"];
interface RequiredPair extends TokenPair {
    themes?: readonly ThemeName[];
}
const required: RequiredPair[] = [
    ...["success", "foreground", "destructive"].flatMap((fg) =>
        chipSurfaces.map((bg) => ({ fg, bg, threshold: "ui" as const })),
    ),
    ...chipSurfaces.map((bg) => ({ fg: "foreground", bg })),
    { fg: "border-subtle-01", bg: "background", threshold: "decorative" },
    {
        fg: "border-subtle-01",
        bg: "layer-01",
        threshold: "decorative",
        themes: ["marquee"],
    },
    { fg: "tertiary", bg: "layer-01", threshold: "ui" },
    { fg: "on-tertiary", bg: "tertiary" },
    { fg: "ring", bg: "layer-01", threshold: "ui" },
    { fg: "on-badge", bg: "badge" },
    { fg: "on-primary", bg: "primary" },
    { fg: "on-muted", bg: "background" },
    { fg: "foreground", bg: "layer-02", threshold: "ui" },
    ...statuses.flatMap((fg) => surfaces.map((bg) => ({ fg, bg }))),
    {
        fg: "border-subtle-01",
        bg: "layer-03",
        threshold: "decorative",
        themes: ["marquee"],
    },
    ...statuses.flatMap((status) =>
        surfaces.flatMap((surface): RequiredPair[] => [
            { fg: status, bg: `${status}/10`, backdrop: [surface] },
            { fg: "foreground", bg: `${status}/10`, backdrop: [surface] },
            {
                fg: "on-button-outline",
                bg: `${status}/10`,
                backdrop: [surface],
            },
            {
                fg: "border-strong-02",
                bg: `${status}/10`,
                backdrop: [surface],
                threshold: "ui",
                themes: ["marquee"],
            },
            {
                fg: "tertiary",
                bg: `${status}/10`,
                backdrop: [surface],
                threshold: "ui",
                themes: ["marquee"],
            },
        ]),
    ),
];

function applicable(pair: RequiredPair, theme: ThemeName) {
    return !pair.themes || pair.themes.includes(theme);
}
function matchingPairs(pair: RequiredPair, theme: ThemeName) {
    return ALL_TOKEN_PAIRS.filter(
        (candidate: RequiredPair) =>
            candidate.fg === pair.fg &&
            candidate.bg === pair.bg &&
            JSON.stringify(candidate.backdrop ?? ["background"]) ===
                JSON.stringify(pair.backdrop ?? ["background"]) &&
            THRESHOLDS[candidate.threshold ?? "text"] >=
                THRESHOLDS[pair.threshold ?? "text"] &&
            applicable(candidate, theme),
    );
}

it("skips scoped pairs outside their named themes without counting a contrast result", () => {
    const pair = {
        fg: "foreground",
        bg: "background",
        themes: ["marquee"] as const,
    };
    const included = validateTheme(
        createUnifiedTheme("marquee", "dark"),
        "marquee",
        "dark",
        [pair],
    );
    const excluded = validateTheme(
        createUnifiedTheme("ibm-carbon", "dark"),
        "ibm-carbon",
        "dark",
        [pair],
    );
    expect(included[0]?.ratio).toBeGreaterThan(4.5);
    expect(excluded[0]?.ratio).toBeNull();
    expect(excluded[0]?.reason).toMatch(/theme.*skip/i);
});

describe.each(required)("$fg on $bg ($backdrop)", (pair) => {
    for (const theme of themes.filter((name) => applicable(pair, name))) {
        it(`checks the required pair at its threshold in ${theme}`, () => {
            expect(matchingPairs(pair, theme).length).toBeGreaterThan(0);
        });
        it.each(["light", "dark"] as const)(
            `detects insufficient contrast in ${theme} %s`,
            (mode) => {
                const variant = createUnifiedTheme(theme, mode);
                const surface = resolveColorStack(
                    [...(pair.backdrop ?? ["background"]), pair.bg],
                    variant,
                );
                if (!surface) throw new Error("Required surface must resolve");
                const hex =
                    "#" +
                    surface
                        .map((channel) =>
                            Math.round(channel).toString(16).padStart(2, "0"),
                        )
                        .join("");
                const mutant = { ...variant, [pair.fg]: hex };
                const results = validateTheme(
                    mutant,
                    theme,
                    mode,
                    matchingPairs(pair, theme),
                );
                expect(
                    results.some(
                        (result) => !result.passed && result.ratio !== null,
                    ),
                ).toBe(true);
            },
        );
    }
});
