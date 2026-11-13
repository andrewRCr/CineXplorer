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
        const banner = page.getByRole("banner");
        await expect(
            banner.getByRole("link", { name: "Films", exact: true }),
        ).toBeVisible();
        await expect(
            banner.getByRole("textbox", { name: "Search films", exact: true }),
        ).toBeVisible();
        await expect(
            banner.getByRole("link", { name: "Sign in", exact: true }),
        ).toBeVisible();
        const dimensions = await banner.evaluate((element) => ({
            height: element.getBoundingClientRect().height,
            token: parseFloat(
                getComputedStyle(element).getPropertyValue(
                    "--chakra-sizes-layout-navbar",
                ),
            ),
        }));
        expect(dimensions.height).toBe(dimensions.token);
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
        await expect(
            banner.getByRole("link", { name: "Watchlist", exact: true }),
        ).toBeVisible();
        for (let step = 0; step < 30; step++) {
            await page.keyboard.press("Tab");
            if (
                await menu.evaluate(
                    (element) => element === document.activeElement,
                )
            )
                break;
        }
        await expect(menu).toBeFocused();
        const ring = await menu.evaluate((element) => {
            const reference = document.createElement("span");
            reference.style.setProperty(
                "color",
                "var(--chakra-colors-ring)",
                "important",
            );
            element.after(reference);
            try {
                return getComputedStyle(reference).color;
            } finally {
                reference.remove();
            }
        });
        await expect(menu).toHaveCSS("outline-color", ring);
        await expect(menu).toHaveCSS("outline-width", "2px");
        await expect(menu).toHaveCSS("outline-style", "solid");
        await menu.click();
        const logoutResponse = page.waitForResponse(
            (response) =>
                response.url() ===
                    new URL("/api/logout/", target.baseURL).href &&
                response.request().method() === "POST",
        );
        await page
            .getByRole("menuitem", { name: "Sign out", exact: true })
            .click();
        const response = await logoutResponse;
        expect(response.ok(), `Logout returned HTTP ${response.status()}`).toBe(
            true,
        );
        await expect(page).toHaveURL(new URL("/login", target.baseURL).href);
        await expect(
            page.getByRole("link", { name: "Sign in", exact: true }),
        ).toBeVisible();
        await expect(menu).toHaveCount(0);
    });
}
