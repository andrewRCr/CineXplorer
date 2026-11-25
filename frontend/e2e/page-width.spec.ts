import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Headless Chromium hides scrollbars; these pages must fit the window beside one.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const widths = (page: Page) =>
    page.evaluate(() => {
        const root = document.documentElement;
        const footer = document.querySelector("footer");
        if (!footer) throw new Error("The page must have a footer");
        return {
            scrolls: root.scrollHeight > root.clientHeight,
            scrollbar: window.innerWidth - root.clientWidth,
            overflow: root.scrollWidth - root.clientWidth,
            footerRight: footer.getBoundingClientRect().right,
        };
    });

for (const width of [800, 1280]) {
    test(`pages fit beside the scrollbar and share an edge at ${width}px`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: 800 });

        await page.goto("/privacy");
        await expect(
            page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
        ).toBeVisible();
        const long = await widths(page);
        expect(long.scrolls).toBe(true);
        expect(long.scrollbar).toBeGreaterThan(0);
        expect(long.overflow).toBe(0);
        expect(long.footerRight).toBe(width - long.scrollbar);

        await page.goto("/no-such-page");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const short = await widths(page);
        expect(short.scrolls).toBe(false);
        expect(short.footerRight).toBe(long.footerRight);
    });
}
