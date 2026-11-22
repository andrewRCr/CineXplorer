import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import { Logger, LogLevel } from "@/services/logger";
import {
    clearTokens,
    legacyReport,
    messageOf,
    reportingLogger,
    succeeded,
} from "./logger-test-fixtures";

describe("browser report delivery and replay", () => {
    afterAll(() => {
        document.cookie = "csrftoken=; Max-Age=0; Path=/";
    });

    beforeEach(() => {
        clearTokens();
        document.cookie = "csrftoken=synthetic-csrf; Path=/";
    });
    afterEach(clearTokens);

    it("removes only acknowledged reports when replay partly fails", async () => {
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([
                legacyReport("First stored"),
                legacyReport("Second stored"),
            ]),
        );
        const received: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const payload: unknown = await request.json();
                received.push(payload);
                return messageOf(payload) === "Second stored"
                    ? HttpResponse.json(
                          {
                              success: false,
                              error: "Failed to process log entry",
                          },
                          { status: 500 },
                      )
                    : succeeded();
            }),
        );
        const logger = reportingLogger();

        logger.error("Service recovered");

        await waitFor(() =>
            expect(logger.getCriticalLogsFromStorage()).toEqual([
                expect.objectContaining({ message: "Second stored" }),
            ]),
        );
        await waitFor(() =>
            expect(received.map(messageOf)).toEqual([
                "Service recovered",
                "First stored",
                "Second stored",
            ]),
        );
        expect(logger.getCriticalLogsFromStorage()).toHaveLength(1);
        expect(logger.getFailedReports()).toHaveLength(0);
    });

    it("preserves a new failure during replay and shares concurrent recovery triggers", async () => {
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([legacyReport("Older stored")]),
        );
        let release = () => {};
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        const received: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const payload: unknown = await request.json();
                received.push(payload);
                if (messageOf(payload) === "Older stored") await held;
                return messageOf(payload) === "New failure"
                    ? HttpResponse.error()
                    : succeeded();
            }),
        );
        const logger = reportingLogger();
        try {
            logger.error("First recovery trigger");
            await waitFor(() =>
                expect(received.map(messageOf)).toContain("Older stored"),
            );
            logger.critical("New failure");
            await waitFor(() =>
                expect(logger.getCriticalLogsFromStorage()).toHaveLength(2),
            );
            logger.error("Second recovery trigger");
            await waitFor(() =>
                expect(received.map(messageOf)).toContain(
                    "Second recovery trigger",
                ),
            );
            release();
            await waitFor(() =>
                expect(logger.getCriticalLogsFromStorage()).toEqual([
                    expect.objectContaining({ message: "New failure" }),
                ]),
            );
            expect(
                received
                    .map(messageOf)
                    .filter((message) => message === "Older stored"),
            ).toHaveLength(1);
        } finally {
            release();
        }
    });

    it("sends manual critical reports once and returns their actual outcome", async () => {
        const received: unknown[] = [];
        let available = true;
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const payload: unknown = await request.json();
                received.push(payload);
                return available ? succeeded() : HttpResponse.error();
            }),
        );
        const logger = reportingLogger();

        await expect(
            logger.reportCriticalError("Manual success"),
        ).resolves.toBe(true);
        available = false;
        await expect(
            logger.reportCriticalError("Manual failure"),
        ).resolves.toBe(false);

        expect(received.map(messageOf)).toEqual([
            "Manual success",
            "Manual failure",
        ]);
        expect(logger.getCriticalLogsFromStorage()).toEqual([
            expect.objectContaining({ message: "Manual failure" }),
        ]);
    });

    it("keeps failed explicit retries and reports the failed outcome", async () => {
        server.use(
            http.post(`${apiBaseUrl}/logs/`, () => HttpResponse.error()),
        );
        const logger = reportingLogger();
        logger.critical("Still offline");
        await waitFor(() => expect(logger.getFailedReports()).toHaveLength(1));

        await expect(logger.retryFailedReports()).resolves.toEqual({
            success: 0,
            failed: 1,
        });

        expect(logger.getFailedReports()).toHaveLength(1);
        expect(logger.getCriticalLogsFromStorage()).toHaveLength(1);
    });

    it("continues local logging when persistent storage cannot be read", () => {
        const existing = JSON.stringify([legacyReport("Unread report")]);
        localStorage.setItem("cinexplorer_critical_logs", existing);
        const original = Storage.prototype.getItem;
        const unavailable = vi
            .spyOn(Storage.prototype, "getItem")
            .mockImplementation(function (this: Storage, key: string) {
                if (key === "cinexplorer_critical_logs")
                    throw new DOMException(
                        "Storage unavailable",
                        "SecurityError",
                    );
                return original.call(this, key);
            });
        try {
            const logger = new Logger({
                enableConsole: false,
                enableBackendReporting: false,
            });
            logger.warn("Local logging still works");
            expect(logger.getLogs()).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: "Local logging still works",
                    }),
                ]),
            );
            expect(logger.getCriticalLogsFromStorage()).toEqual([]);
        } finally {
            unavailable.mockRestore();
        }
        expect(localStorage.getItem("cinexplorer_critical_logs")).toBe(
            existing,
        );
    });

    it("keeps local and in-memory failure evidence when persistent storage is full", async () => {
        const original = Storage.prototype.setItem;
        const full = vi
            .spyOn(Storage.prototype, "setItem")
            .mockImplementation(function (
                this: Storage,
                key: string,
                value: string,
            ) {
                if (key === "cinexplorer_critical_logs")
                    throw new DOMException(
                        "Storage full",
                        "QuotaExceededError",
                    );
                original.call(this, key, value);
            });
        server.use(
            http.post(`${apiBaseUrl}/logs/`, () => HttpResponse.error()),
        );
        try {
            const logger = reportingLogger();
            await expect(
                logger.reportCriticalError("Quota incident"),
            ).resolves.toBe(false);
            expect(logger.getLogs()).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: "Quota incident",
                        level: LogLevel.CRITICAL,
                    }),
                ]),
            );
            expect(logger.getFailedReports()).toHaveLength(1);
            expect(
                localStorage.getItem("cinexplorer_critical_logs"),
            ).toBeNull();
        } finally {
            full.mockRestore();
        }
    });

    it("preserves queued reports when acknowledgment cannot read storage", async () => {
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([
                legacyReport("Acknowledged older"),
                legacyReport("Unacknowledged later"),
            ]),
        );
        let release = () => {};
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        const received: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const payload: unknown = await request.json();
                received.push(payload);
                if (messageOf(payload) === "Acknowledged older") await held;
                return messageOf(payload) === "Unacknowledged later"
                    ? HttpResponse.error()
                    : succeeded();
            }),
        );
        const logger = reportingLogger();
        const pending = logger.reportCriticalError("Successful current");
        await waitFor(() =>
            expect(received.map(messageOf)).toContain("Acknowledged older"),
        );
        const existing = localStorage.getItem("cinexplorer_critical_logs");
        const original = Storage.prototype.getItem;
        const unavailable = vi
            .spyOn(Storage.prototype, "getItem")
            .mockImplementation(function (this: Storage, key: string) {
                if (key === "cinexplorer_critical_logs")
                    throw new DOMException(
                        "Storage unavailable",
                        "SecurityError",
                    );
                return original.call(this, key);
            });
        try {
            release();
            await expect(pending).resolves.toBe(true);
        } finally {
            release();
            unavailable.mockRestore();
        }
        expect(localStorage.getItem("cinexplorer_critical_logs")).toBe(
            existing,
        );
        expect(logger.getCriticalLogsFromStorage()).toEqual([
            expect.objectContaining({ message: "Acknowledged older" }),
            expect.objectContaining({ message: "Unacknowledged later" }),
        ]);
    });

    it("bounds stalled CSRF setup and prevents a late logging submission", async () => {
        const received: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const payload: unknown = await request.json();
                received.push(payload);
                return succeeded();
            }),
        );
        const logger = reportingLogger();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        let release = () => {};
        let pending: Promise<boolean> | undefined;
        let csrfFinished = Promise.resolve();
        try {
            await expect(
                logger.reportCriticalError("Healthy deadline"),
            ).resolves.toBe(true);
            document.cookie = "csrftoken=; Max-Age=0; Path=/";
            let started = () => {};
            const csrfStarted = new Promise<void>((resolve) => {
                started = resolve;
            });
            const held = new Promise<void>((resolve) => {
                release = resolve;
            });
            csrfFinished = new Promise<void>((resolve) => {
                server.events.on(
                    "response:mocked",
                    function csrfResponse({ request }) {
                        if (new URL(request.url).pathname === "/api/csrf/") {
                            server.events.removeListener(
                                "response:mocked",
                                csrfResponse,
                            );
                            resolve();
                        }
                    },
                );
            });
            server.use(
                http.get(`${apiBaseUrl}/csrf/`, async () => {
                    started();
                    await held;
                    document.cookie = "csrftoken=synthetic-csrf; Path=/";
                    return HttpResponse.json({});
                }),
            );
            let outcome: boolean | undefined;
            pending = logger
                .reportCriticalError("Stalled CSRF incident")
                .then((result) => {
                    outcome = result;
                    return result;
                });
            await csrfStarted;
            await vi.advanceTimersByTimeAsync(5000);
            expect(outcome).toBe(false);
            expect(logger.getCriticalLogsFromStorage()).toEqual([
                expect.objectContaining({ message: "Stalled CSRF incident" }),
            ]);
        } finally {
            release();
            if (pending) {
                await csrfFinished;
                await vi.advanceTimersByTimeAsync(100);
                await pending;
            }
            vi.useRealTimers();
        }
        expect(received.map(messageOf)).toEqual(["Healthy deadline"]);
    });
});
