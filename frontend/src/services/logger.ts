/**
 * Frontend logging service for CineXplorer.
 *
 * Provides centralized logging with configurable levels and environment-based behavior.
 * Integrates with existing API client for backend error reporting.
 *
 * Environment-based Configuration:
 *
 * DEVELOPMENT:
 *   - Log Level: DEBUG (all messages)
 *   - Console: Enabled with detailed formatting and styling
 *   - Storage: 1000 entries maximum
 *   - Backend Reporting: ERROR+ levels
 *   - Styling: Full color coding and timestamps
 *
 * PRODUCTION:
 *   - Log Level: ERROR (errors and critical messages)
 *   - Console: Disabled for security
 *   - Storage: 50 entries maximum  
 *   - Backend Reporting: ERROR+ levels
 *   - Styling: Simple formatting when console enabled
 *
 * TEST:
 *   - Log Level: WARN (reduce noise in tests)
 *   - Console: Enabled for debugging tests
 *   - Storage: 100 entries maximum
 *   - Backend Reporting: Disabled
 *   - Styling: Minimal formatting
 *
 * STAGING:
 *   - Log Level: ERROR (errors and critical messages)
 *   - Console: Enabled for debugging
 *   - Storage: 50 entries maximum
 *   - Backend Reporting: ERROR+ levels
 *   - Styling: Simplified formatting
 */
import { apiBaseUrl } from "@/config/baseUrls";
import { getAuthTokens } from "@/utilities/tokenUtils";

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4,
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    data?: unknown;
    correlation_id?: string;
    user_agent: string;
    url: string;
    user_id?: string | number;
    session_id: string;
}

export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableStorage: boolean;
    maxStorageEntries: number;
    enableBackendReporting: boolean;
    backendReportingThreshold: LogLevel;
}

type StoredCriticalReport = Omit<
    LogEntry,
    "timestamp" | "user_id" | "level"
> & {
    id: string;
    level: LogLevel.CRITICAL;
    timestamp: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

interface FailedReport {
    id: string;
    entry: LogEntry;
    error: string;
    timestamp: Date;
    retryCount: number;
}

interface UserInteraction {
    type:
        | "click"
        | "navigation"
        | "form_submit"
        | "input_change"
        | "scroll"
        | "resize"
        | "focus"
        | "blur"
        | "key_press"
        | "custom";
    timestamp: Date;
    target?: string; // Element selector or description
    data?: Record<string, unknown>; // Additional context
    url: string;
    session_id: string;
}

class Logger {
    private config: LoggerConfig;
    private sessionId: string;
    private logStorage: LogEntry[] = [];
    private failedReports: FailedReport[] = [];
    private recoveryPromise?: Promise<void>;
    private userInteractions: UserInteraction[] = [];
    private readonly maxInteractions = 50; // Keep last 50 interactions
    private interactionTrackingEnabled = false;
    private interactionListeners: (() => void)[] = [];

    constructor(config?: Partial<LoggerConfig>) {
        // Generate unique session ID for this browser session
        this.sessionId = this.generateSessionId();

        // Enhanced environment detection
        const environment = this.detectEnvironment();
        const isDevelopment = environment === "development";
        const isProduction = environment === "production";
        const isTest = environment === "test";

        // Environment-specific default configurations
        this.config = {
            // Development: Verbose logging for debugging
            level: isDevelopment
                ? LogLevel.DEBUG
                : isTest
                  ? LogLevel.WARN
                  : LogLevel.ERROR,
            enableConsole: !isProduction, // Console disabled in production
            enableStorage: true, // Always enable storage for debugging
            maxStorageEntries: isDevelopment ? 1000 : isTest ? 100 : 50,
            enableBackendReporting: !isTest, // Disable backend reporting in tests
            backendReportingThreshold: isDevelopment
                ? LogLevel.ERROR
                : LogLevel.WARN,
            ...config, // Allow override of defaults
        };

        // Interaction tracking disabled by default (too verbose for console)
        // Can be manually enabled via logger.enableInteractionTracking() if needed
        // if (environment === 'development') {
        //  this.enableInteractionTracking();
        // }

        // Remove legacy sensitive metadata before reports remain in browser storage.
        this.readStoredCriticalReports();

        // Initialize logger with environment context
        this.info("Frontend Logger initialized", {
            environment,
            viteMode: import.meta.env.MODE,
            sessionId: this.sessionId,
            config: this.config,
            interactionTrackingEnabled: this.interactionTrackingEnabled,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log debug information (development only)
     */
    debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * Log general information
     */
    info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * Log warning messages
     */
    warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * Log error messages
     */
    error(message: string, data?: unknown): void {
        this.log(LogLevel.ERROR, message, data);
    }

    /**
     * Log critical errors that require immediate attention
     */
    critical(message: string, data?: unknown): void {
        this.log(LogLevel.CRITICAL, message, data);
    }

    /**
     * Log JavaScript errors with enhanced context
     */
    logError(error: Error, context?: string, additionalData?: unknown): void {
        const errorData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context,
            additionalData,
            // Include recent user interactions for debugging context
            ...(this.interactionTrackingEnabled && {
                recentInteractions: this.getRecentInteractions(3),
            }),
        };

        this.error(
            `JavaScript Error: ${context ? `[${context}] ` : ""}${error.message}`,
            errorData,
        );
    }

    /**
     * Log API errors with request/response context
     */
    logApiError(
        endpoint: string,
        method: string,
        status?: number,
        error?: unknown,
        requestData?: unknown,
    ): void {
        const apiErrorData = {
            endpoint,
            method: method.toUpperCase(),
            status,
            error,
            requestData,
            timestamp: new Date().toISOString(),
        };

        this.error(
            `API Error: ${method.toUpperCase()} ${endpoint}${status ? ` (${status})` : ""}`,
            apiErrorData,
        );
    }

    /**
     * Set correlation ID for request tracking (integrates with backend correlation)
     */
    setCorrelationId(correlation_id: string): void {
        // Store correlation ID for subsequent logs in this context
        this.logStorage.forEach((entry) => {
            if (!entry.correlation_id) {
                entry.correlation_id = correlation_id;
            }
        });
    }

    /**
     * Core logging method
     */
    private log(
        level: LogLevel,
        message: string,
        data?: unknown,
        sendToBackend = true,
    ): void {
        // Check if this log level should be processed
        if (level < this.config.level) {
            return;
        }

        // Create log entry
        const logEntry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            data,
            user_agent:
                typeof navigator !== "undefined"
                    ? navigator.userAgent
                    : "test-environment",
            url:
                typeof window !== "undefined"
                    ? window.location.href
                    : "test-environment",
            user_id: this.getCurrentUserId(),
            session_id: this.sessionId,
        };

        // Console logging
        if (this.config.enableConsole) {
            this.logToConsole(logEntry);
        }

        // Storage logging
        if (this.config.enableStorage) {
            this.logToStorage(logEntry);
        }

        // File logging for development (AI debugging)
        if (this.detectEnvironment() === "development") {
            this.logToFile(logEntry);
        }

        // Backend reporting for critical errors
        if (
            sendToBackend &&
            this.config.enableBackendReporting &&
            level >= this.config.backendReportingThreshold
        ) {
            void this.reportToBackend(logEntry);
        }
    }

    /**
     * Log to browser console with appropriate styling and environment-specific formatting
     */
    private logToConsole(entry: LogEntry): void {
        const environment = this.detectEnvironment();
        const isDevelopment = environment === "development";

        // Different formatting for development vs other environments
        if (isDevelopment) {
            // Detailed formatting for development
            const timestamp = entry.timestamp.toISOString();
            const prefix = `[${timestamp}] [${LogLevel[entry.level]}] [CineXplorer]`;

            switch (entry.level) {
                case LogLevel.DEBUG:
                    console.debug(
                        `%c${prefix}%c ${entry.message}`,
                        "color: #888; font-size: 11px",
                        "color: inherit",
                        entry.data,
                    );
                    break;
                case LogLevel.INFO:
                    console.info(
                        `%c${prefix}%c ${entry.message}`,
                        "color: #0066cc; font-weight: bold",
                        "color: inherit",
                        entry.data,
                    );
                    break;
                case LogLevel.WARN:
                    console.warn(
                        `%c${prefix}%c ${entry.message}`,
                        "color: #ff8800; font-weight: bold",
                        "color: inherit",
                        entry.data,
                    );
                    break;
                case LogLevel.ERROR:
                    console.error(
                        `%c${prefix}%c ${entry.message}`,
                        "color: #cc0000; font-weight: bold",
                        "color: inherit",
                        entry.data,
                    );
                    break;
                case LogLevel.CRITICAL:
                    console.error(
                        `%c${prefix}%c ${entry.message}`,
                        "color: #ffffff; background-color: #cc0000; padding: 2px 4px; font-weight: bold",
                        "color: inherit",
                        entry.data,
                    );
                    break;
            }
        } else {
            // Simplified formatting for non-development environments
            const timestamp = entry.timestamp.toTimeString().split(" ")[0]; // HH:MM:SS format
            const prefix = `[${timestamp}] ${LogLevel[entry.level]}`;

            // Only show important logs in production console (if enabled)
            switch (entry.level) {
                case LogLevel.WARN:
                    console.warn(`${prefix}: ${entry.message}`);
                    break;
                case LogLevel.ERROR:
                    console.error(`${prefix}: ${entry.message}`);
                    break;
                case LogLevel.CRITICAL:
                    console.error(`${prefix}: ${entry.message}`);
                    break;
                // DEBUG and INFO are suppressed in non-development
            }
        }
    }

    /**
     * Store logs in memory for debugging and reporting
     */
    private logToStorage(entry: LogEntry): void {
        this.logStorage.push(entry);

        // Maintain storage size limit
        if (this.logStorage.length > this.config.maxStorageEntries) {
            this.logStorage.shift(); // Remove oldest entry
        }
    }

    /**
     * Write logs to file for AI debugging (development only)
     *
     * Sends formatted log lines to Django endpoint which writes to backend/logs/frontend.log.
     * This allows AI assistants to read browser console logs without manual copy/paste.
     */
    private logToFile(entry: LogEntry): void {
        // Format log entry for file output
        const timestamp = entry.timestamp.toISOString();
        const level = LogLevel[entry.level];
        const message = entry.message;

        // Include data if present (formatted for readability)
        let dataStr = "";
        if (entry.data) {
            try {
                const jsonData = JSON.stringify(entry.data, null, 2);
                // Indent each line of the JSON for nice formatting
                const indentedData = jsonData
                    .split("\n")
                    .map((line) => "  " + line)
                    .join("\n");
                dataStr = `\n  Data:\n${indentedData}`;
            } catch {
                dataStr = `\n  Data: [Could not serialize]`;
            }
        }

        const logLine = `[${timestamp}] ${level}: ${message}${dataStr}\n`;

        // Send to Django backend endpoint (fire-and-forget)
        // Use configured API base URL to route through proxy (avoid CORS issues)
        fetch(`${apiBaseUrl}/dev-logs/write/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ log_line: logLine }),
        }).catch(() => {
            // Silent fail if endpoint not available
            // Don't pollute console with file logging errors
        });
    }

    /**
     * Send critical logs to backend for centralized monitoring with enhanced error handling
     */
    private async reportToBackend(entry: LogEntry): Promise<boolean> {
        try {
            await this.sendReport(entry);
        } catch (error) {
            this.handleBackendReportingError(error, entry);
            return false;
        }
        await this.recoverStoredCriticalReports();
        return true;
    }

    /** Send one report without enqueueing failures or starting another recovery. */
    private async sendReport(entry: LogEntry): Promise<void> {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            await Promise.race([
                this.postReport(entry, controller.signal),
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => {
                        controller.abort();
                        reject(new Error("Backend logging timeout"));
                    }, 5000);
                }),
            ]);
        } finally {
            if (timer !== undefined) clearTimeout(timer);
        }
    }

    private async postReport(
        entry: LogEntry,
        signal: AbortSignal,
    ): Promise<void> {
        const { default: apiClient } = await import("./apiClient");
        const payload = {
            level: LogLevel[entry.level],
            message: entry.message,
            timestamp: entry.timestamp.toISOString(),
            data: this.sanitizeDataForBackend(entry.data),
            correlation_id: entry.correlation_id,
            user_agent: entry.user_agent,
            url: entry.url,
            user_id: entry.user_id,
            session_id: entry.session_id,
            source: "frontend",
            environment: this.detectEnvironment(),
            browser_info: this.getBrowserInfo(),
        };
        await apiClient.post("/logs/", payload, {
            skipAuthRefresh: true,
            signal,
            timeout: 5000,
        });
    }

    private recoverStoredCriticalReports(): Promise<void> {
        if (!this.recoveryPromise) {
            this.recoveryPromise = this.replayStoredCriticalReports().finally(
                () => {
                    this.recoveryPromise = undefined;
                },
            );
        }
        return this.recoveryPromise;
    }

    private async replayStoredCriticalReports(): Promise<void> {
        const snapshot = this.readStoredCriticalReports();
        if (snapshot === null) return;
        for (const report of snapshot) {
            try {
                await this.sendReport({
                    ...report,
                    timestamp: new Date(report.timestamp),
                });
            } catch {
                // Leave this and later reports for the next successful trigger.
                break;
            }
            this.acknowledgeReport(report.id);
        }
    }

    private acknowledgeReport(id: string): void {
        this.failedReports = this.failedReports.filter(
            (report) => report.id !== id,
        );
        const reports = this.readStoredCriticalReports();
        if (reports === null) return;
        this.writeStoredCriticalReports(
            reports.filter((report) => report.id !== id),
        );
    }

    /**
     * Handle backend reporting errors with fallback strategies
     */
    private handleBackendReportingError(error: unknown, entry: LogEntry): void {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        const id = crypto.randomUUID();
        // Use the same identity in memory and persistent recovery.
        this.storeFailedBackendReport(entry, errorMessage, id);

        // Log to console in development, suppress in production
        if (this.detectEnvironment() === "development") {
            console.warn("Failed to report log to backend:", {
                error: errorMessage,
                originalLog: {
                    level: LogLevel[entry.level],
                    message: entry.message,
                    timestamp: entry.timestamp,
                },
            });
        }

        if (entry.level === LogLevel.CRITICAL) {
            const reports = this.readStoredCriticalReports();
            if (reports === null) return;
            reports.push({
                id,
                level: LogLevel.CRITICAL,
                message: entry.message,
                timestamp: entry.timestamp.toISOString(),
                data: this.sanitizeDataForBackend(entry.data),
                correlation_id: entry.correlation_id,
                user_agent: entry.user_agent,
                url: this.sanitizeStoredUrl(entry.url),
                session_id: entry.session_id,
            });
            this.writeStoredCriticalReports(reports);
        }
    }

    /**
     * Store failed backend reports for potential retry
     */
    private storeFailedBackendReport(
        entry: LogEntry,
        error: string,
        id: string,
    ): void {
        if (!this.failedReports) {
            this.failedReports = [];
        }

        this.failedReports.push({
            id,
            entry,
            error,
            timestamp: new Date(),
            retryCount: 0,
        });

        // Limit failed reports storage
        if (this.failedReports.length > 50) {
            this.failedReports.shift();
        }
    }

    /**
     * Get stored logs for debugging or export
     */
    getLogs(level?: LogLevel): LogEntry[] {
        if (level !== undefined) {
            return this.logStorage.filter((entry) => entry.level >= level);
        }
        return [...this.logStorage];
    }

    /**
     * Clear stored logs
     */
    clearLogs(): void {
        const previousCount = this.logStorage.length;
        this.logStorage = [];
        this.info(`Cleared ${previousCount} log entries from storage`);
    }

    /**
     * Export logs as JSON for debugging
     */
    exportLogs(): string {
        return JSON.stringify(this.logStorage, null, 2);
    }

    /**
     * Manually report a critical error to backend (public method)
     */
    async reportCriticalError(
        message: string,
        errorData?: unknown,
        context?: string,
    ): Promise<boolean> {
        try {
            // Enhance error data with user interactions for debugging context
            const enhancedErrorData = {
                ...(errorData && typeof errorData === "object"
                    ? errorData
                    : { originalData: errorData }),
                // Add recent user interactions if tracking is enabled
                ...(this.interactionTrackingEnabled && {
                    recentInteractions: this.getRecentInteractions(5),
                }),
            };

            // Create a critical log entry
            const logEntry: LogEntry = {
                level: LogLevel.CRITICAL,
                message: context ? `[${context}] ${message}` : message,
                timestamp: new Date(),
                data: enhancedErrorData,
                user_agent:
                    typeof navigator !== "undefined"
                        ? navigator.userAgent
                        : "test-environment",
                url:
                    typeof window !== "undefined"
                        ? window.location.href
                        : "test-environment",
                user_id: this.getCurrentUserId(),
                session_id: this.sessionId,
            };

            // Report to backend immediately
            const reported = await this.reportToBackend(logEntry);

            // Store locally without sending the same incident a second time.
            this.log(LogLevel.CRITICAL, message, enhancedErrorData, false);

            return reported;
        } catch (error) {
            this.error("Failed to report critical error manually", {
                originalMessage: message,
                errorData,
                reportError: error,
            });
            return false;
        }
    }

    /**
     * Retry failed backend reports
     */
    async retryFailedReports(): Promise<{ success: number; failed: number }> {
        if (!this.failedReports || this.failedReports.length === 0) {
            return { success: 0, failed: 0 };
        }

        let successCount = 0;
        let failedCount = 0;
        const snapshot = [...this.failedReports];
        for (const failedReport of snapshot) {
            if (
                !this.failedReports.some(
                    (report) => report.id === failedReport.id,
                )
            )
                continue;
            if (failedReport.retryCount >= 3) {
                this.failedReports = this.failedReports.filter(
                    (report) => report.id !== failedReport.id,
                );
                failedCount++;
                continue;
            }
            try {
                await this.sendReport(failedReport.entry);
                this.acknowledgeReport(failedReport.id);
                successCount++;
            } catch {
                failedReport.retryCount++;
                failedCount++;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (successCount > 0) await this.recoverStoredCriticalReports();

        if (successCount > 0 || failedCount > 0) {
            this.info("Retry failed backend reports completed", {
                success: successCount,
                failed: failedCount,
                remaining: this.failedReports.length,
            });
        }

        return { success: successCount, failed: failedCount };
    }

    /**
     * Get failed backend reports for inspection
     */
    getFailedReports(): FailedReport[] {
        return [...this.failedReports];
    }

    /**
     * Get critical logs stored in localStorage (fallback storage)
     */
    getCriticalLogsFromStorage(): unknown[] {
        return this.readStoredCriticalReports() ?? [];
    }

    private sanitizeStoredUrl(value: string): string {
        try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:"
                ? `${url.origin}${url.pathname}`
                : "unknown";
        } catch {
            return "unknown";
        }
    }

    /** null means unreadable storage, so callers must preserve the unknown queue. */
    private readStoredCriticalReports(): StoredCriticalReport[] | null {
        let serialized: string | null;
        try {
            if (typeof localStorage === "undefined") return null;
            serialized = localStorage.getItem("cinexplorer_critical_logs");
        } catch {
            return null;
        }
        if (!serialized) return [];
        try {
            const parsed: unknown = JSON.parse(serialized);
            const reports: StoredCriticalReport[] = [];
            if (Array.isArray(parsed)) {
                for (const value of parsed.slice(-10)) {
                    if (
                        !isRecord(value) ||
                        value.level !== LogLevel.CRITICAL ||
                        typeof value.message !== "string" ||
                        typeof value.timestamp !== "string" ||
                        !Number.isFinite(Date.parse(value.timestamp)) ||
                        typeof value.user_agent !== "string" ||
                        typeof value.url !== "string" ||
                        typeof value.session_id !== "string"
                    )
                        continue;
                    reports.push({
                        id:
                            typeof value.id === "string" && value.id
                                ? value.id
                                : crypto.randomUUID(),
                        level: LogLevel.CRITICAL,
                        message: value.message,
                        timestamp: new Date(value.timestamp).toISOString(),
                        data: this.removeSensitiveFields(value.data),
                        correlation_id:
                            typeof value.correlation_id === "string"
                                ? value.correlation_id
                                : undefined,
                        user_agent: value.user_agent,
                        url: this.sanitizeStoredUrl(value.url),
                        session_id: value.session_id,
                    });
                }
            }
            this.writeStoredCriticalReports(reports);
            return reports;
        } catch {
            this.writeStoredCriticalReports([]);
            return [];
        }
    }

    private writeStoredCriticalReports(reports: StoredCriticalReport[]): void {
        try {
            if (typeof localStorage === "undefined") return;
            if (reports.length === 0) {
                localStorage.removeItem("cinexplorer_critical_logs");
            } else {
                localStorage.setItem(
                    "cinexplorer_critical_logs",
                    JSON.stringify(reports.slice(-10)),
                );
            }
        } catch {
            // Reporting is best-effort when browser storage is unavailable or full.
        }
    }

    /**
     * Clear critical logs from localStorage
     */
    clearCriticalLogsFromStorage(): void {
        if (typeof localStorage === "undefined") {
            this.warn("localStorage not available (test environment)");
            return;
        }
        try {
            localStorage.removeItem("cinexplorer_critical_logs");
            this.info("Cleared critical logs from localStorage");
        } catch (error) {
            this.warn("Failed to clear critical logs from localStorage", {
                error,
            });
        }
    }

    /**
     * Update logger configuration
     */
    updateConfig(newConfig: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.info("Logger configuration updated", { newConfig: this.config });
    }

    // ============= USER INTERACTION TRACKING =============

    /**
     * Enable user interaction tracking (development mode only)
     */
    public enableInteractionTracking(): void {
        if (typeof window === "undefined" || this.interactionTrackingEnabled) {
            return; // Don't enable in SSR or if already enabled
        }

        this.interactionTrackingEnabled = true;

        // Track clicks with element identification
        const clickListener = (event: Event) => {
            const target = event.target as Element;
            this.trackInteraction("click", {
                target: this.getElementIdentifier(target),
                coordinates:
                    event instanceof MouseEvent
                        ? { x: event.clientX, y: event.clientY }
                        : undefined,
                button: event instanceof MouseEvent ? event.button : undefined,
            });
        };

        // Track form submissions
        const formSubmitListener = (event: Event) => {
            const form = event.target as HTMLFormElement;
            this.trackInteraction("form_submit", {
                target: this.getElementIdentifier(form),
                action: form.action || "none",
                method: form.method || "GET",
            });
        };

        // Track key presses (limited to important keys)
        const keyListener = (event: KeyboardEvent) => {
            // Only track important navigation/action keys
            const importantKeys = ["Enter", "Escape", "Tab", "F5"];
            if (importantKeys.includes(event.key)) {
                this.trackInteraction("key_press", {
                    key: event.key,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    target: this.getElementIdentifier(event.target as Element),
                });
            }
        };

        // Track window resize for debugging responsive issues
        const resizeListener = () => {
            this.trackInteraction("resize", {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
            });
        };

        // Track navigation events
        const navigationListener = () => {
            this.trackInteraction("navigation", {
                url: window.location.href,
                previous:
                    typeof document !== "undefined"
                        ? document.referrer || "direct"
                        : "test-environment",
            });
        };

        // Add event listeners
        document.addEventListener("click", clickListener, true);
        document.addEventListener("submit", formSubmitListener, true);
        document.addEventListener("keydown", keyListener);
        window.addEventListener("resize", resizeListener);
        window.addEventListener("popstate", navigationListener);

        // Store listeners for cleanup
        this.interactionListeners = [
            () => document.removeEventListener("click", clickListener, true),
            () =>
                document.removeEventListener(
                    "submit",
                    formSubmitListener,
                    true,
                ),
            () => document.removeEventListener("keydown", keyListener),
            () => window.removeEventListener("resize", resizeListener),
            () => window.removeEventListener("popstate", navigationListener),
        ];

        this.debug(
            "User interaction tracking enabled for development debugging",
        );
    }

    /**
     * Disable user interaction tracking and clean up listeners
     */
    public disableInteractionTracking(): void {
        if (!this.interactionTrackingEnabled) {
            return;
        }

        // Remove all event listeners
        this.interactionListeners.forEach((cleanup) => cleanup());
        this.interactionListeners = [];

        this.interactionTrackingEnabled = false;
        this.debug("User interaction tracking disabled");
    }

    /**
     * Track a user interaction (internal method)
     */
    private trackInteraction(
        type: UserInteraction["type"],
        data?: Record<string, unknown>,
    ): void {
        if (!this.interactionTrackingEnabled) {
            return;
        }

        const interaction: UserInteraction = {
            type,
            timestamp: new Date(),
            url:
                typeof window !== "undefined"
                    ? window.location.href
                    : "test-environment",
            session_id: this.sessionId,
            ...data,
        };

        // Add to interactions array
        this.userInteractions.push(interaction);

        // Keep only the last N interactions to prevent memory issues
        if (this.userInteractions.length > this.maxInteractions) {
            this.userInteractions.shift();
        }

        // Log at debug level
        this.debug(`User interaction: ${type}`, interaction);
    }

    /**
     * Manually track a custom interaction (public method)
     */
    public trackCustomInteraction(
        description: string,
        data?: Record<string, unknown>,
    ): void {
        this.trackInteraction("custom", {
            target: description,
            ...data,
        });
    }

    /**
     * Get recent user interactions for debugging/error context
     */
    public getRecentInteractions(limit = 10): UserInteraction[] {
        return this.userInteractions.slice(-limit);
    }

    /**
     * Clear interaction history
     */
    public clearInteractionHistory(): void {
        const count = this.userInteractions.length;
        this.userInteractions = [];
        this.debug(`Cleared ${count} interaction history entries`);
    }

    /**
     * Get element identifier for interaction tracking
     */
    private getElementIdentifier(element: Element | null): string {
        if (!element) return "unknown";

        // Try ID first
        if (element.id) {
            return `#${element.id}`;
        }

        // Try data attributes for React components
        const testId = element.getAttribute("data-testid");
        if (testId) {
            return `[data-testid="${testId}"]`;
        }

        // Try role attribute
        const role = element.getAttribute("role");
        if (role) {
            return `[role="${role}"]`;
        }

        // Fallback to tag name + class
        let identifier = element.tagName.toLowerCase();
        if (element.className && typeof element.className === "string") {
            const classes = element.className
                .split(" ")
                .filter((c) => c.trim());
            if (classes.length > 0) {
                identifier += `.${classes[0]}`;
            }
        }

        return identifier;
    }

    /**
     * Detect current environment with fallbacks
     */
    private detectEnvironment():
        "development" | "production" | "test" | "staging" {
        // Primary detection via Vite environment
        const viteMode = import.meta.env.MODE;

        // Check for explicit environment variables
        const nodeEnv = import.meta.env.VITE_NODE_ENV;
        const appEnv = import.meta.env.VITE_APP_ENV;

        // Test environment detection
        if (
            viteMode === "test" ||
            nodeEnv === "test" ||
            (typeof window !== "undefined" &&
                (window as { __VITEST__?: boolean }).__VITEST__)
        ) {
            return "test";
        }

        // Production environment detection
        if (
            viteMode === "production" ||
            nodeEnv === "production" ||
            appEnv === "production" ||
            !import.meta.env.DEV
        ) {
            return "production";
        }

        // Staging environment detection
        if (
            viteMode === "staging" ||
            nodeEnv === "staging" ||
            appEnv === "staging"
        ) {
            return "staging";
        }

        // Default to development
        return "development";
    }

    /**
     * Get current environment information
     */
    getEnvironmentInfo(): {
        environment: string;
        viteMode: string;
        isProduction: boolean;
        isDevelopment: boolean;
        config: LoggerConfig;
    } {
        const environment = this.detectEnvironment();
        return {
            environment,
            viteMode: import.meta.env.MODE,
            isProduction: environment === "production",
            isDevelopment: environment === "development",
            config: { ...this.config },
        };
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitize data for backend transmission (remove sensitive info, limit size)
     */
    private sanitizeDataForBackend(data: unknown): unknown {
        if (!data) return data;

        try {
            // Convert to string to check size and sanitize
            let sanitized: unknown = JSON.parse(JSON.stringify(data));

            // Remove sensitive fields recursively
            sanitized = this.removeSensitiveFields(sanitized);

            // Limit size to prevent large payloads
            const serialized = JSON.stringify(sanitized);
            if (serialized.length > 10000) {
                return {
                    _truncated: true,
                    _originalSize: serialized.length,
                    data: serialized.substring(0, 10000) + "...[truncated]",
                };
            }

            return sanitized;
        } catch {
            // If sanitization fails, return safe fallback
            return {
                _sanitizationError: true,
                _originalType: typeof data,
                message: "Data could not be sanitized for backend transmission",
            };
        }
    }

    /**
     * Remove sensitive fields from object recursively
     */
    private removeSensitiveFields(obj: unknown): unknown {
        if (!obj || typeof obj !== "object") return obj;

        const sensitiveFields = [
            "password",
            "token",
            "api_key",
            "secret",
            "auth",
            "authorization",
            "csrf",
            "cookie",
            "session",
            "key",
            "private",
            "credential",
        ];

        if (Array.isArray(obj)) {
            return obj.map((item) => this.removeSensitiveFields(item));
        }

        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.some((field) => lowerKey.includes(field))) {
                cleaned[key] = "[FILTERED]";
            } else {
                cleaned[key] = this.removeSensitiveFields(value);
            }
        }

        return cleaned;
    }

    /**
     * Get browser information for backend reporting
     */
    private getBrowserInfo(): {
        user_agent: string;
        language: string;
        platform: string;
        viewport: { width: number; height: number };
        timezone: string;
    } {
        return {
            user_agent:
                typeof navigator !== "undefined"
                    ? navigator.userAgent
                    : "test-environment",
            language:
                typeof navigator !== "undefined" ? navigator.language : "en-US",
            platform:
                typeof navigator !== "undefined"
                    ? navigator.platform
                    : "test-environment",
            viewport: {
                width: typeof window !== "undefined" ? window.innerWidth : 1920,
                height:
                    typeof window !== "undefined" ? window.innerHeight : 1080,
            },
            timezone: "UTC",
        };
    }

    /**
     * Get current user ID from authentication context
     */
    private getCurrentUserId(): string | number | undefined {
        try {
            const { access_token } = getAuthTokens();
            if (!access_token) return undefined;

            // Decode identity for log context only; this does not verify the token.
            const parts = access_token.split(".");
            const encodedPayload = parts[1];
            if (parts.length !== 3 || !encodedPayload) return undefined;

            const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
            const bytes = Uint8Array.from(atob(base64), (char) =>
                char.charCodeAt(0),
            );
            const payload: unknown = JSON.parse(
                new TextDecoder().decode(bytes),
            );
            if (typeof payload !== "object" || payload === null)
                return undefined;

            const userId = "user_id" in payload ? payload.user_id : undefined;
            const subject = "sub" in payload ? payload.sub : undefined;
            for (const id of [userId, subject]) {
                if (
                    (typeof id === "string" && id.length > 0) ||
                    (typeof id === "number" && Number.isFinite(id))
                ) {
                    return id;
                }
            }
        } catch {
            // Silently fail if unable to get user ID
        }
        return undefined;
    }
}

// Create singleton instance
const logger = new Logger();

export default logger;
export { Logger };
