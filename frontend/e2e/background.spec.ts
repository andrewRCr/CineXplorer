import { scanPage } from "./axe";
import { target } from "./target";
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
        .getByRole("menuitemradio", { name: "GitHub Primer", exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem("cinexplorer-bg")))
        .toBe("#ffffff");
    await expectPageBackground(page, "rgb(255, 255, 255)");
});

const colorModeCases: {
    name: string;
    system: "light" | "dark";
    saved: "light" | null;
}[] = [
    { name: "fresh light mode", system: "light", saved: null },
    { name: "fresh dark mode", system: "dark", saved: null },
    {
        name: "saved light mode on a dark system",
        system: "dark",
        saved: "light",
    },
];

for (const scenario of colorModeCases) {
    test(`color mode stays quiet and persists: ${scenario.name}`, async ({
        page,
    }, info) => {
        const diagnostics: string[] = [];
        page.on("console", (message) => {
            const expectedSessionProbe =
                message.type() === "error" &&
                message.location().url ===
                    new URL("/_allauth/browser/v1/auth/session", target.baseURL)
                        .href &&
                /^Failed to load resource: the server responded with a status of 401(?:\s|$)/.test(
                    message.text(),
                );
            if (expectedSessionProbe) {
                info.annotations.push({
                    type: "expected-anonymous-session",
                    description:
                        "The signed-out session probe returned HTTP 401.",
                });
            } else if (
                message.type() === "warning" ||
                message.type() === "error"
            ) {
                diagnostics.push(message.text());
            }
        });
        page.on("pageerror", (error) => diagnostics.push(error.message));
        await page.emulateMedia({ colorScheme: scenario.system });
        await page.addInitScript(
            ({ saved }) => {
                if (saved && localStorage.getItem("theme") === null) {
                    localStorage.setItem("theme", saved);
                    localStorage.setItem("cinexplorer-bg", "#F2E8CE");
                }
            },
            { saved: scenario.saved },
        );
        await page.goto("/");
        const heading = page.getByRole("heading", {
            name: "Welcome to CineXplorer",
            exact: true,
        });
        await expect(heading).toBeVisible();
        await scanPage(page, info);
        const initial = scenario.saved ?? scenario.system;
        const changed = initial === "dark" ? "light" : "dark";
        const marqueeColors = {
            light: "rgb(242, 232, 206)",
            dark: "rgb(17, 14, 10)",
        };
        await expectPageBackground(page, marqueeColors[initial]);
        if (scenario.saved === null) {
            await page.emulateMedia({ colorScheme: changed });
            await expectPageBackground(page, marqueeColors[changed]);
            await page.emulateMedia({ colorScheme: scenario.system });
            await expectPageBackground(page, marqueeColors[initial]);
        }
        await page
            .getByRole("button", {
                name: "Toggle color mode",
                exact: true,
            })
            .click();
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem("theme")))
            .toBe(changed);
        await expectPageBackground(page, marqueeColors[changed]);
        await page
            .getByRole("button", { name: "Marquee", exact: true })
            .click();
        await page
            .getByRole("menuitemradio", {
                name: "GitHub Primer",
                exact: true,
            })
            .click();
        const paletteColor =
            changed === "dark" ? "rgb(13, 17, 23)" : "rgb(255, 255, 255)";
        await expectPageBackground(page, paletteColor);
        await page.reload();
        await expect(heading).toBeVisible();
        await expectPageBackground(page, paletteColor);
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem("theme")))
            .toBe(changed);
        await expect(
            page.getByRole("button", {
                name: "GitHub Primer",
                exact: true,
            }),
        ).toBeVisible();
        expect(diagnostics).toEqual([]);
    });
}
