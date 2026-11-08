import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { Logger, LogLevel } from "../logger";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";

let pending: Promise<unknown>[];

const settleLogging = async () => {
    await vi.dynamicImportSettled();
    await Promise.allSettled(pending);
    // Finish response continuations queued by the browser transport events.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
    pending = [];
    const send = globalThis.fetch;
    vi.stubGlobal("fetch", (...args: Parameters<typeof fetch>) => {
        const response = send(...args);
        pending.push(response);
        return response;
    });
    const BrowserRequest = globalThis.XMLHttpRequest;
    vi.stubGlobal(
        "XMLHttpRequest",
        class extends BrowserRequest {
            constructor() {
                super();
                pending.push(
                    new Promise<void>((resolve) =>
                        this.addEventListener("loadend", () => resolve(), {
                            once: true,
                        }),
                    ),
                );
            }
        },
    );
    clearBrowserAuth();
    document.cookie = "csrftoken=logger-csrf; path=/";
    vi.stubEnv("VITE_NODE_ENV", "");
    vi.stubEnv("VITE_APP_ENV", "");
});
afterEach(async () => {
    await settleLogging();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    clearBrowserAuth();
});

describe("logger environment levels", () => {
    it.each([
        { mode: "development", dev: true, levels: [0, 1, 2, 3, 4] },
        { mode: "test", dev: true, levels: [2, 3, 4] },
        { mode: "production", dev: false, levels: [3, 4] },
        { mode: "staging", dev: true, levels: [3, 4] },
    ])("stores the admitted levels in $mode", async ({ mode, dev, levels }) => {
        vi.stubEnv("MODE", mode);
        vi.stubEnv("DEV", dev);
        const written: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/dev-logs/write/`, async ({ request }) => {
                written.push(await request.json());
                return HttpResponse.json({
                    status: "ok",
                    file: "frontend.log",
                });
            }),
        );
        const logger = new Logger({
            enableConsole: false,
            enableBackendReporting: false,
        });
        logger.debug("sample-debug");
        logger.info("sample-info");
        logger.warn("sample-warn");
        logger.error("sample-error");
        logger.critical("sample-critical");
        expect(
            logger
                .getLogs()
                .filter((entry) => entry.message.startsWith("sample-"))
                .map((entry) => entry.level),
        ).toEqual(levels);
        expect(logger.getEnvironmentInfo().environment).toBe(mode);
        if (mode === "development")
            await waitFor(() => expect(written).toHaveLength(6));
        else expect(written).toEqual([]);
    });
});

describe("backend reporting threshold", () => {
    it.each([
        { threshold: LogLevel.WARN, expected: ["WARN", "ERROR", "CRITICAL"] },
        { threshold: LogLevel.ERROR, expected: ["ERROR", "CRITICAL"] },
    ])("reports at and above $threshold", async ({ threshold, expected }) => {
        const reports: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.json());
                return HttpResponse.json(
                    { success: true, message: "Log entry received" },
                    { status: 201 },
                );
            }),
        );
        const logger = new Logger({
            level: LogLevel.DEBUG,
            enableConsole: false,
            enableBackendReporting: true,
            backendReportingThreshold: threshold,
        });
        logger.debug("sample-debug");
        logger.info("sample-info");
        logger.warn("sample-warn");
        logger.error("sample-error");
        logger.critical("sample-critical");
        // Reporting loads the real API client lazily before starting its requests.
        await vi.dynamicImportSettled();
        await waitFor(() => expect(reports).toHaveLength(expected.length));
        await settleLogging();
        expect(reports).toEqual(
            expect.arrayContaining(
                expected.map((level) =>
                    expect.objectContaining({
                        level,
                        message: `sample-${level.toLowerCase()}`,
                        source: "frontend",
                        environment: "test",
                    }),
                ),
            ),
        );
        expect(reports).toHaveLength(expected.length);
        expect(
            logger
                .getLogs()
                .filter((entry) => entry.message.startsWith("sample-")),
        ).toHaveLength(5);
    });
});
