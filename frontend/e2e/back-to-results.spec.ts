import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import { useDeepRestoreCatalogue, useRestoreCatalogue } from "./catalogue";
import { target } from "./target";
import type { Page } from "@playwright/test";

/** Waits out the app's 200 ms scroll-save debounce, so the position is saved before leaving the collection. */
async function expectSavedPosition(page: Page, position: number) {
    await expect
        .poll(() =>
            page.evaluate((expected) => {
                for (let index = 0; index < sessionStorage.length; index++) {
                    const key = sessionStorage.key(index);
                    if (key?.startsWith("scroll-")) {
                        const saved: { position?: number } = JSON.parse(
                            sessionStorage.getItem(key) ?? "{}",
                        );
                        if (saved.position === expected) return true;
                    }
                }
                return false;
            }, position),
        )
        .toBe(true);
}

/** Opens a fully visible card, so opening it doesn't move the saved position. */
async function openVisibleCard(page: Page) {
    const cards = page.getByRole("link", { name: /^Movie \d+$/, exact: true });
    let opened = false;
    for (let index = 0; index < (await cards.count()); index++) {
        const card = cards.nth(index);
        const box = await card.boundingBox();
        if (box && box.y > 100 && box.y + box.height < 800) {
            await card.click();
            opened = true;
            break;
        }
    }
    expect(
        opened,
        "A fully visible movie card can be opened without moving the saved position",
    ).toBe(true);
    await expect(
        page.getByRole("heading", { name: /^Movie \d+$/, exact: true }),
    ).toBeVisible();
}

/** Reloads the film's page, so the results start over from their first page, then goes back to them. */
async function reloadAndReturn(page: Page) {
    await page.reload();
    await expect(
        page.getByRole("heading", { name: /^Movie \d+$/, exact: true }),
    ).toBeVisible();
    await page
        .getByRole("link", { name: "Back to Results", exact: true })
        .click();
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
}

async function expectScrolledTo(page: Page, position: number) {
    await expect
        .poll(async () =>
            Math.abs((await page.evaluate(() => window.scrollY)) - position),
        )
        .toBeLessThanOrEqual(20);
}

test("Back to Results restores the position after reloading detail", async ({
    page,
}, info) => {
    await useRestoreCatalogue(page, target.baseURL);
    await page.goto("/browse");
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
    await scanPage(page, info);
    await page.evaluate(() => window.scrollTo(0, 2600));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(2600);
    await expectSavedPosition(page, 2600);
    await openVisibleCard(page);
    await scanPage(page, info);
    await reloadAndReturn(page);
    await expectScrolledTo(page, 2600);
});

test("Back to Results returns past the first page after reloading detail", async ({
    page,
}) => {
    await useDeepRestoreCatalogue(page, target.baseURL);
    await page.goto("/browse");
    await expect(page.getByText("120 results")).toBeVisible();
    // Load results by scrolling to their end until the page reaches past 6000
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    window.scrollTo(0, document.documentElement.scrollHeight);
                    return (
                        document.documentElement.scrollHeight -
                        window.innerHeight
                    );
                }),
            { timeout: 15_000 },
        )
        .toBeGreaterThan(6500);
    await page.evaluate(() => window.scrollTo(0, 6000));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(6000);
    await expectSavedPosition(page, 6000);
    await openVisibleCard(page);
    // After the reload only the first page loads; the return follows the later pages in
    await reloadAndReturn(page);
    await expectScrolledTo(page, 6000);
});
