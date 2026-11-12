import { beforeEach, expect, it } from "vitest";
import { HttpResponse, http } from "msw/http";
import { Logger } from "../logger";
import { invalidateAuthSession } from "../apiClient";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { clearBrowserAuth, token } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";

beforeEach(() => {
    invalidateAuthSession();
    clearBrowserAuth();
    document.cookie = "csrftoken=logger-csrf; path=/";
    window.location.href = "http://localhost:3000/forgot-password";
});

it.each([201, 500])(
    "reports anonymous errors without renewing expired credentials (log response: %s)",
    async (status) => {
        const expired = token(1);
        setAuthTokens(expired);
        let refreshes = 0;
        const reports: unknown[] = [];
        const csrf: Array<string | null> = [];
        server.use(
            http.post(`${apiBaseUrl}/auth/refresh`, () => {
                refreshes++;
                return HttpResponse.json(
                    { detail: "Session expired" },
                    { status: 401 },
                );
            }),
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.json());
                csrf.push(request.headers.get("X-CSRFToken"));
                return HttpResponse.json(
                    status === 201
                        ? { success: true, message: "Log entry received" }
                        : {
                              success: false,
                              message: "Failed to process log entry",
                          },
                    { status },
                );
            }),
        );
        // Explicit reporting is awaitable; disable additional automatic reports.
        const logger = new Logger({
            enableConsole: false,
            enableBackendReporting: false,
        });
        await logger.reportCriticalError("Anonymous operation failed");
        expect(reports).toEqual([
            expect.objectContaining({
                level: "CRITICAL",
                message: "Anonymous operation failed",
            }),
        ]);
        expect(csrf).toEqual(["logger-csrf"]);
        expect(refreshes).toBe(0);
        expect(localStorage.getItem("access_token")).toBe(expired);
        expect(window.location.href).toBe(
            "http://localhost:3000/forgot-password",
        );
    },
);
