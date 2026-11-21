import type { Page } from "@playwright/test";
import { scanPage } from "./axe";
import { expect, test } from "./fixtures";
import { target } from "./target";
import { gate } from "../tests/helpers/web-locks";

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
        await scanPage(page, info);
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

const viewer = { id: 123, username: "legal-reader", email_verified: true };
const registered =
    "Account created! Check your email to verify your account before logging in.";
const verified = "Email verified. You can now log in.";
const reset = "Password reset. You can now log in with your new password.";

async function holdResponse(
    page: Page,
    path: string,
    json: object,
    status = 200,
) {
    const requested = gate();
    const reply = gate();
    await page.route(new URL(path, target.baseURL).href, async (route) => {
        requested.release();
        await reply.wait;
        await route.fulfill({ status, json });
    });
    return { requested: requested.wait, release: reply.release };
}

async function mockPasswordSession(page: Page) {
    const claims = Buffer.from(
        JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 300,
            user_id: viewer.id,
            token_type: "access",
        }),
    ).toString("base64url");
    await page.route("**/api/profile/", (route) =>
        route.fulfill({ json: viewer }),
    );
    return { user_id: viewer.id, access_token: `e30.${claims}.fixture` };
}

async function openLegalFooterLink(page: Page, label = "Privacy Policy") {
    await page
        .getByRole("contentinfo")
        .getByRole("link", { name: label })
        .click();
    await expect(
        page.getByRole("heading", { level: 1, name: `CineXplorer ${label}` }),
    ).toBeVisible();
}

async function submitPasswordSignIn(page: Page) {
    await page
        .getByLabel("Username or Email Address", { exact: true })
        .fill(viewer.username);
    await page
        .getByLabel("Password", { exact: true })
        .fill("Not-a-real-password!");
    await page.getByRole("button", { name: "Login", exact: true }).click();
}

test.describe("account actions completing on a legal page", () => {
    test.skip(target.name === "staging", "Uses synthetic account responses");

    test("password sign-in leaves the selected document open", async ({
        page,
    }, info) => {
        const session = await mockPasswordSession(page);
        const signIn = await holdResponse(page, "/api/token/", session);
        await page.goto("/login?next=%2Fwatchlist");
        await expect(
            page.getByRole("button", { name: "Login", exact: true }),
        ).toBeVisible();
        await scanPage(page, info);
        await submitPasswordSignIn(page);
        try {
            await signIn.requested;
            await openLegalFooterLink(page);
        } finally {
            signIn.release();
        }
        await expect(
            page.getByRole("button", { name: viewer.username }),
        ).toBeVisible();
        await expect(page).toHaveURL("/privacy");
        await scanPage(page, info);
    });

    test("registration gives the verification instructions on the selected document", async ({
        page,
    }, info) => {
        const registration = await holdResponse(
            page,
            "/api/register/",
            {
                user_id: viewer.id,
                email: "legal-reader@example.com",
                email_sent: true,
            },
            201,
        );
        await page.goto("/register");
        await expect(
            page.getByRole("button", { name: "Register", exact: true }),
        ).toBeVisible();
        await scanPage(page, info);
        await page.getByLabel("CineXplorer Username").fill(viewer.username);
        await page.getByLabel("Email Address").fill("legal-reader@example.com");
        await page
            .getByLabel("Password", { exact: true })
            .fill("Not-a-real-password!");
        await page
            .getByRole("button", { name: "Register", exact: true })
            .click();
        try {
            await registration.requested;
            await openLegalFooterLink(page);
        } finally {
            registration.release();
        }
        await expect(
            page.getByText(registered, { exact: true }).first(),
        ).toBeVisible();
        await expect(page).toHaveURL("/privacy");
        await scanPage(page, info);
    });

    for (const action of [
        {
            name: "email verification",
            query: "verify",
            endpoint: "/api/verify-email/",
            button: "Complete Verification",
            status: 200,
            message: verified,
        },
        {
            name: "password reset",
            query: "reset",
            endpoint: "/_allauth/browser/v1/auth/password/reset",
            button: "Reset Password",
            status: 401,
            message: reset,
        },
    ]) {
        test(`${action.name} leaves the legal address in place after the dialog is closed`, async ({
            page,
        }, info) => {
            const reply = await holdResponse(
                page,
                action.endpoint,
                { email: "legal-reader@example.com" },
                action.status,
            );
            await page.goto(`/login?${action.query}=fixture-key`);
            if (action.query === "reset") {
                await page
                    .getByLabel("New Password", { exact: true })
                    .fill("Not-a-real-password!");
                await page
                    .getByLabel("Confirm Password", { exact: true })
                    .fill("Not-a-real-password!");
            }
            await page
                .getByRole("button", { name: action.button, exact: true })
                .click();
            try {
                await reply.requested;
                await page.keyboard.press("Escape");
                await expect(page.getByRole("dialog")).toBeHidden();
                await scanPage(page, info);
                await openLegalFooterLink(page);
            } finally {
                reply.release();
            }
            await expect(
                page.getByText(action.message, { exact: true }),
            ).toBeVisible();
            await expect(page).toHaveURL("/privacy");
            await scanPage(page, info);
        });
    }

    test("sign-out reconciles the session on the selected document", async ({
        page,
    }, info) => {
        const session = await mockPasswordSession(page);
        await page.route("**/api/token/", (route) =>
            route.fulfill({ json: session }),
        );
        const signOut = await holdResponse(page, "/api/logout/", {
            message: "Logged out",
        });
        await page.goto("/login?next=%2Fprivacy");
        await expect(
            page.getByRole("button", { name: "Login", exact: true }),
        ).toBeVisible();
        await scanPage(page, info);
        await submitPasswordSignIn(page);
        const account = page.getByRole("button", { name: viewer.username });
        await expect(account).toBeVisible();
        await expect(page).toHaveURL("/privacy");
        await scanPage(page, info);
        await account.click();
        await page.getByRole("menuitem", { name: "Sign out" }).click();
        try {
            await signOut.requested;
            await openLegalFooterLink(page, "Terms of Service");
            const refreshed = page.waitForEvent("load");
            signOut.release();
            await refreshed;
        } finally {
            signOut.release();
        }
        await expect(page).toHaveURL("/terms");
        await expect(
            page.getByRole("link", { name: "Sign in", exact: true }),
        ).toBeVisible();
        await scanPage(page, info);
    });
});
