export interface BaselineEntry {
    route:
        | "/"
        | "/login"
        | "/register"
        | "/browse"
        | "/movie/:id"
        | "/search"
        | "/watchlist"
        | "/library"
        | "/library/history";
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
        route: "/library",
        rule: "button-name",
        reason: "Movie cards' icon buttons lack accessible names.",
    },
    {
        route: "/watchlist",
        rule: "button-name",
        reason: "Movie cards' icon buttons lack accessible names.",
    },
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
        reason: "Movie cards' icon buttons lack accessible names.",
    },
];

export function baselineKey(
    entry: Pick<BaselineEntry, "route" | "rule">,
): string {
    return `${entry.route} ${entry.rule}`;
}
