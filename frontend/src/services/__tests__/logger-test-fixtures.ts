import { HttpResponse } from "msw/http";
import { Logger, LogLevel } from "@/services/logger";

export const clearTokens = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "access_token=; Max-Age=0; Path=/";
};

export const legacyReport = (message: string) => ({
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

export const reportingLogger = () =>
    new Logger({
        enableConsole: false,
        enableBackendReporting: true,
    });

export const succeeded = () =>
    HttpResponse.json(
        { success: true, message: "Log entry received" },
        { status: 201 },
    );

export const messageOf = (value: unknown) =>
    value !== null && typeof value === "object" && "message" in value
        ? value.message
        : undefined;
