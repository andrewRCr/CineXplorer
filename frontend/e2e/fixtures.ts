import { test as base, expect, type Page } from "@playwright/test";
import { catalogueResponse } from "./catalogue";
import { target } from "./target";

const cataloguePrefixes = [
    "/api/movies",
    "/api/genres",
    "/api/keywords",
    "/api/people",
];

export const test = base.extend({
    page: async ({ page }, use) => {
        const missing: string[] = [];
        if (target.name === "local") {
            await page.context().route("**/*", async (route) => {
                const request = route.request();
                const url = new URL(request.url());
                if (url.origin !== new URL(target.baseURL).origin) {
                    await route.abort();
                } else if (
                    cataloguePrefixes.some((prefix) =>
                        url.pathname.startsWith(prefix),
                    )
                ) {
                    const response =
                        request.method() === "GET"
                            ? catalogueResponse(url)
                            : undefined;
                    if (response) {
                        await route.fulfill({ json: response });
                    } else {
                        missing.push(`${request.method()} ${url.pathname}`);
                        await route.abort();
                    }
                } else {
                    await route.continue();
                }
            });
        }
        await use(page);
        expect(
            missing,
            `Missing catalogue fixtures: ${missing.join(", ")}`,
        ).toEqual([]);
    },
});

export { expect };

export async function prepareStartupBackground(
    page: Page,
    saved: string | null,
): Promise<void> {
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
                            ["html", "body", "#root", "#preload-overlay"].map(
                                (selector) => {
                                    const element =
                                        document.querySelector(selector);
                                    return element
                                        ? getComputedStyle(element)
                                              .backgroundColor
                                        : null;
                                },
                            ),
                        );
                });
            };
            const observer = new MutationObserver(capture);
            observer.observe(document, { childList: true, subtree: true });
            capture();
        },
        { saved },
    );
    await page.route("**/*", (route) =>
        route.request().resourceType() === "script"
            ? route.abort()
            : route.fallback(),
    );
}

export async function expectStartupBackground(
    page: Page,
    color: string,
): Promise<void> {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-startup-frame");
    const colors: unknown = JSON.parse(
        (await html.getAttribute("data-startup-frame")) ?? "null",
    );
    expect(colors).toEqual(Array(4).fill(color));
    await expect(page.locator("#root")).toBeEmpty();
}

export async function expectPageBackground(
    page: Page,
    color: string,
): Promise<void> {
    for (const selector of ["html", "body", "#root", "#preload-overlay"]) {
        await expect(page.locator(selector)).toHaveCSS(
            "background-color",
            color,
        );
    }
}
