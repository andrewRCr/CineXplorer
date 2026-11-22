import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { server } from "@tests/mocks/server";
import { apiBaseUrl } from "@/config/baseUrls";
import { Logger } from "@/services/logger";
import {
    clearTokens,
    createToken,
    legacyReport,
    reportingLogger,
    succeeded,
} from "./logger-test-fixtures";

describe("browser report content", () => {
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

    it("reports only the site and path of an API error endpoint", async () => {
        const reports: unknown[] = [];
        server.use(
            http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                reports.push(await request.json());
                return succeeded();
            }),
        );
        reportingLogger().logApiError(
            "https://api.example.test/films?view=fixture-view#fixture-section",
            "get",
            404,
        );
        await waitFor(() => expect(reports).toHaveLength(1));
        expect(reports[0]).toMatchObject({
            message: "API Error: GET https://api.example.test/films (404)",
            data: {
                endpoint: "https://api.example.test/films",
                method: "GET",
                status: 404,
            },
        });
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
        {
            name: "API endpoint addresses",
            data: {
                details: {
                    Endpoint:
                        "https://api.example.test/films?view=fixture#page",
                    endpoint: "/shows?view=fixture#page",
                },
            },
            expected: {
                details: {
                    Endpoint: "https://api.example.test/films",
                    endpoint: "/shows",
                },
            },
        },
        {
            name: "relative addresses with control characters",
            data: {
                details: {
                    href: "/browse\t/details?view=fixture",
                    url: "/browse\n/details#page",
                },
            },
            expected: { details: { href: "unknown", url: "unknown" } },
        },
        {
            name: "ambiguous address forms",
            data: {
                details: {
                    endpoint: "https:api.example.test/films",
                    href: "/browse\\details",
                    referer: "https:///api.example.test/films",
                },
            },
            expected: {
                details: {
                    endpoint: "unknown",
                    href: "unknown",
                    referer: "unknown",
                },
            },
        },
        { name: "zero", data: 0, expected: { originalData: 0 } },
        { name: "false", data: false, expected: { originalData: false } },
        { name: "empty string", data: "", expected: { originalData: "" } },
    ];

    it.each(contextCases)(
        "normalises newly stored context: $name",
        async ({ data, expected }) => {
            const submitted: unknown[] = [];
            server.use(
                http.post(`${apiBaseUrl}/logs/`, async ({ request }) => {
                    submitted.push(await request.json());
                    return HttpResponse.error();
                }),
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
            const sanitized = expect.objectContaining({
                message: "New context incident",
                data: expected,
            });
            expect(submitted).toEqual([sanitized]);
            expect(stored).toEqual([sanitized]);
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
