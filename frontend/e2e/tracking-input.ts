import { setTimeout as delay } from "node:timers/promises";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect } from "./tracking-fixture";
import { scanPage } from "./axe";

export type InputMode = "mouse" | "keyboard" | "touch";

export async function tabTo(page: Page, control: Locator) {
    for (let step = 0; step < 80; step++) {
        if (
            await control.evaluate(
                (element) => element === document.activeElement,
            )
        )
            return;
        // Toast keyboard focus returns to its entry point on blur; Escape dismisses it before continuing.
        if (
            await page
                .getByRole("region", { name: /^Notifications/ })
                .evaluateAll((regions) =>
                    regions.some((region) =>
                        region.contains(document.activeElement),
                    ),
                )
        )
            await page.keyboard.press("Escape");
        await page.keyboard.press("Tab");
    }
    await expect(control).toBeFocused();
}

export function controls(page: Page, mode: InputMode) {
    return {
        async activate(control: Locator) {
            if (mode === "keyboard") {
                await tabTo(page, control);
                await page.keyboard.press("Enter");
            } else if (mode === "touch") await control.tap();
            else await control.click();
        },
        async type(control: Locator, text: string) {
            if (mode === "keyboard") {
                await tabTo(page, control);
                await page.keyboard.type(text);
            } else await control.fill(text);
        },
    };
}

export async function signIn(
    page: Page,
    mode: InputMode,
    username: string,
    password: string,
    info: TestInfo,
) {
    const input = controls(page, mode);
    await page.goto("/login");
    const usernameField = page.getByLabel("Username or Email Address", {
        exact: true,
    });
    await expect(usernameField).toBeVisible();
    await scanPage(page, info);
    await input.type(usernameField, username);
    await input.type(page.getByLabel("Password", { exact: true }), password);
    for (let attempt = 0; attempt < 2; attempt++) {
        const answer = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === "/api/token/" &&
                response.request().method() === "POST",
        );
        await input.activate(
            page.getByRole("button", { name: "Login", exact: true }),
        );
        const response = await answer;
        if (response.status() !== 429) {
            expect(response.ok()).toBe(true);
            await expect(
                page.getByRole("heading", {
                    name: "Welcome to CineXplorer",
                    exact: true,
                }),
            ).toBeVisible();
            await scanPage(page, info);
            return;
        }
        // Other smoke specs and manual checks share the IP-based login window.
        const seconds = Number(response.headers()["retry-after"] ?? 60);
        expect(seconds).toBeGreaterThanOrEqual(0);
        expect(seconds).toBeLessThanOrEqual(60);
        info.annotations.push({
            type: "login-throttle",
            description: `HTTP 429; waiting ${seconds + 1}s before one retry`,
        });
        if (attempt === 0) await delay((seconds + 1) * 1000);
    }
    throw new Error(
        "Local sign-in remained rate-limited after its retry window",
    );
}

export async function color(control: Locator, token: string) {
    return control.evaluate((element, name) => {
        const probe = document.createElement("span");
        probe.style.setProperty(
            "color",
            `var(--chakra-colors-${name})`,
            "important",
        );
        element.append(probe);
        const result = getComputedStyle(probe).color;
        probe.remove();
        return result;
    }, token);
}
