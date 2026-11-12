export interface BaselineEntry {
    route: "/" | "/login" | "/register" | "/browse" | "/movie/:id" | "/search";
    rule: string;
    reason: string;
}

export const axeBaseline: BaselineEntry[] = [
    {
        route: "/search",
        rule: "button-name",
        reason: "Movie cards' icon buttons lack accessible names, as in the catalog.",
    },
    {
        route: "/browse",
        rule: "aria-hidden-focus",
        reason: "The collapsed browse sub-navigation drawer retains focusable controls while aria-hidden.",
    },
    {
        route: "/browse",
        rule: "button-name",
        reason: "Browse filter and movie controls include buttons without accessible names.",
    },
];

export function baselineKey(
    entry: Pick<BaselineEntry, "route" | "rule">,
): string {
    return `${entry.route} ${entry.rule}`;
}
