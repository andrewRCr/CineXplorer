import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { axeBaseline, baselineKey } from "./axe-baseline";

async function scanWhenSettled(page: Page) {
    const motion = await page.evaluateHandle(() => {
        const isFinite = (animation: Animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity;
        const activeMotion = () =>
            document
                .getAnimations()
                .filter(
                    (animation) =>
                        (animation.pending ||
                            animation.playState === "running") &&
                        isFinite(animation),
                );
        let activity = 0;
        const markMotion = () => {
            activity++;
        };
        const markAnimation = (event: AnimationEvent) => {
            const animations = document
                .getAnimations()
                .filter(
                    (animation) =>
                        animation instanceof CSSAnimation &&
                        animation.animationName === event.animationName &&
                        animation.effect instanceof KeyframeEffect &&
                        animation.effect.target === event.target,
                );
            if (!animations.length || animations.some(isFinite)) markMotion();
        };
        const sampleFrame = () => {
            if (activeMotion().length) markMotion();
            frame = requestAnimationFrame(sampleFrame);
        };
        let frame = requestAnimationFrame(sampleFrame);
        // CSS motion can both start and finish between two reads from Playwright.
        document.addEventListener("transitionrun", markMotion, true);
        document.addEventListener("animationstart", markAnimation, true);

        return {
            async read() {
                await new Promise(requestAnimationFrame);
                const animations = activeMotion().map((animation) => {
                    const target =
                        animation.effect instanceof KeyframeEffect
                            ? animation.effect.target
                            : null;
                    return {
                        name:
                            animation instanceof CSSAnimation
                                ? animation.animationName
                                : "transition",
                        target: target
                            ? `${target.tagName.toLowerCase()}.${[...target.classList].join(".")}`
                            : null,
                        state: animation.playState,
                        time: animation.currentTime,
                    };
                });
                return { activity, animations };
            },
            stop() {
                cancelAnimationFrame(frame);
                document.removeEventListener("transitionrun", markMotion, true);
                document.removeEventListener(
                    "animationstart",
                    markAnimation,
                    true,
                );
            },
        };
    });

    try {
        for (let attempt = 0; attempt < 3; attempt++) {
            let activity = 0;
            await expect
                .poll(
                    async () => {
                        const sample = await motion.evaluate((observer) =>
                            observer.read(),
                        );
                        activity = sample.activity;
                        return sample.animations;
                    },
                    {
                        timeout: 5000,
                        message:
                            "Page motion must settle before the accessibility scan",
                    },
                )
                .toEqual([]);
            const result = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
            const after = await motion.evaluate((observer) => observer.read());
            if (after.activity === activity && !after.animations.length)
                return result.violations;
        }
        throw new Error(
            "Page motion resumed during all three accessibility scans",
        );
    } finally {
        // A destroyed document has already dropped its observer.
        await motion.evaluate((observer) => observer.stop()).catch(() => {});
        await motion.dispose();
    }
}

export async function scanPage(page: Page, info: TestInfo): Promise<void> {
    await expect(
        page.getByRole("heading", { level: 1, includeHidden: true }),
    ).toHaveCount(1);
    const violations = await scanWhenSettled(page);
    const path = new URL(page.url()).pathname;
    const route = /^\/movie\/\d+$/.test(path) ? "/movie/:id" : path;
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
