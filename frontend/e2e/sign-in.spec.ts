import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import { target } from "./target";

test("sign in and sign out through the real session", async ({
    page,
}, info) => {
    await page.goto("/login");
    await expect(
        page.getByLabel("Username or Email Address", { exact: true }),
    ).toBeVisible();
    await scanPage(page, info);
    await page
        .getByLabel("Username or Email Address", { exact: true })
        .fill(target.username);
    await page.getByLabel("Password", { exact: true }).fill(target.password);
    await page
        .getByRole("button", { name: "Login", exact: true })
        .last()
        .click();
    await expect(page).toHaveURL(new URL("/", target.baseURL).href);
    await expect(
        page.getByRole("heading", {
            name: "Welcome to CineXplorer",
            exact: true,
        }),
    ).toBeVisible();
    await scanPage(page, info);
    const menu = page.getByRole("button", { name: target.username });
    await expect(menu).toBeVisible();
    await menu.click();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(
        page.getByRole("button", { name: "Login", exact: true }),
    ).toBeVisible();
    await expect(menu).toHaveCount(0);
});
