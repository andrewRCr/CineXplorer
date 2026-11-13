import type { Locator, Page } from "@playwright/test";
import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import { target } from "./target";

test.use({ viewport: { width: 360, height: 800 } });

async function expectInsideViewport(control: Locator) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    if (!box) throw new Error("A visible bar control must have a box");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(box.y + box.height).toBeLessThanOrEqual(800);
}

async function expectBarFits(page: Page, signedIn: boolean) {
    const banner = page.getByRole("banner");
    const dimensions = await banner.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        token: parseFloat(
            getComputedStyle(element).getPropertyValue(
                "--chakra-sizes-layout-navbar",
            ),
        ),
    }));
    expect(dimensions.height).toBe(dimensions.token);
    for (const control of [
        banner.getByRole("button", { name: "Open menu", exact: true }),
        banner.getByRole("link", { name: "CineXplorer", exact: true }),
        banner.getByRole("button", { name: "Search films", exact: true }),
        signedIn
            ? banner.getByRole("button", { name: target.username, exact: true })
            : banner.getByRole("link", { name: "Sign in", exact: true }),
    ])
        await expectInsideViewport(control);
}

test("phone navigation fits and opens the drawer, search and account menu", async ({
    page,
}, info) => {
    await page.goto("/login");
    await expect(
        page.getByLabel("Username or Email Address", { exact: true }),
    ).toBeVisible();
    await expectBarFits(page, false);
    await scanPage(page, info);
    await page
        .getByLabel("Username or Email Address", { exact: true })
        .fill(target.username);
    await page.getByLabel("Password", { exact: true }).fill(target.password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(
        page.getByRole("heading", {
            name: "Welcome to CineXplorer",
            exact: true,
        }),
    ).toBeVisible();
    await expectBarFits(page, true);
    const banner = page.getByRole("banner");
    const account = banner.getByRole("button", {
        name: target.username,
        exact: true,
    });
    await expect(account).toHaveText("", { useInnerText: true });
    await scanPage(page, info);

    const menuButton = banner.getByRole("button", {
        name: "Open menu",
        exact: true,
    });
    await menuButton.click();
    const drawer = page.getByRole("dialog", { name: "Menu", exact: true });
    await expect(
        drawer.getByRole("link", { name: "Films", exact: true }),
    ).toBeVisible();
    await expect(
        drawer.getByRole("link", { name: "Watchlist", exact: true }),
    ).toBeVisible();
    await scanPage(page, info);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
    await menuButton.click();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(drawer).toBeHidden();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await banner.getByRole("link", { name: "Films", exact: true }).click();
    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(drawer).toBeHidden();
    await page.setViewportSize({ width: 360, height: 800 });
    await menuButton.click();
    await drawer.getByRole("link", { name: "Films", exact: true }).click();
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(new URL("/browse", target.baseURL).href);
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
    await scanPage(page, info);

    await banner
        .getByRole("button", { name: "Search films", exact: true })
        .click();
    const input = banner.getByRole("textbox", {
        name: "Search films",
        exact: true,
    });
    await expect(input).toBeFocused();
    await input.fill("Alien");
    for (const control of ["Search", "Close search"]) {
        await input.press("Tab");
        if (control === "Close search") await page.keyboard.press("Tab");
        await expect(
            banner.getByRole("button", { name: control, exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(input).toBeHidden();
        const opener = banner.getByRole("button", {
            name: "Search films",
            exact: true,
        });
        await expect(opener).toBeFocused();
        await opener.click();
        await input.fill("Alien");
    }
    await input.press("Enter");
    await expect(page).toHaveURL(
        new URL("/search?query=Alien", target.baseURL).href,
    );
    await expect(
        page.getByRole("heading", { name: /^Search Results/ }),
    ).toBeVisible();
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toHaveCSS(
        "opacity",
        "1",
    );
    await scanPage(page, info);
    await banner
        .getByRole("button", { name: target.username, exact: true })
        .click();
    const accountMenu = page.getByRole("menu");
    await expect(
        accountMenu.getByRole("menuitem", { name: "Profile", exact: true }),
    ).toBeVisible();
    await expect(
        accountMenu.getByRole("menuitem", { name: "Sign out", exact: true }),
    ).toBeVisible();
    for (const width of [1024, 1023]) {
        await page.setViewportSize({ width, height: 800 });
        await expect(accountMenu).toBeHidden();
        await page.keyboard.press("Tab");
        await expect(page.locator(":focus")).toBeVisible();
        await banner
            .getByRole("button", { name: target.username, exact: true })
            .click();
        await expect(accountMenu).toBeVisible();
    }
});
