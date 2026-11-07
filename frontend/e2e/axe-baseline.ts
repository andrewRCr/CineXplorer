export interface BaselineEntry {
    route: "/" | "/login" | "/register" | "/browse" | "/movie/:id";
    rule: string;
    reason: string;
}

export const axeBaseline: BaselineEntry[] = [
    {
        route: "/",
        rule: "aria-input-field-name",
        reason: "The shared sidebar navigation listbox has no accessible name.",
    },
    {
        route: "/",
        rule: "aria-required-children",
        reason: "The sidebar listbox contains a separator outside its permitted child roles.",
    },
    {
        route: "/browse",
        rule: "aria-input-field-name",
        reason: "The shared sidebar navigation listbox has no accessible name.",
    },
    {
        route: "/browse",
        rule: "aria-required-children",
        reason: "The sidebar listbox contains a separator outside its permitted child roles.",
    },
    {
        route: "/movie/:id",
        rule: "aria-input-field-name",
        reason: "The shared sidebar navigation listbox has no accessible name.",
    },
    {
        route: "/movie/:id",
        rule: "aria-required-children",
        reason: "The sidebar listbox contains a separator outside its permitted child roles.",
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
    {
        route: "/login",
        rule: "color-contrast",
        reason: "The registration confirmation notice has white text on blue below the AA contrast threshold.",
    },
];

export function baselineKey(
    entry: Pick<BaselineEntry, "route" | "rule">,
): string {
    return `${entry.route} ${entry.rule}`;
}
