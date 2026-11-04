import { apiBaseUrl } from "@/config/baseUrls";

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"] as const;
const MAX_MESSAGE_LENGTH = 4000;

type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

const shouldEnableCapture = (): boolean => {
    if (typeof window === "undefined") {
        return false;
    }

    if (!import.meta.env.DEV) {
        return false;
    }

    return import.meta.env.MODE !== "test";
};

const formatError = (error: Error): string => {
    if (error.stack) {
        return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return `${error.name}: ${error.message}`;
};

const safeStringify = (value: unknown): string => {
    const seen = new WeakSet<object>();

    return JSON.stringify(value, (_key, val) => {
        if (typeof val === "object" && val !== null) {
            if (seen.has(val as object)) {
                return "[Circular]";
            }
            seen.add(val as object);
        }
        return val;
    });
};

const formatArg = (arg: unknown): string => {
    if (typeof arg === "string") {
        return arg;
    }

    if (arg instanceof Error) {
        return formatError(arg);
    }

    if (
        typeof arg === "number" ||
        typeof arg === "boolean" ||
        typeof arg === "bigint"
    ) {
        return String(arg);
    }

    if (typeof arg === "symbol") {
        return arg.toString();
    }

    if (typeof arg === "function") {
        return `[Function ${arg.name || "anonymous"}]`;
    }

    if (arg === null) {
        return "null";
    }

    if (typeof arg === "undefined") {
        return "undefined";
    }

    try {
        return safeStringify(arg);
    } catch {
        return "[Unserializable]";
    }
};

const truncate = (value: string): string => {
    if (value.length <= MAX_MESSAGE_LENGTH) {
        return value;
    }

    return `${value.slice(0, MAX_MESSAGE_LENGTH)}...[truncated]`;
};

const shouldSkipCapture = (args: unknown[]): boolean => {
    const firstArg = args[0];

    if (typeof firstArg !== "string") {
        return false;
    }

    return firstArg.includes("[CineXplorer]");
};

const sendConsoleLog = (level: ConsoleMethod, args: unknown[]): void => {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(formatArg).join(" ");
    const logLine = `[${timestamp}] CONSOLE.${level.toUpperCase()}: ${truncate(formattedArgs)}\n`;

    void fetch(`${apiBaseUrl}/dev-logs/write/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ log_line: logLine }),
    }).catch(() => {});
};

export const initConsoleCapture = (): void => {
    if (!shouldEnableCapture()) {
        return;
    }

    const globalWindow = window as Window & {
        __consoleCaptureInitialized?: boolean;
    };

    if (globalWindow.__consoleCaptureInitialized) {
        return;
    }

    globalWindow.__consoleCaptureInitialized = true;

    CONSOLE_METHODS.forEach((method) => {
        const original = console[method].bind(console);

        console[method] = (...args: unknown[]) => {
            original(...args);

            if (shouldSkipCapture(args)) {
                return;
            }

            sendConsoleLog(method, args);
        };
    });
};
