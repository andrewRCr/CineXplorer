export interface BaselineEntry {
    route: "/" | "/login" | "/register" | "/browse" | "/movie/:id" | "/search";
    rule: string;
    reason: string;
}

export const axeBaseline: BaselineEntry[] = [
    {
        route: "/browse",
        rule: "aria-hidden-focus",
        reason: "The collapsed browse sub-navigation drawer retains focusable controls while aria-hidden.",
    },
];

export function baselineKey(
    entry: Pick<BaselineEntry, "route" | "rule">,
): string {
    return `${entry.route} ${entry.rule}`;
}
