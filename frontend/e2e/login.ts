import { setTimeout as delay } from "node:timers/promises";
import { expect, type Page, type TestInfo } from "@playwright/test";

// Every sign-in through the form shares the backend's IP-based login window (five per minute) with the other specs
// and with manual checks, and a fast host can run more than five inside a minute. A throttled sign-in waits out the
// window once, and the test's timeout grows by that wait.
export async function submitLogin(
    page: Page,
    info: TestInfo,
    submit: () => Promise<void>,
): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const answer = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === "/api/token/" &&
                response.request().method() === "POST",
        );
        await submit();
        const response = await answer;
        if (response.status() !== 429) {
            expect(response.ok()).toBe(true);
            return;
        }
        const seconds = Number(response.headers()["retry-after"] ?? 60);
        expect(seconds).toBeGreaterThanOrEqual(0);
        expect(seconds).toBeLessThanOrEqual(60);
        info.annotations.push({
            type: "login-throttle",
            description: `HTTP 429; waiting ${seconds + 1}s before one retry`,
        });
        if (attempt === 0) {
            if (info.timeout)
                info.setTimeout(info.timeout + (seconds + 1) * 1000);
            await delay((seconds + 1) * 1000);
        }
    }
    throw new Error("Sign-in remained rate-limited after its retry window");
}
