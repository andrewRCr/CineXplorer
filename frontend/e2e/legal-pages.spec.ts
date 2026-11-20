import type { Page } from "@playwright/test";
import { scanPage } from "./axe";
import { expect, test } from "./fixtures";

const section = "Who else handles your data";
const privacyFragment = "/privacy#who-else-handles-your-data";

async function expectSectionBelowTopBar(page: Page) {
    const heading = page.getByRole("heading", { level: 2, name: section });
    const topBar = page.getByRole("banner");
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect
        .poll(async () => {
            const [destination, banner] = await Promise.all([
                heading.boundingBox(),
                topBar.boundingBox(),
            ]);
            if (!destination || !banner) return false;
            const gap = destination.y - (banner.y + banner.height);
            return gap >= 0 && gap <= 3;
        })
        .toBe(true);
}

for (const [label, path] of [
    ["Privacy Policy", "/privacy"],
    ["Terms of Service", "/terms"],
]) {
    test(`the Home footer opens the ${label} at the top`, async ({
        page,
    }, info) => {
        await page.goto("/");
        await expect(
            page.getByRole("region", { name: "What you can do" }),
        ).toBeVisible();
        const footerLink = page
            .getByRole("contentinfo")
            .getByRole("link", { name: label });
        await footerLink.scrollIntoViewIfNeeded();
        await expect
            .poll(() => page.evaluate(() => window.scrollY))
            .toBeGreaterThan(0);
        await footerLink.click();

        await expect(page).toHaveURL(path);
        await expect(
            page.getByRole("heading", {
                level: 1,
                name: `CineXplorer ${label}`,
            }),
        ).toBeInViewport();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await scanPage(page, info);
    });
}

test.describe("privacy policy at phone width", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test("does not scroll the document sideways", async ({ page }) => {
        await page.goto("/privacy");
        await expect(
            page.getByRole("heading", {
                level: 1,
                name: "CineXplorer Privacy Policy",
            }),
        ).toBeVisible();
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(360);
    });
});

test("an in-page privacy link lands below the top bar", async ({ page }) => {
    await page.goto("/privacy");
    await page.getByRole("link", { name: section }).click();

    await expect(page).toHaveURL(privacyFragment);
    await expectSectionBelowTopBar(page);
});

test("a direct privacy fragment lands below the top bar", async ({ page }) => {
    await page.goto(privacyFragment);

    await expectSectionBelowTopBar(page);
});
