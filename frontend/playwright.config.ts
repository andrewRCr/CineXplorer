import { defineConfig } from "@playwright/test";

const staging = process.env.E2E_TARGET === "staging";

export default defineConfig({
    testDir: "./e2e",
    retries: 0,
    workers: 1,
    reporter: staging ? [["list"]] : [["list"], ["html", { open: "never" }]],
    use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        baseURL: process.env.E2E_BASE_URL,
        ignoreHTTPSErrors: !staging,
        trace: staging ? "off" : "retain-on-failure",
        screenshot: staging ? "off" : "only-on-failure",
    },
});
