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
 *   - Log Level: ERROR (critical messages only)
 *   - Console: Disabled for security
 *   - Storage: 50 entries maximum  
 *   - Backend Reporting: WARN+ levels
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
 *   - Log Level: WARN (moderate verbosity)
 *   - Console: Enabled for debugging
 *   - Storage: 100 entries maximum
 *   - Backend Reporting: WARN+ levels
 *   - Styling: Simplified formatting
 */

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
	correlationId?: string;
	userAgent: string;
	url: string;
	userId?: string | number;
	sessionId: string;
}

export interface LoggerConfig {
	level: LogLevel;
	enableConsole: boolean;
	enableStorage: boolean;
	maxStorageEntries: number;
	enableBackendReporting: boolean;
	backendReportingThreshold: LogLevel;
}

interface FailedReport {
	entry: LogEntry;
	error: string;
	timestamp: Date;
	retryCount: number;
}

interface UserInteraction {
	type: 'click' | 'navigation' | 'form_submit' | 'input_change' | 'scroll' | 'resize' | 'focus' | 'blur' | 'key_press' | 'custom';
	timestamp: Date;
	target?: string; // Element selector or description
	data?: Record<string, unknown>; // Additional context
	url: string;
	sessionId: string;
}

class Logger {
	private config: LoggerConfig;
	private sessionId: string;
	private logStorage: LogEntry[] = [];
	private failedReports: FailedReport[] = [];
	private userInteractions: UserInteraction[] = [];
	private readonly maxInteractions = 50; // Keep last 50 interactions
	private interactionTrackingEnabled = false;
	private interactionListeners: (() => void)[] = [];

	constructor(config?: Partial<LoggerConfig>) {
		// Generate unique session ID for this browser session
		this.sessionId = this.generateSessionId();

		// Enhanced environment detection
		const environment = this.detectEnvironment();
		const isDevelopment = environment === 'development';
		const isProduction = environment === 'production';
		const isTest = environment === 'test';
		
		// Environment-specific default configurations
		this.config = {
			// Development: Verbose logging for debugging
			level: isDevelopment ? LogLevel.DEBUG : isTest ? LogLevel.WARN : LogLevel.ERROR,
			enableConsole: !isProduction, // Console disabled in production
			enableStorage: true, // Always enable storage for debugging
			maxStorageEntries: isDevelopment ? 1000 : isTest ? 100 : 50,
			enableBackendReporting: !isTest, // Disable backend reporting in tests
			backendReportingThreshold: isDevelopment ? LogLevel.ERROR : LogLevel.WARN,
			...config, // Allow override of defaults
		};

		// Enable interaction tracking in development mode
		if (environment === 'development') {
			this.enableInteractionTracking();
		}

		// Initialize logger with environment context
		this.info('Frontend Logger initialized', {
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
				recentInteractions: this.getRecentInteractions(3)
			})
		};

		this.error(`JavaScript Error: ${context ? `[${context}] ` : ''}${error.message}`, errorData);
	}

	/**
	 * Log API errors with request/response context
	 */
	logApiError(
		endpoint: string,
		method: string,
		status?: number,
		error?: unknown,
		requestData?: unknown
	): void {
		const apiErrorData = {
			endpoint,
			method: method.toUpperCase(),
			status,
			error,
			requestData,
			timestamp: new Date().toISOString(),
		};

		this.error(`API Error: ${method.toUpperCase()} ${endpoint}${status ? ` (${status})` : ''}`, apiErrorData);
	}

	/**
	 * Set correlation ID for request tracking (integrates with backend correlation)
	 */
	setCorrelationId(correlationId: string): void {
		// Store correlation ID for subsequent logs in this context
		this.logStorage.forEach(entry => {
			if (!entry.correlationId) {
				entry.correlationId = correlationId;
			}
		});
	}

	/**
	 * Core logging method
	 */
	private log(level: LogLevel, message: string, data?: unknown): void {
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
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'test-environment',
			url: typeof window !== 'undefined' ? window.location.href : 'test-environment',
			userId: this.getCurrentUserId(),
			sessionId: this.sessionId,
		};

		// Console logging
		if (this.config.enableConsole) {
			this.logToConsole(logEntry);
		}

		// Storage logging
		if (this.config.enableStorage) {
			this.logToStorage(logEntry);
		}

		// Backend reporting for critical errors
		if (this.config.enableBackendReporting && level >= this.config.backendReportingThreshold) {
			this.reportToBackend(logEntry);
		}
	}

	/**
	 * Log to browser console with appropriate styling and environment-specific formatting
	 */
	private logToConsole(entry: LogEntry): void {
		const environment = this.detectEnvironment();
		const isDevelopment = environment === 'development';
		
		// Different formatting for development vs other environments
		if (isDevelopment) {
			// Detailed formatting for development
			const timestamp = entry.timestamp.toISOString();
			const prefix = `[${timestamp}] [${LogLevel[entry.level]}] [CineXplorer]`;
			
			switch (entry.level) {
				case LogLevel.DEBUG:
					console.debug(`%c${prefix}%c ${entry.message}`, 'color: #888; font-size: 11px', 'color: inherit', entry.data);
					break;
				case LogLevel.INFO:
					console.info(`%c${prefix}%c ${entry.message}`, 'color: #0066cc; font-weight: bold', 'color: inherit', entry.data);
					break;
				case LogLevel.WARN:
					console.warn(`%c${prefix}%c ${entry.message}`, 'color: #ff8800; font-weight: bold', 'color: inherit', entry.data);
					break;
				case LogLevel.ERROR:
					console.error(`%c${prefix}%c ${entry.message}`, 'color: #cc0000; font-weight: bold', 'color: inherit', entry.data);
					break;
				case LogLevel.CRITICAL:
					console.error(`%c${prefix}%c ${entry.message}`, 'color: #ffffff; background-color: #cc0000; padding: 2px 4px; font-weight: bold', 'color: inherit', entry.data);
					break;
			}
		} else {
			// Simplified formatting for non-development environments
			const timestamp = entry.timestamp.toTimeString().split(' ')[0]; // HH:MM:SS format
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
	 * Send critical logs to backend for centralized monitoring with enhanced error handling
	 */
	private async reportToBackend(entry: LogEntry): Promise<void> {
		try {
			// Import API client dynamically to avoid circular dependencies
			const { default: apiClient } = await import('./apiClient');

			// Prepare sanitized payload for backend
			const payload = {
				level: LogLevel[entry.level],
				message: entry.message,
				timestamp: entry.timestamp.toISOString(),
				data: this.sanitizeDataForBackend(entry.data),
				correlationId: entry.correlationId,
				userAgent: entry.userAgent,
				url: entry.url,
				userId: entry.userId,
				sessionId: entry.sessionId,
				source: 'frontend',
				environment: this.detectEnvironment(),
				browserInfo: this.getBrowserInfo(),
			};

			// Send to backend with timeout
			const response = await Promise.race([
				apiClient.post('/logs/', payload),
				new Promise((_, reject) => 
					setTimeout(() => reject(new Error('Backend logging timeout')), 5000)
				)
			]);

			// Log successful backend reporting in development
			if (this.detectEnvironment() === 'development') {
				console.debug('Successfully reported log to backend:', {
					level: LogLevel[entry.level],
					message: entry.message,
					response: response
				});
			}

		} catch (error) {
			// Enhanced error handling for backend reporting failures
			this.handleBackendReportingError(error, entry);
		}
	}

	/**
	 * Handle backend reporting errors with fallback strategies
	 */
	private handleBackendReportingError(error: unknown, entry: LogEntry): void {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		
		// Store failed reports for potential retry
		this.storeFailedBackendReport(entry, errorMessage);
		
		// Log to console in development, suppress in production
		if (this.detectEnvironment() === 'development') {
			console.warn('Failed to report log to backend:', {
				error: errorMessage,
				originalLog: {
					level: LogLevel[entry.level],
					message: entry.message,
					timestamp: entry.timestamp
				}
			});
		}
		
		// For critical errors, also store in localStorage as last resort (browser only)
		if (entry.level === LogLevel.CRITICAL && typeof localStorage !== 'undefined') {
			try {
				const criticalLogs = JSON.parse(localStorage.getItem('cinexplorer_critical_logs') || '[]');
				criticalLogs.push({
					...entry,
					timestamp: entry.timestamp.toISOString(),
					backendReportFailed: true,
					backendError: errorMessage
				});
				
				// Keep only last 10 critical logs in localStorage
				if (criticalLogs.length > 10) {
					criticalLogs.shift();
				}
				
				localStorage.setItem('cinexplorer_critical_logs', JSON.stringify(criticalLogs));
			} catch (storageError) {
				// If localStorage also fails, there's nothing more we can do
				console.error('Failed to store critical log in localStorage:', storageError);
			}
		}
	}

	/**
	 * Store failed backend reports for potential retry
	 */
	private storeFailedBackendReport(entry: LogEntry, error: string): void {
		if (!this.failedReports) {
			this.failedReports = [];
		}
		
		this.failedReports.push({
			entry,
			error,
			timestamp: new Date(),
			retryCount: 0
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
			return this.logStorage.filter(entry => entry.level >= level);
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
		context?: string
	): Promise<boolean> {
		try {
			// Enhance error data with user interactions for debugging context
			const enhancedErrorData = {
				...(errorData && typeof errorData === 'object' ? errorData : { originalData: errorData }),
				// Add recent user interactions if tracking is enabled
				...(this.interactionTrackingEnabled && {
					recentInteractions: this.getRecentInteractions(5)
				})
			};

			// Create a critical log entry
			const logEntry: LogEntry = {
				level: LogLevel.CRITICAL,
				message: context ? `[${context}] ${message}` : message,
				timestamp: new Date(),
				data: enhancedErrorData,
				userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'test-environment',
				url: typeof window !== 'undefined' ? window.location.href : 'test-environment',
				userId: this.getCurrentUserId(),
				sessionId: this.sessionId,
			};
			
			// Report to backend immediately
			await this.reportToBackend(logEntry);
			
			// Also log locally
			this.critical(message, enhancedErrorData);
			
			return true;
		} catch (error) {
			this.error('Failed to report critical error manually', {
				originalMessage: message,
				errorData,
				reportError: error
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
		const remainingReports: FailedReport[] = [];
		
		for (const failedReport of this.failedReports) {
			// Skip reports that have been retried too many times
			if (failedReport.retryCount >= 3) {
				failedCount++;
				continue;
			}
			
			try {
				await this.reportToBackend(failedReport.entry);
				successCount++;
			} catch {
				failedReport.retryCount++;
				remainingReports.push(failedReport);
				failedCount++;
			}
			
			// Small delay between retries
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		// Update failed reports list
		this.failedReports = remainingReports;
		
		if (successCount > 0 || failedCount > 0) {
			this.info('Retry failed backend reports completed', {
				success: successCount,
				failed: failedCount,
				remaining: remainingReports.length
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
		if (typeof localStorage === 'undefined') {
			return [];
		}
		try {
			return JSON.parse(localStorage.getItem('cinexplorer_critical_logs') || '[]');
		} catch {
			return [];
		}
	}
	
	/**
	 * Clear critical logs from localStorage
	 */
	clearCriticalLogsFromStorage(): void {
		if (typeof localStorage === 'undefined') {
			this.warn('localStorage not available (test environment)');
			return;
		}
		try {
			localStorage.removeItem('cinexplorer_critical_logs');
			this.info('Cleared critical logs from localStorage');
		} catch (error) {
			this.warn('Failed to clear critical logs from localStorage', { error });
		}
	}
	
	/**
	 * Update logger configuration
	 */
	updateConfig(newConfig: Partial<LoggerConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.info('Logger configuration updated', { newConfig: this.config });
	}

	// ============= USER INTERACTION TRACKING =============

	/**
	 * Enable user interaction tracking (development mode only)
	 */
	private enableInteractionTracking(): void {
		if (typeof window === 'undefined' || this.interactionTrackingEnabled) {
			return; // Don't enable in SSR or if already enabled
		}

		this.interactionTrackingEnabled = true;

		// Track clicks with element identification
		const clickListener = (event: Event) => {
			const target = event.target as Element;
			this.trackInteraction('click', {
				target: this.getElementIdentifier(target),
				coordinates: event instanceof MouseEvent ? 
					{ x: event.clientX, y: event.clientY } : undefined,
				button: event instanceof MouseEvent ? event.button : undefined,
			});
		};

		// Track form submissions
		const formSubmitListener = (event: Event) => {
			const form = event.target as HTMLFormElement;
			this.trackInteraction('form_submit', {
				target: this.getElementIdentifier(form),
				action: form.action || 'none',
				method: form.method || 'GET',
			});
		};

		// Track key presses (limited to important keys)
		const keyListener = (event: KeyboardEvent) => {
			// Only track important navigation/action keys
			const importantKeys = ['Enter', 'Escape', 'Tab', 'F5'];
			if (importantKeys.includes(event.key)) {
				this.trackInteraction('key_press', {
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
			this.trackInteraction('resize', {
				viewport: {
					width: window.innerWidth,
					height: window.innerHeight,
				},
			});
		};

		// Track navigation events
		const navigationListener = () => {
			this.trackInteraction('navigation', {
				url: window.location.href,
				previous: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'test-environment',
			});
		};

		// Add event listeners
		document.addEventListener('click', clickListener, true);
		document.addEventListener('submit', formSubmitListener, true);
		document.addEventListener('keydown', keyListener);
		window.addEventListener('resize', resizeListener);
		window.addEventListener('popstate', navigationListener);

		// Store listeners for cleanup
		this.interactionListeners = [
			() => document.removeEventListener('click', clickListener, true),
			() => document.removeEventListener('submit', formSubmitListener, true),
			() => document.removeEventListener('keydown', keyListener),
			() => window.removeEventListener('resize', resizeListener),
			() => window.removeEventListener('popstate', navigationListener),
		];

		this.debug('User interaction tracking enabled for development debugging');
	}

	/**
	 * Disable user interaction tracking and clean up listeners
	 */
	public disableInteractionTracking(): void {
		if (!this.interactionTrackingEnabled) {
			return;
		}

		// Remove all event listeners
		this.interactionListeners.forEach(cleanup => cleanup());
		this.interactionListeners = [];

		this.interactionTrackingEnabled = false;
		this.debug('User interaction tracking disabled');
	}

	/**
	 * Track a user interaction (internal method)
	 */
	private trackInteraction(
		type: UserInteraction['type'], 
		data?: Record<string, unknown>
	): void {
		if (!this.interactionTrackingEnabled) {
			return;
		}

		const interaction: UserInteraction = {
			type,
			timestamp: new Date(),
			url: typeof window !== 'undefined' ? window.location.href : 'test-environment',
			sessionId: this.sessionId,
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
	public trackCustomInteraction(description: string, data?: Record<string, unknown>): void {
		this.trackInteraction('custom', {
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
		if (!element) return 'unknown';

		// Try ID first
		if (element.id) {
			return `#${element.id}`;
		}

		// Try data attributes for React components
		const testId = element.getAttribute('data-testid');
		if (testId) {
			return `[data-testid="${testId}"]`;
		}

		// Try role attribute
		const role = element.getAttribute('role');
		if (role) {
			return `[role="${role}"]`;
		}

		// Fallback to tag name + class
		let identifier = element.tagName.toLowerCase();
		if (element.className && typeof element.className === 'string') {
			const classes = element.className.split(' ').filter(c => c.trim());
			if (classes.length > 0) {
				identifier += `.${classes[0]}`;
			}
		}

		return identifier;
	}

	/**
	 * Detect current environment with fallbacks
	 */
	private detectEnvironment(): 'development' | 'production' | 'test' | 'staging' {
		// Primary detection via Vite environment
		const viteMode = import.meta.env.MODE;
		
		// Check for explicit environment variables
		const nodeEnv = import.meta.env.VITE_NODE_ENV;
		const appEnv = import.meta.env.VITE_APP_ENV;
		
		// Test environment detection
		if (viteMode === 'test' || nodeEnv === 'test' || 
			typeof window !== 'undefined' && (window as { __VITEST__?: boolean }).__VITEST__) {
			return 'test';
		}
		
		// Production environment detection
		if (viteMode === 'production' || nodeEnv === 'production' || 
			appEnv === 'production' || !import.meta.env.DEV) {
			return 'production';
		}
		
		// Staging environment detection
		if (viteMode === 'staging' || nodeEnv === 'staging' || 
			appEnv === 'staging') {
			return 'staging';
		}
		
		// Default to development
		return 'development';
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
			isProduction: environment === 'production',
			isDevelopment: environment === 'development',
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
			let sanitized = JSON.parse(JSON.stringify(data));
			
			// Remove sensitive fields recursively
			sanitized = this.removeSensitiveFields(sanitized);
			
			// Limit size to prevent large payloads
			const serialized = JSON.stringify(sanitized);
			if (serialized.length > 10000) {
				return {
					_truncated: true,
					_originalSize: serialized.length,
					data: serialized.substring(0, 10000) + '...[truncated]'
				};
			}
			
			return sanitized;
		} catch {
			// If sanitization fails, return safe fallback
			return {
				_sanitizationError: true,
				_originalType: typeof data,
				message: 'Data could not be sanitized for backend transmission'
			};
		}
	}
	
	/**
	 * Remove sensitive fields from object recursively
	 */
	private removeSensitiveFields(obj: unknown): unknown {
		if (!obj || typeof obj !== 'object') return obj;
		
		const sensitiveFields = [
			'password', 'token', 'api_key', 'secret', 'auth', 'authorization',
			'csrf', 'cookie', 'session', 'key', 'private', 'credential'
		];
		
		if (Array.isArray(obj)) {
			return obj.map(item => this.removeSensitiveFields(item));
		}
		
		const cleaned: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const lowerKey = key.toLowerCase();
			if (sensitiveFields.some(field => lowerKey.includes(field))) {
				cleaned[key] = '[FILTERED]';
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
		userAgent: string;
		language: string;
		platform: string;
		viewport: { width: number; height: number };
		timezone: string;
	} {
		return {
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'test-environment',
			language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
			platform: typeof navigator !== 'undefined' ? navigator.platform : 'test-environment',
			viewport: {
				width: typeof window !== 'undefined' ? window.innerWidth : 1920,
				height: typeof window !== 'undefined' ? window.innerHeight : 1080
			},
			timezone: 'UTC'
		};
	}
	
	/**
	 * Get current user ID from authentication context
	 */
	private getCurrentUserId(): string | number | undefined {
		try {
			// Use module path to avoid require() linting error
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { getAuthTokens } = require('@/utilities/token');
			const { authToken } = getAuthTokens();
			if (authToken) {
				// Decode JWT payload to get user ID (basic decode, not verification)
				const payload = JSON.parse(atob(authToken.split('.')[1]));
				return payload.user_id || payload.sub;
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