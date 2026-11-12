import { test, expect } from "./fixtures";

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
        await page.addInitScript(
            ({ saved }) => {
                localStorage.clear();
                if (saved !== null) {
                    localStorage.setItem("cinexplorer-bg", saved);
                    localStorage.setItem("theme", "dark");
                }
                const capture = () => {
                    if (!document.getElementById("root")) return;
                    observer.disconnect();
                    requestAnimationFrame(() => {
                        document.documentElement.dataset.startupFrame =
                            JSON.stringify(
                                [
                                    "html",
                                    "body",
                                    "#root",
                                    "#preload-overlay",
                                ].map((selector) => {
                                    const element =
                                        document.querySelector(selector);
                                    return element
                                        ? getComputedStyle(element)
                                              .backgroundColor
                                        : null;
                                }),
                            );
                    });
                };
                const observer = new MutationObserver(capture);
                observer.observe(document, { childList: true, subtree: true });
                capture();
            },
            { saved: scenario.saved },
        );
        await page.route("**/*", (route) =>
            route.request().resourceType() === "script"
                ? route.abort()
                : route.fallback(),
        );
        await page.goto("/", { waitUntil: "domcontentloaded" });
        const html = page.locator("html");
        await expect(html).toHaveAttribute("data-startup-frame");
        const colors: unknown = JSON.parse(
            (await html.getAttribute("data-startup-frame")) ?? "null",
        );
        expect(colors).toEqual(Array(4).fill(scenario.color));
        await expect(page.locator("#root")).toBeEmpty();
    });
}

test.describe("CSS fallback without JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    for (const scenario of startupCases.slice(0, 2)) {
        test(scenario.name, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scenario.scheme });
            await page.goto("/");
            for (const selector of [
                "html",
                "body",
                "#root",
                "#preload-overlay",
            ]) {
                await expect(page.locator(selector)).toHaveCSS(
                    "background-color",
                    scenario.color,
                );
            }
        });
    }
});

test("mode and palette changes update every page background without reloading", async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(
        page.getByRole("heading", {
            name: "Welcome to CineXplorer",
            exact: true,
        }),
    ).toBeVisible();
    const assertBackground = async (color: string) => {
        for (const selector of ["html", "body", "#root", "#preload-overlay"]) {
            await expect(page.locator(selector)).toHaveCSS(
                "background-color",
                color,
            );
        }
    };
    await assertBackground("rgb(17, 14, 10)");
    await page
        .getByRole("button", { name: "Toggle color mode", exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem("cinexplorer-bg")))
        .toBe("#F2E8CE");
    await assertBackground("rgb(242, 232, 206)");
    await page.getByRole("button", { name: "Marquee", exact: true }).click();
    await page
        .getByRole("menuitem", { name: "GitHub Primer", exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem("cinexplorer-bg")))
        .toBe("#ffffff");
    await assertBackground("rgb(255, 255, 255)");
});
