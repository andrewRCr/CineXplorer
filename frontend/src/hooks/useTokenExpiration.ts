/**
 * useTokenExpiration
 *
 * Custom hook for tracking JWT token expiration and providing user warnings.
 *
 * Features:
 * - Tracks time remaining until token expires
 * - Provides warning state when token is about to expire (configurable threshold)
 * - Auto-refreshes token when user is active and token near expiration
 * - Detects user activity (mouse movement, keyboard, clicks) to avoid refreshing during idle
 *
 * Usage:
 * ```tsx
 * const { timeRemaining, isExpiringSoon, refreshToken } = useTokenExpiration();
 *
 * {isExpiringSoon && (
 *   <Alert>Your session will expire in {Math.floor(timeRemaining / 60)} minutes</Alert>
 * )}
 * ```
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthTokens, getTokenExpiration } from "@/utilities/token";
import apiClient from "@/services/apiClient";

interface UseTokenExpirationOptions {
	/** Threshold in milliseconds before expiration to show warning (default: 2 minutes) */
	warningThreshold?: number;
	/** Threshold in milliseconds before expiration to auto-refresh (default: 1 minute) */
	refreshThreshold?: number;
	/** How often to check token expiration in milliseconds (default: 10 seconds) */
	checkInterval?: number;
}

interface UseTokenExpirationResult {
	/** Time remaining in milliseconds until token expires (null if no token or expired) */
	timeRemaining: number | null;
	/** True if token is about to expire (within warning threshold) */
	isExpiringSoon: boolean;
	/** True if token is about to expire and should be auto-refreshed */
	shouldAutoRefresh: boolean;
	/** Manually trigger token refresh */
	refreshToken: () => Promise<void>;
	/** True if token refresh is in progress */
	isRefreshing: boolean;
}

const DEFAULT_WARNING_THRESHOLD = 2 * 60 * 1000; // 2 minutes
const DEFAULT_REFRESH_THRESHOLD = 1 * 60 * 1000; // 1 minute
const DEFAULT_CHECK_INTERVAL = 10 * 1000; // 10 seconds

export function useTokenExpiration(
	options: UseTokenExpirationOptions = {}
): UseTokenExpirationResult {
	const {
		warningThreshold = DEFAULT_WARNING_THRESHOLD,
		refreshThreshold = DEFAULT_REFRESH_THRESHOLD,
		checkInterval = DEFAULT_CHECK_INTERVAL,
	} = options;

	const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
	const [isExpiringSoon, setIsExpiringSoon] = useState(false);
	const [shouldAutoRefresh, setShouldAutoRefresh] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Track user activity to avoid refreshing during idle
	const lastActivityRef = useRef<number>(Date.now());
	const hasAutoRefreshedRef = useRef(false);

	// Update last activity timestamp on user interaction
	useEffect(() => {
		const updateActivity = () => {
			lastActivityRef.current = Date.now();
		};

		// Listen for user activity
		window.addEventListener("mousemove", updateActivity);
		window.addEventListener("keydown", updateActivity);
		window.addEventListener("click", updateActivity);
		window.addEventListener("scroll", updateActivity);

		return () => {
			window.removeEventListener("mousemove", updateActivity);
			window.removeEventListener("keydown", updateActivity);
			window.removeEventListener("click", updateActivity);
			window.removeEventListener("scroll", updateActivity);
		};
	}, []);

	// Calculate time remaining until token expires
	const calculateTimeRemaining = useCallback((): number | null => {
		const { authToken } = getAuthTokens();
		if (!authToken) return null;

		const expiration = getTokenExpiration(authToken);
		if (!expiration) return null;

		const now = Date.now();
		const expiresAt = expiration.getTime();
		const remaining = expiresAt - now;

		// Return null if already expired
		return remaining > 0 ? remaining : null;
	}, []);

	// Manually refresh token
	const refreshToken = useCallback(async (): Promise<void> => {
		if (isRefreshing) return;

		setIsRefreshing(true);
		try {
			// Call the refresh endpoint (axios interceptor handles storing new token)
			await apiClient.post("/auth/refresh", {});
			console.log("Token refreshed successfully");

			// Reset the auto-refresh flag after successful refresh
			hasAutoRefreshedRef.current = false;
		} catch (error) {
			console.error("Failed to refresh token:", error);
			throw error;
		} finally {
			setIsRefreshing(false);
		}
	}, [isRefreshing]);

	// Auto-refresh token when near expiration and user is active
	useEffect(() => {
		if (shouldAutoRefresh && !isRefreshing && !hasAutoRefreshedRef.current) {
			// Check if user was active in the last 5 minutes
			const isUserActive = Date.now() - lastActivityRef.current < 5 * 60 * 1000;

			if (isUserActive) {
				console.log("Auto-refreshing token due to approaching expiration and user activity");
				refreshToken().catch((error) => {
					console.error("Auto-refresh failed:", error);
				});

				// Mark that we've attempted auto-refresh for this token
				hasAutoRefreshedRef.current = true;
			}
		}
	}, [shouldAutoRefresh, isRefreshing, refreshToken]);

	// Check token expiration on interval
	useEffect(() => {
		const checkExpiration = () => {
			const remaining = calculateTimeRemaining();

			setTimeRemaining(remaining);

			if (remaining === null) {
				// No token or expired
				setIsExpiringSoon(false);
				setShouldAutoRefresh(false);
				hasAutoRefreshedRef.current = false;
			} else if (remaining <= refreshThreshold) {
				// Very close to expiration - should auto-refresh
				setIsExpiringSoon(true);
				setShouldAutoRefresh(true);
			} else if (remaining <= warningThreshold) {
				// Close to expiration - show warning
				setIsExpiringSoon(true);
				setShouldAutoRefresh(false);
			} else {
				// Token still valid
				setIsExpiringSoon(false);
				setShouldAutoRefresh(false);
			}
		};

		// Initial check
		checkExpiration();

		// Set up interval
		const interval = setInterval(checkExpiration, checkInterval);

		return () => clearInterval(interval);
	}, [calculateTimeRemaining, warningThreshold, refreshThreshold, checkInterval]);

	return {
		timeRemaining,
		isExpiringSoon,
		shouldAutoRefresh,
		refreshToken,
		isRefreshing,
	};
}
