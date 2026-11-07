import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { axeBaseline, baselineKey } from "./axe-baseline";

export default class AxeBaselineReporter implements Reporter {
    private matched = new Set<string>();

    onTestEnd(_test: TestCase, result: TestResult): void {
        for (const annotation of result.annotations) {
            if (
                annotation.type === "axe-baseline-match" &&
                annotation.description
            ) {
                this.matched.add(annotation.description);
            }
        }
    }

    onEnd(): void {
        for (const entry of axeBaseline) {
            if (!this.matched.has(baselineKey(entry))) {
                console.log(
                    `Unmatched axe baseline: ${baselineKey(entry)} — ${entry.reason}`,
                );
            }
        }
    }
}
