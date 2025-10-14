/**
 * SessionExpirationWarning
 *
 * Displays a warning banner when the user's session is about to expire.
 * Provides options to extend the session or shows countdown to expiration.
 *
 * Features:
 * - Shows warning when token is within 2 minutes of expiration
 * - Displays countdown timer showing remaining time
 * - Auto-refreshes token when user clicks "Stay logged in"
 * - Auto-dismisses when token is refreshed
 * - Responsive design with Chakra UI v3
 */
import {
	Button,
	Stack,
	Box,
	CloseButton,
	Alert,
} from "@chakra-ui/react";
import { useTokenExpiration } from "@/hooks/useTokenExpiration";
import { useState } from "react";

export function SessionExpirationWarning() {
	const {
		timeRemaining,
		isExpiringSoon,
		refreshToken,
		isRefreshing,
	} = useTokenExpiration();

	const [isVisible, setIsVisible] = useState(true);
	const [hasRefreshed, setHasRefreshed] = useState(false);

	// Don't show if:
	// - Token is not expiring soon
	// - User has manually dismissed the warning
	// - User has already refreshed this session
	if (!isExpiringSoon || !isVisible || hasRefreshed || timeRemaining === null) {
		return null;
	}

	// Format time remaining for display
	const minutes = Math.floor(timeRemaining / 60000);
	const seconds = Math.floor((timeRemaining % 60000) / 1000);
	const timeDisplay =
		minutes > 0
			? `${minutes} minute${minutes !== 1 ? "s" : ""}`
			: `${seconds} second${seconds !== 1 ? "s" : ""}`;

	// Handle extending session
	const handleExtendSession = async () => {
		try {
			await refreshToken();
			setHasRefreshed(true);

			// Reset after 5 seconds to allow future warnings
			setTimeout(() => {
				setHasRefreshed(false);
			}, 5000);
		} catch (error) {
			console.error("Failed to extend session:", error);
			// Don't close on error - let user try again
		}
	};

	const handleClose = () => {
		setIsVisible(false);
	};

	return (
		<Box
			position="fixed"
			top={4}
			left="50%"
			transform="translateX(-50%)"
			maxWidth="600px"
			zIndex={1000}
			width="90%"
		>
			<Alert.Root
				status="warning"
				borderRadius="md"
				boxShadow="lg"
			>
				<Alert.Indicator />
				<Stack gap={3} width="100%" flex={1}>
					<Alert.Title fontSize="md" fontWeight="semibold">
						Session Expiring Soon
					</Alert.Title>
					<Alert.Description fontSize="sm">
						Your session will expire in {timeDisplay}. Would you like to stay
						logged in?
					</Alert.Description>
					<Stack direction="row" gap={2} justifyContent="flex-end">
						<Button
							size="sm"
							colorScheme="orange"
							onClick={handleExtendSession}
							loading={isRefreshing}
							loadingText="Extending..."
						>
							Stay logged in
						</Button>
						<CloseButton
							size="sm"
							onClick={handleClose}
						/>
					</Stack>
				</Stack>
			</Alert.Root>
		</Box>
	);
}
