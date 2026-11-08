import { test as base, expect } from "@playwright/test";
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
