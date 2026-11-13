import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { axeBaseline, baselineKey } from "./axe-baseline";

export async function scanPage(page: Page, info: TestInfo): Promise<void> {
    await expect(
        page.getByRole("heading", { level: 1, includeHidden: true }),
    ).toHaveCount(1);
    const path = new URL(page.url()).pathname;
    const route = /^\/movie\/\d+$/.test(path) ? "/movie/:id" : path;
    const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    const unexpected = [];
    for (const violation of violations) {
        const entry = axeBaseline.find(
            (entry) => entry.route === route && entry.rule === violation.id,
        );
        if (entry) {
            info.annotations.push({
                type: "axe-baseline-match",
                description: baselineKey(entry),
            });
        } else {
            unexpected.push({
                route,
                rule: violation.id,
                elements: violation.nodes.map((node) => ({
                    target: node.target,
                    summary: node.failureSummary,
                })),
            });
        }
    }
    expect
        .soft(
            unexpected,
            `Accessibility violations on ${route}: ${unexpected.map((item) => item.rule).join(", ")}`,
        )
        .toEqual([]);
}
