import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import {
    clearTokens,
    legacyReport,
    messageOf,
    reportingLogger,
    succeeded,
} from "./logger-test-fixtures";

describe("browser report size", () => {
    afterAll(() => {
        document.cookie = "csrftoken=; Max-Age=0; Path=/";
    });

    beforeEach(() => {
        clearTokens();
        document.cookie = "csrftoken=synthetic-csrf; Path=/";
    });
    afterEach(clearTokens);

    it("keeps bounded stack excerpts when an oversized report replays", async () => {
        const incident = "Oversized rendering incident";
        const stack = "at RenderFixture (app.js:1:1)";
        const componentStack = "at RenderFixture";
        const escaped = "\u0000".repeat(6000);
        server.use(
            http.post(`${apiBaseUrl}/logs/`, () => HttpResponse.error()),
        );
        await expect(
            reportingLogger().reportCriticalError(incident, {
                name: "Error",
                stack: stack + escaped,
                componentStack: componentStack + escaped,
            }),
        ).resolves.toBe(false);

        const reports: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.json());
                return succeeded();
            }),
        );
        await expect(
            reportingLogger().reportCriticalError("Recovery trigger"),
        ).resolves.toBe(true);
        expect(reports).toEqual([
            expect.objectContaining({ message: "Recovery trigger" }),
            expect.objectContaining({
                message: incident,
                data: {
                    _truncated: true,
                    _originalSize: expect.any(Number),
                    name: "Error",
                    stack: expect.stringContaining(stack),
                    componentStack: expect.stringContaining(componentStack),
                },
            }),
        ]);
        const replayed = reports[1];
        const data =
            replayed !== null &&
            typeof replayed === "object" &&
            "data" in replayed
                ? replayed.data
                : undefined;
        expect(JSON.stringify(data ?? null).length).toBeLessThanOrEqual(10000);
    });

    it("keeps bounded React diagnostics when logging a large rendering error", async () => {
        const error = new Error("Rendering failed");
        const stack = "    at render (app.js:7:2)\n".repeat(500);
        const componentStack = "\n    at RenderFixture".repeat(50);
        const errorId = "render-incident";
        error.stack = stack;
        const reports: string[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.text());
                return succeeded();
            }),
        );

        reportingLogger().logError(error, "React ErrorBoundary", {
            errorId,
            componentStack,
        });

        await waitFor(() => expect(reports).toHaveLength(1));
        const report = reports[0] ?? "";
        expect(JSON.parse(report)).toMatchObject({
            level: "ERROR",
            message: "JavaScript Error: [React ErrorBoundary] Rendering failed",
            data: {
                _truncated: true,
                stack: stack.slice(0, 600),
                componentStack: componentStack.slice(0, 600),
                errorId,
            },
        });
        expect(new TextEncoder().encode(report).byteLength).toBeLessThanOrEqual(
            50 * 1024,
        );
    });

    it("keeps bounded status and stack excerpts for a nested Axios error on submission and replay", async () => {
        const message = "Failed sign-in report";
        const config = { headers: new AxiosHeaders() };
        const error = new AxiosError(
            "Request failed with status code 401",
            AxiosError.ERR_BAD_REQUEST,
            config,
            undefined,
            {
                status: 401,
                statusText: "Unauthorized",
                data: { detail: "Invalid credentials" },
                headers: {},
                config,
            },
        );
        const stack = "    at login (app.js:7:2)\n".repeat(500);
        error.stack = stack;

        const reports: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.json());
                return reports.length === 1
                    ? HttpResponse.error()
                    : succeeded();
            }),
        );
        await expect(
            reportingLogger().reportCriticalError(message, { error }),
        ).resolves.toBe(false);
        const saved: unknown = JSON.parse(
            localStorage.getItem("cinexplorer_critical_logs") ?? "[]",
        );
        await expect(
            reportingLogger().reportCriticalError("Recovery trigger"),
        ).resolves.toBe(true);

        const diagnostic = expect.objectContaining({
            message,
            data: expect.objectContaining({
                _truncated: true,
                status: 401,
                stack: stack.slice(0, 600),
            }),
        });
        expect(reports).toEqual([
            diagnostic,
            expect.objectContaining({ message: "Recovery trigger" }),
            diagnostic,
        ]);
        expect(saved).toEqual([diagnostic]);
        expect(localStorage.getItem("cinexplorer_critical_logs")).toBeNull();
    });

    it("keeps an oversized legacy report from blocking later reports", async () => {
        const incident = "Large rendering incident";
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([
                {
                    ...legacyReport(incident + "é".repeat(30000)),
                    data: {
                        stack: "render fixture",
                        details: "界".repeat(9000),
                    },
                    user_agent: "\u0000".repeat(2000),
                    url: "https://cinexplorer.example/" + "p".repeat(9000),
                    correlation_id: "c".repeat(4000),
                    session_id: "s".repeat(4000),
                },
                legacyReport("Later report"),
            ]),
        );
        const attempts: { message: unknown; oversized: boolean }[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const body = await request.text();
                const bytes = new TextEncoder().encode(body).byteLength;
                const message = messageOf(JSON.parse(body));
                const oversized = bytes > 50 * 1024;
                attempts.push({
                    message:
                        typeof message === "string" &&
                        message.startsWith(incident)
                            ? incident
                            : message,
                    oversized,
                });
                if (oversized) {
                    return HttpResponse.json(
                        {
                            success: false,
                            error: "Payload too large",
                            max_size_bytes: 50 * 1024,
                        },
                        { status: 413 },
                    );
                }
                return succeeded();
            }),
        );
        await expect(
            reportingLogger().reportCriticalError("Recovery trigger"),
        ).resolves.toBe(true);
        expect(attempts).toEqual([
            { message: "Recovery trigger", oversized: false },
            { message: incident, oversized: false },
            { message: "Later report", oversized: false },
        ]);
        expect(localStorage.getItem("cinexplorer_critical_logs")).toBeNull();
    });

    it("keeps the same bounded address on submission, in storage and on replay", async () => {
        const originalAddress = window.location.href;
        const origin = window.location.origin;
        const path = "/" + "p".repeat(996 - origin.length);
        const message = "Long page address";
        const reports: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.json());
                return reports.length === 1
                    ? HttpResponse.error()
                    : succeeded();
            }),
        );
        try {
            window.location.href = origin + path + "/..preview?view=fixture";
            expect(window.location.href).toBe(
                origin + path + "/..preview?view=fixture",
            );
            await expect(
                reportingLogger().reportCriticalError(message),
            ).resolves.toBe(false);
        } finally {
            window.location.href = originalAddress;
        }
        const saved: unknown = JSON.parse(
            localStorage.getItem("cinexplorer_critical_logs") ?? "[]",
        );
        const bounded = expect.objectContaining({
            message,
            url: origin + path + "/",
        });
        await expect(
            reportingLogger().reportCriticalError("Recovery trigger"),
        ).resolves.toBe(true);

        expect(saved).toEqual([bounded]);
        expect(reports).toEqual([
            bounded,
            expect.objectContaining({ message: "Recovery trigger" }),
            bounded,
        ]);
        expect(localStorage.getItem("cinexplorer_critical_logs")).toBeNull();
    });

    it("bounds legacy diagnostic context on the first storage rewrite", () => {
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([
                {
                    ...legacyReport("Legacy rendering incident"),
                    data: { stack: "fixture frame\n".repeat(850) },
                },
            ]),
        );
        reportingLogger();

        const rewritten =
            localStorage.getItem("cinexplorer_critical_logs") ?? "";
        expect(rewritten.length).toBeLessThan(10000);
        expect(JSON.parse(rewritten)).toEqual([
            expect.objectContaining({
                message: "Legacy rendering incident",
                data: {
                    _truncated: true,
                    _originalSize: expect.any(Number),
                    stack: expect.stringContaining("fixture frame"),
                },
            }),
        ]);
    });

    it("preserves whole Unicode characters when clipping and replaying a saved report", async () => {
        const emoji = "🎬";
        const message = emoji + "m".repeat(985);
        const stack = emoji + "s".repeat(597);
        const correlationId = emoji + "c".repeat(125);
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([
                {
                    ...legacyReport(message + emoji + "m".repeat(10) + emoji),
                    data: { stack: stack + emoji + "s".repeat(10000) },
                    correlation_id: correlationId + emoji,
                },
            ]),
        );

        const logger = reportingLogger();
        const saved: unknown = JSON.parse(
            localStorage.getItem("cinexplorer_critical_logs") ?? "[]",
        );
        const clipped = expect.objectContaining({
            message: message + "…[truncated]",
            data: expect.objectContaining({ stack }),
            correlation_id: correlationId,
        });

        const attempts: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                attempts.push(await request.json());
                return succeeded();
            }),
        );
        await expect(
            logger.reportCriticalError("Recovery trigger"),
        ).resolves.toBe(true);

        expect(saved).toEqual([clipped]);
        expect(attempts).toEqual([
            expect.objectContaining({ message: "Recovery trigger" }),
            clipped,
        ]);
        expect(localStorage.getItem("cinexplorer_critical_logs")).toBeNull();
    });
});
