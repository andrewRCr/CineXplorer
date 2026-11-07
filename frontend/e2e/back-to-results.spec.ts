import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import { useRestoreCatalogue } from "./catalogue";

test("Back to Results restores the position after reloading detail", async ({
    page,
}, info) => {
    await useRestoreCatalogue(page);
    await page.goto("/browse");
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
    await scanPage(page, info);
    await page.evaluate(() => window.scrollTo(0, 2600));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(2600);
    // Wait for the app's 200 ms scroll-save debounce before leaving the collection.
    await expect
        .poll(() =>
            page.evaluate(() => {
                for (let index = 0; index < sessionStorage.length; index++) {
                    const key = sessionStorage.key(index);
                    if (key?.startsWith("scroll-")) {
                        const saved: { position?: number } = JSON.parse(
                            sessionStorage.getItem(key) ?? "{}",
                        );
                        if (saved.position === 2600) return true;
                    }
                }
                return false;
            }),
        )
        .toBe(true);
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
    await scanPage(page, info);
    await page.reload();
    await expect(
        page.getByRole("heading", { name: /^Movie \d+$/, exact: true }),
    ).toBeVisible();
    await page
        .getByRole("link", { name: "Back to Results", exact: true })
        .click();
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
    await expect
        .poll(async () =>
            Math.abs((await page.evaluate(() => window.scrollY)) - 2600),
        )
        .toBeLessThanOrEqual(20);
});
