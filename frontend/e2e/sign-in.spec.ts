import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import { target } from "./target";
import type { Locator, Page } from "@playwright/test";

async function alertLayout(page: Page, alert: Locator) {
    const [box, usernameLabel, passwordLabel, username, password, banner] =
        await Promise.all([
            alert.boundingBox(),
            page
                .getByText("Username or Email Address", { exact: true })
                .boundingBox(),
            page
                .locator("label")
                .filter({ hasText: /^Password$/ })
                .boundingBox(),
            page
                .getByLabel("Username or Email Address", { exact: true })
                .boundingBox(),
            page.getByLabel("Password", { exact: true }).boundingBox(),
            page.getByRole("banner").boundingBox(),
        ]);
    const viewport = page.viewportSize();
    if (
        !box ||
        !usernameLabel ||
        !passwordLabel ||
        !username ||
        !password ||
        !banner ||
        !viewport
    ) {
        throw new Error(
            "Sign-in alert, labels and fields must have visible bounds",
        );
    }
    return {
        box,
        usernameLabel,
        passwordLabel,
        withinViewport: box.x >= 0 && box.x + box.width <= viewport.width,
        beforeFields:
            box.y + box.height <=
            Math.min(usernameLabel.y, passwordLabel.y, username.y, password.y),
        belowBanner: box.y >= banner.y + banner.height,
        noHorizontalOverflow: await page.evaluate(
            () =>
                document.documentElement.scrollWidth <=
                document.documentElement.clientWidth,
        ),
    };
}

for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
]) {
    test(`rejected credentials fit above the form at ${viewport.width}px`, async ({
        page,
    }) => {
        const message = "Unable to authenticate with provided credentials.";
        await page.setViewportSize(viewport);
        await page.route("**/api/token/", (route) =>
            route.fulfill({ status: 401, json: { error: message } }),
        );
        await page.goto("/login");
        await page
            .getByLabel("Username or Email Address", { exact: true })
            .fill("browser-viewer");
        await page
            .getByLabel("Password", { exact: true })
            .fill("incorrect-password");
        await page.getByRole("button", { name: "Login", exact: true }).click();
        const alert = page.getByRole("alert").filter({ hasText: message });
        await expect(alert).toBeVisible();
        await expect
            .poll(() => alertLayout(page, alert))
            .toMatchObject({
                withinViewport: true,
                beforeFields: true,
                belowBanner: true,
                noHorizontalOverflow: true,
            });
        await expect(alert).toHaveAttribute("aria-live", "assertive");
        await alert
            .getByRole("button", { name: "Dismiss", exact: true })
            .click();
        await expect(alert).toHaveCount(0);
        await expect(
            page.getByLabel("Username or Email Address", { exact: true }),
        ).toHaveValue("browser-viewer");
        await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
            "incorrect-password",
        );
    });
}

test("email-verification guidance and resend action fit above the form on a phone", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/token/", (route) =>
        route.fulfill({
            status: 403,
            json: {
                error: "Please verify your email address before logging in. Check your email for the verification link.",
                email: "v***@example.com",
                resend_token: "a".repeat(64),
            },
        }),
    );
    await page.goto("/login");
    await page
        .getByLabel("Username or Email Address", { exact: true })
        .fill("browser-viewer");
    await page.getByLabel("Password", { exact: true }).fill("correct-password");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    const message = page.getByText(
        "We've sent a verification link to v***@example.com. Please check your inbox.",
    );
    await expect(message).toBeVisible();
    const resend = page.getByRole("button", {
        name: "Resend verification",
        exact: true,
    });
    await expect(resend).toBeVisible();
    for (const element of [
        message,
        resend,
        page.getByRole("button", { name: "Dismiss", exact: true }),
    ]) {
        await expect
            .poll(() => alertLayout(page, element))
            .toMatchObject({
                withinViewport: true,
                beforeFields: true,
                belowBanner: true,
                noHorizontalOverflow: true,
            });
    }
});

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
