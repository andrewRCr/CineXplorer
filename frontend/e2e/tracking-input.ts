import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect } from "./tracking-fixture";
import { scanPage } from "./axe";
import { submitLogin } from "./login";

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
    await submitLogin(page, info, () =>
        input.activate(
            page.getByRole("button", { name: "Login", exact: true }),
        ),
    );
    await expect(
        page.getByRole("heading", {
            name: "Popular in theaters",
            exact: true,
        }),
    ).toBeVisible();
    await scanPage(page, info);
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
