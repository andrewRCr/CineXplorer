export interface BaselineEntry {
    route: "/" | "/login" | "/register" | "/browse" | "/movie/:id" | "/search";
    rule: string;
    reason: string;
}

export const axeBaseline: BaselineEntry[] = [
    {
        route: "/",
        rule: "button-name",
        reason: "Signed-in Home draws movie cards whose watched and liked buttons lack accessible names.",
    },
    {
        route: "/search",
        rule: "button-name",
        reason: "Signed-in movie cards lack accessible names for watched and liked buttons.",
    },
    {
        route: "/browse",
        rule: "aria-hidden-focus",
        reason: "The collapsed browse sub-navigation drawer retains focusable controls while aria-hidden.",
    },
    {
        route: "/browse",
        rule: "button-name",
        reason: "Signed-in movie cards lack accessible names for watched and liked buttons.",
    },
];

export function baselineKey(
    entry: Pick<BaselineEntry, "route" | "rule">,
): string {
    return `${entry.route} ${entry.rule}`;
}
