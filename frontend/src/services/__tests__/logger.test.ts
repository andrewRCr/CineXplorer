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

const createToken = (payload: unknown): string => {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const encoded = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return `e30.${encoded}.signature`;
};

const clearTokens = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "access_token=; Max-Age=0; Path=/";
};

const logEntry = () => {
    const logger = new Logger({
        enableConsole: false,
        enableBackendReporting: false,
    });
    logger.warn("Signed-in action");
    const entries = logger.getLogs();
    expect(entries).toHaveLength(1);
    return entries[0];
};

describe("logger user identity", () => {
    beforeEach(clearTokens);
    afterEach(clearTokens);

    it.each(["localStorage", "sessionStorage"] as const)(
        "records the signed-in user's ID from %s",
        (storage) => {
            const token = createToken({ user_id: 42 });
            window[storage].setItem("access_token", token);

            expect(logEntry()).toMatchObject({ user_id: 42 });
        },
    );

    it("ignores identity in an access cookie", () => {
        document.cookie = `access_token=${createToken({ user_id: 42 })}; Path=/`;
        expect(logEntry()).toMatchObject({ user_id: undefined });
    });

    it("records a string subject when there is no user_id claim", () => {
        localStorage.setItem("access_token", createToken({ sub: "user-123" }));

        expect(logEntry()).toMatchObject({ user_id: "user-123" });
    });

    it("prefers user_id to the subject claim", () => {
        localStorage.setItem(
            "access_token",
            createToken({ user_id: 42, sub: "other" }),
        );

        expect(logEntry()).toMatchObject({ user_id: 42 });
    });

    it("preserves a numeric zero user ID", () => {
        localStorage.setItem("access_token", createToken({ user_id: 0 }));

        expect(logEntry()).toMatchObject({ user_id: 0 });
    });

    it("decodes base64url and UTF-8 subject values", () => {
        const token = createToken({ sub: "user-ÿ" });
        expect(token).toContain("_");
        localStorage.setItem("access_token", token);

        expect(logEntry()).toMatchObject({ user_id: "user-ÿ" });
    });

    it.each([
        { payload: null },
        { payload: [] },
        { payload: { user_id: true } },
        { payload: { user_id: { id: 42 } } },
        { payload: { sub: [] } },
        { payload: {} },
    ])(
        "keeps logging without an ID for unsupported claims: $payload",
        ({ payload }) => {
            localStorage.setItem("access_token", createToken(payload));

            expect(logEntry()).toMatchObject({
                message: "Signed-in action",
                user_id: undefined,
            });
        },
    );

    it.each(["not-a-token", "e30.%%%.signature", "e30.bm90LWpzb24.signature"])(
        "keeps logging without an ID for malformed tokens: %s",
        (token) => {
            localStorage.setItem("access_token", token);

            expect(logEntry()).toMatchObject({
                message: "Signed-in action",
                user_id: undefined,
            });
        },
    );

    it("keeps logging when no user is signed in", () => {
        expect(logEntry()).toMatchObject({
            message: "Signed-in action",
            user_id: undefined,
        });
    });
});

describe("persisted critical reports", () => {
    const originalUrl = window.location.href;

    afterAll(() => {
        document.cookie = "csrftoken=; Max-Age=0; Path=/";
    });

    beforeEach(() => {
        clearTokens();
        document.cookie = "csrftoken=synthetic-csrf; Path=/";
    });
    afterEach(() => {
        clearTokens();
        window.location.href = originalUrl;
    });

    it("stores a failed critical report without identity, URL parameters or secrets", async () => {
        localStorage.setItem("access_token", createToken({ user_id: 42 }));
        window.location.href =
            "http://localhost:3000/browse?query=private-search#private-fragment";
        server.use(
            http.post(`${apiBaseUrl}/logs/`, () => HttpResponse.error()),
        );
        const logger = new Logger({
            enableConsole: false,
            enableBackendReporting: true,
        });

        await expect(
            logger.reportCriticalError("An offline incident", {
                password: "private-password",
                operation: "browse",
            }),
        ).resolves.toBe(false);
        const serialized =
            localStorage.getItem("cinexplorer_critical_logs") ?? "[]";
        const stored: unknown = JSON.parse(serialized);
        expect(stored).toEqual([
            expect.objectContaining({
                message: "An offline incident",
                url: "http://localhost:3000/browse",
                data: { password: "[FILTERED]", operation: "browse" },
            }),
        ]);
        expect(serialized).not.toContain('"user_id"');
        expect(serialized).not.toContain("private-");
        expect(logger.getLogs()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    message: "An offline incident",
                    user_id: 42,
                }),
            ]),
        );
    });

    const legacyReport = (message: string) => ({
        level: LogLevel.CRITICAL,
        message,
        timestamp: "2026-11-11T18:00:00.000Z",
        user_agent: "synthetic-browser",
        url: "http://localhost:3000/browse?query=private-search#private-fragment",
        user_id: 42,
        session_id: "previous-session",
        data: { token: "private-token", operation: "browse" },
        backendError: "private-backend-error",
    });

    const reportingLogger = () =>
        new Logger({
            enableConsole: false,
            enableBackendReporting: true,
        });

    const succeeded = () =>
        HttpResponse.json(
            { success: true, message: "Log entry received" },
            { status: 201 },
        );

    const messageOf = (value: unknown) =>
        value !== null && typeof value === "object" && "message" in value
            ? value.message
            : undefined;

    it("replays usable legacy reports after a successful report and clears acknowledged storage", async () => {
        localStorage.setItem(
            "cinexplorer_critical_logs",
            JSON.stringify([
                null,
                { ...legacyReport("Invalid date"), timestamp: "not-a-date" },
                legacyReport("Stored incident"),
            ]),
        );
        const received: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                const payload: unknown = await request.json();
                received.push(payload);
                return succeeded();
            }),
        );
        const logger = reportingLogger();

        logger.error("Service recovered");

        await waitFor(() =>
            expect(
                localStorage.getItem("cinexplorer_critical_logs"),
            ).toBeNull(),
        );
        expect(received).toEqual([
            expect.objectContaining({ message: "Service recovered" }),
            expect.objectContaining({
                message: "Stored incident",
                url: "http://localhost:3000/browse",
                data: { token: "[FILTERED]", operation: "browse" },
            }),
        ]);
        expect(JSON.stringify(received[1])).not.toContain("private-");
        expect(received[1]).not.toHaveProperty("user_id");
    });

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

    const contextCases: {
        name: string;
        data: unknown;
        expected: Record<string, unknown>;
    }[] = [
        {
            name: "string",
            data: "incident details",
            expected: { originalData: "incident details" },
        },
        {
            name: "array",
            data: [{ token: "private-token", operation: "browse" }, "details"],
            expected: {
                originalData: [
                    { token: "[FILTERED]", operation: "browse" },
                    "details",
                ],
            },
        },
        {
            name: "request transport fields",
            data: {
                errors: [
                    {
                        status: 401,
                        config: { data: '{"password":"fixture-password"}' },
                        request: { data: "fixture-request" },
                        Headers: { "X-Payload": "fixture-header" },
                        body: "fixture-body",
                        requestData: { login: "fixture-login" },
                        data: "fixture-raw-payload",
                    },
                ],
                details: { data: { operation: "sign-in" } },
            },
            expected: {
                errors: [{ status: 401 }],
                details: { data: { operation: "sign-in" } },
            },
        },
        {
            name: "address context",
            data: {
                details: [
                    {
                        URL: "https://viewer:fixture@cinexplorer.example/login?verify=fixture#fragment",
                        previous:
                            "https://cinexplorer.example/login?reset=fixture",
                        action: "/forgot-password?key=fixture#form",
                        href: "//unexpected.example/?key=fixture",
                    },
                ],
            },
            expected: {
                details: [
                    {
                        URL: "https://cinexplorer.example/login",
                        previous: "https://cinexplorer.example/login",
                        action: "/forgot-password",
                        href: "unknown",
                    },
                ],
            },
        },
        { name: "zero", data: 0, expected: { originalData: 0 } },
        { name: "false", data: false, expected: { originalData: false } },
        { name: "empty string", data: "", expected: { originalData: "" } },
    ];

    it.each(contextCases)(
        "normalises newly stored context: $name",
        async ({ data, expected }) => {
            server.use(
                http.post(`${apiBaseUrl}/logs/`, () => HttpResponse.error()),
            );
            const logger = reportingLogger();
            logger.critical("New context incident", data);
            await waitFor(() =>
                expect(
                    localStorage.getItem("cinexplorer_critical_logs"),
                ).not.toBeNull(),
            );
            const stored: unknown = JSON.parse(
                localStorage.getItem("cinexplorer_critical_logs") ?? "[]",
            );
            expect(stored).toEqual([
                expect.objectContaining({
                    message: "New context incident",
                    data: expected,
                }),
            ]);
        },
    );

    it.each(contextCases)(
        "replays legacy context without blocking later reports: $name",
        async ({ data, expected }) => {
            localStorage.setItem(
                "cinexplorer_critical_logs",
                JSON.stringify([
                    { ...legacyReport("Legacy context"), data },
                    {
                        ...legacyReport("Object context"),
                        data: { token: "private-token", operation: "browse" },
                    },
                    { ...legacyReport("Null context"), data: null },
                ]),
            );
            const received: unknown[] = [];
            server.use(
                http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                    const payload: unknown = await request.json();
                    received.push(payload);
                    const context =
                        payload !== null &&
                        typeof payload === "object" &&
                        "data" in payload
                            ? payload.data
                            : undefined;
                    if (
                        context != null &&
                        (typeof context !== "object" || Array.isArray(context))
                    ) {
                        return HttpResponse.json(
                            {
                                detail: [
                                    {
                                        type: "dict_type",
                                        loc: ["body", "payload", "data"],
                                        msg: "Input should be a valid dictionary",
                                    },
                                ],
                            },
                            { status: 422 },
                        );
                    }
                    return succeeded();
                }),
            );
            const logger = reportingLogger();
            await expect(
                logger.reportCriticalError("Recovery trigger"),
            ).resolves.toBe(true);
            expect(
                localStorage.getItem("cinexplorer_critical_logs"),
            ).toBeNull();
            expect(received).toEqual([
                expect.objectContaining({ message: "Recovery trigger" }),
                expect.objectContaining({
                    message: "Legacy context",
                    data: expected,
                }),
                expect.objectContaining({
                    message: "Object context",
                    data: { token: "[FILTERED]", operation: "browse" },
                }),
                expect.objectContaining({
                    message: "Null context",
                    data: null,
                }),
            ]);
        },
    );
});
