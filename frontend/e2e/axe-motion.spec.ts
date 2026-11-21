import AxeBuilder from "@axe-core/playwright";
import { scanPage } from "./axe";
import { expect, test } from "./fixtures";

test("rechecks accessibility after finite motion interrupts an audit", async ({
    page,
}, info) => {
    await page.setContent(`
        <html lang="en">
            <head>
                <title>Save notice</title>
                <style>
                    @keyframes slide-in {
                        from { transform: translateX(12px); }
                        to { transform: translateX(0); }
                    }
                    .entering { animation: slide-in 120ms linear; }
                </style>
            </head>
            <body>
                <main>
                    <h1>Save notice</h1>
                    <p role="status">Changes saved</p>
                </main>
            </body>
        </html>
    `);

    const notice = page.getByRole("status");
    const analyze = AxeBuilder.prototype.analyze;
    let audits = 0;
    // Put a real animation between readiness and the first axe result.
    AxeBuilder.prototype.analyze = async function () {
        if (++audits === 1) {
            await notice.evaluate(async (element) => {
                element.classList.add("entering");
                const [animation] = element.getAnimations();
                if (!animation) throw new Error("The save notice did not move");
                await animation.finished;
            });
        }
        return analyze.call(this);
    };
    try {
        await scanPage(page, info);
    } finally {
        AxeBuilder.prototype.analyze = analyze;
    }
    expect(audits).toBe(2);
});
