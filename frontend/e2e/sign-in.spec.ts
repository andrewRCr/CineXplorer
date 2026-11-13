import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import { target } from "./target";

for (const rememberMe of [false, true]) {
    test(`sign in and sign out through the real session (remember me: ${rememberMe})`, async ({
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
        await page
            .getByLabel("Password", { exact: true })
            .fill(target.password);
        const checkbox = page.getByRole("checkbox", {
            name: "Remember Me",
            exact: true,
        });
        if (rememberMe)
            await page.getByText("Remember Me", { exact: true }).click();
        await expect(checkbox).toBeChecked({ checked: rememberMe });
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
        const assertPersistence = async () => {
            const cookie = (await page.context().cookies()).find(
                (item) => item.name === "refresh_token",
            );
            expect(cookie).toBeDefined();
            expect(cookie?.httpOnly).toBe(true);
            expect(cookie?.secure).toBe(true);
            expect(cookie?.sameSite).toBe("Lax");
            if (rememberMe) {
                expect(cookie?.expires).toBeGreaterThan(
                    Date.now() / 1000 + 13 * 86400,
                );
                expect(cookie?.expires).toBeLessThanOrEqual(
                    Date.now() / 1000 + 14 * 86400 + 60,
                );
            } else {
                expect(cookie?.expires).toBe(-1);
            }
        };
        await assertPersistence();
        for (let renewal = 0; renewal < 2; renewal++) {
            const csrf = (await page.context().cookies()).find(
                (item) => item.name === "csrftoken",
            );
            const renewed = await page.request.post(
                new URL("/api/auth/refresh", target.baseURL).href,
                {
                    data: {},
                    headers: {
                        "X-CSRFToken": csrf?.value ?? "",
                        Origin: new URL(target.baseURL).origin,
                        Referer: new URL("/", target.baseURL).href,
                    },
                },
            );
            expect(renewed.status()).toBe(200);
            await assertPersistence();
        }
        const menu = page.getByRole("button", { name: target.username });
        await expect(menu).toBeVisible();
        await menu.click();
        const logoutResponse = page.waitForResponse(
            (response) =>
                response.url() ===
                    new URL("/api/logout/", target.baseURL).href &&
                response.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Logout", exact: true }).click();
        const response = await logoutResponse;
        expect(response.ok(), `Logout returned HTTP ${response.status()}`).toBe(
            true,
        );
        await expect(page).toHaveURL(new URL("/login", target.baseURL).href);
        await expect(
            page.getByRole("button", { name: "Login", exact: true }).first(),
        ).toBeVisible();
        await expect(menu).toHaveCount(0);
    });
}
