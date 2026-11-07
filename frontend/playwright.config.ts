import { defineConfig } from "@playwright/test";
import { target } from "./e2e/target";

const staging = target.name === "staging";

export default defineConfig({
    testDir: "./e2e",
    retries: 0,
    workers: 1,
    reporter: staging ? [["list"]] : [["list"], ["html", { open: "never" }]],
    use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        baseURL: target.baseURL,
        ignoreHTTPSErrors: !staging,
        trace: staging ? "off" : "retain-on-failure",
        screenshot: staging ? "off" : "only-on-failure",
    },
});
