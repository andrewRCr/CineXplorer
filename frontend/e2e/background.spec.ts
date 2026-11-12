import { scanPage } from "./axe";
import {
    test,
    expect,
    prepareStartupBackground,
    expectStartupBackground,
    expectPageBackground,
} from "./fixtures";

interface StartupCase {
    name: string;
    scheme: "light" | "dark";
    saved: string | null;
    color: string;
}

const startupCases: StartupCase[] = [
    {
        name: "fresh light",
        scheme: "light",
        saved: null,
        color: "rgb(242, 232, 206)",
    },
    {
        name: "fresh dark",
        scheme: "dark",
        saved: null,
        color: "rgb(17, 14, 10)",
    },
    {
        name: "saved dark over system light",
        scheme: "light",
        saved: "#110E0A",
        color: "rgb(17, 14, 10)",
    },
    {
        name: "invalid saved color in light mode",
        scheme: "light",
        saved: "#invalid",
        color: "rgb(242, 232, 206)",
    },
];

for (const scenario of startupCases) {
    test(`first frame before React: ${scenario.name}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scenario.scheme });
        await prepareStartupBackground(page, scenario.saved);
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expectStartupBackground(page, scenario.color);
    });
}

test.describe("CSS fallback without JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    for (const scenario of startupCases.slice(0, 2)) {
        test(scenario.name, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scenario.scheme });
            await page.goto("/");
            await expectPageBackground(page, scenario.color);
        });
    }
});

test("mode and palette changes update every page background without reloading", async ({
    page,
}, info) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(
        page.getByRole("heading", {
            name: "Welcome to CineXplorer",
            exact: true,
        }),
    ).toBeVisible();
    await scanPage(page, info);

    await expectPageBackground(page, "rgb(17, 14, 10)");
    await page
        .getByRole("button", { name: "Toggle color mode", exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem("cinexplorer-bg")))
        .toBe("#F2E8CE");
    await expectPageBackground(page, "rgb(242, 232, 206)");
    await page.getByRole("button", { name: "Marquee", exact: true }).click();
    await page
        .getByRole("menuitem", { name: "GitHub Primer", exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem("cinexplorer-bg")))
        .toBe("#ffffff");
    await expectPageBackground(page, "rgb(255, 255, 255)");
});
