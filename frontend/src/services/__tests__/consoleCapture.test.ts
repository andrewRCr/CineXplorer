import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiBaseUrl } from "@/config/baseUrls";
import { isRecord } from "@/utilities/typeGuards";
import { initConsoleCapture } from "../consoleCapture";
import { server } from "@tests/mocks/server";

const methods = ["log", "info", "warn", "error", "debug"] as const;
let output: { method: string; args: unknown[] }[];
let written: string[];
let pending: Promise<Response>[];

beforeEach(() => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("MODE", "development");
    Reflect.deleteProperty(window, "__consoleCaptureInitialized");
    output = [];
    written = [];
    pending = [];
    for (const method of methods)
        vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
            output.push({ method, args });
        });
    // Keep real fetch and MSW; await every fire-and-forget write before teardown.
    const send = globalThis.fetch;
    vi.stubGlobal("fetch", (...args: Parameters<typeof fetch>) => {
        const response = send(...args);
        pending.push(response);
        return response;
    });
    server.use(
        http.post(`${apiBaseUrl}/dev-logs/write/`, async ({ request }) => {
            const data: unknown = await request.json();
            if (!isRecord(data) || typeof data.log_line !== "string")
                return new HttpResponse(null, { status: 422 });
            written.push(data.log_line);
            return HttpResponse.json({ status: "ok", file: "frontend.log" });
        }),
    );
});
afterEach(async () => {
    await Promise.allSettled(pending);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Reflect.deleteProperty(window, "__consoleCaptureInitialized");
});

describe("console capture", () => {
    it("preserves console output and forwards each severity", async () => {
        initConsoleCapture();
        for (const method of methods) console[method](`message-${method}`);
        await Promise.all(pending);
        expect(output).toEqual(
            methods.map((method) => ({ method, args: [`message-${method}`] })),
        );
        expect(written).toEqual(
            methods.map((method) =>
                expect.stringMatching(
                    new RegExp(
                        `^\\[.*\\] CONSOLE\\.${method.toUpperCase()}: message-${method}\\n$`,
                    ),
                ),
            ),
        );
    });

    it.each([
        { mode: "test", dev: true },
        { mode: "production", dev: false },
    ])("keeps $mode console output local", async ({ mode, dev }) => {
        vi.stubEnv("MODE", mode);
        vi.stubEnv("DEV", dev);
        initConsoleCapture();
        console.log("local-only");
        await Promise.all(pending);
        expect(output).toEqual([{ method: "log", args: ["local-only"] }]);
        expect(written).toEqual([]);
    });

    it("initializes once and skips the application's own logger output", async () => {
        initConsoleCapture();
        initConsoleCapture();
        console.info("[CineXplorer] already recorded");
        console.log("forward once");
        await Promise.all(pending);
        expect(output).toEqual([
            { method: "info", args: ["[CineXplorer] already recorded"] },
            { method: "log", args: ["forward once"] },
        ]);
        expect(written).toEqual([
            expect.stringContaining("CONSOLE.LOG: forward once"),
        ]);
    });

    it("formats errors, circular objects and primitive values", async () => {
        const circular: { self?: object } = {};
        circular.self = circular;
        const error = new Error("broken");
        error.stack = "trace";
        const args = [
            error,
            circular,
            null,
            undefined,
            7,
            true,
            8n,
            Symbol("tag"),
        ];
        initConsoleCapture();
        console.warn(...args);
        await Promise.all(pending);
        expect(output).toEqual([{ method: "warn", args }]);
        expect(written).toEqual([
            expect.stringContaining(
                'CONSOLE.WARN: Error: broken\ntrace {"self":"[Circular]"} null undefined 7 true 8 Symbol(tag)\n',
            ),
        ]);
    });

    it("bounds forwarded messages while preserving the full local output", async () => {
        const message = "x".repeat(4001);
        initConsoleCapture();
        console.log(message);
        await Promise.all(pending);
        expect(output).toEqual([{ method: "log", args: [message] }]);
        expect(written).toEqual([
            expect.stringContaining(
                `CONSOLE.LOG: ${"x".repeat(4000)}...[truncated]\n`,
            ),
        ]);
    });

    it("preserves console output when the logging endpoint is unavailable", async () => {
        let received = false;
        server.use(
            http.post(`${apiBaseUrl}/dev-logs/write/`, () => {
                received = true;
                return HttpResponse.error();
            }),
        );
        initConsoleCapture();
        console.error("still visible");
        await Promise.allSettled(pending);
        expect(received).toBe(true);
        expect(output).toEqual([{ method: "error", args: ["still visible"] }]);
    });
});
