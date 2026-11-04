import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Logger } from "../logger";

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

    it.each(["localStorage", "sessionStorage", "cookie"] as const)(
        "records the signed-in user's ID from %s",
        (storage) => {
            const token = createToken({ user_id: 42 });
            if (storage === "cookie") {
                document.cookie = `access_token=${encodeURIComponent(token)}; Path=/`;
            } else {
                window[storage].setItem("access_token", token);
            }

            expect(logEntry()).toMatchObject({ user_id: 42 });
        },
    );

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
