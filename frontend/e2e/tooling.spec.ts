import { test as base, expect } from "@playwright/test";

const test = base.extend<{ smokeValue: string }>({
    smokeValue: async ({ browserName }, use) => {
        await use(browserName);
    },
});

test("tooling reaches fixtures", async ({ smokeValue }) => {
    expect(smokeValue).toBe("chromium");
});
