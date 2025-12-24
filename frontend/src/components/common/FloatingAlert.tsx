import { Alert, Box, Button, IconButton, VStack } from "@chakra-ui/react";
import { FiX } from "react-icons/fi";
import type { ReactNode } from "react";

/**
 * Floating Alert Component
 *
 * Thin wrapper around Chakra Alert for floating, dismissible alerts.
 * Uses the Alert recipe for styling - this wrapper handles positioning,
 * dismiss button, and WCAG accessibility attributes.
 *
 * **Positioning hierarchy:**
 * - `center` (default): Top-center, blocking - for auth errors, critical states
 * - `top-right`: Non-blocking, shares space with priority toasts - for success CTAs
 *
 * **Use for:**
 * - Auth errors requiring user action (center position)
 * - Registration success with CTA (top-right position)
 * - Messages requiring user acknowledgment before proceeding
 *
 * **Pattern:**
 * - Dismissible via close button (optional) or auto-clears on user action
 * - WCAG compliant: `role="alert"`, `aria-live="assertive"` for errors
 * - Uses Alert recipe (no inline style overrides)
 *
 * **Do NOT use for:**
 * - Ephemeral success feedback (use toasts - auto-dismiss)
 * - Inline validation errors (use Field.ErrorText)
 *
 *
 * @example
 * ```tsx
 * // Blocking error alert (center, default)
 * <FloatingAlertContainer>
 *   <FloatingAlert status="error" onDismiss={() => setError("")}>
 *     Invalid username or password.
 *   </FloatingAlert>
 * </FloatingAlertContainer>
 *
 * // Non-blocking success CTA (top-right)
 * <FloatingAlertContainer position="top-right">
 *   <FloatingAlert status="success" onDismiss={() => setSuccess(null)}>
 *     Account created! Check your email to verify.
 *   </FloatingAlert>
 * </FloatingAlertContainer>
 * ```
 */

type AlertStatus = "error" | "success" | "warning" | "info";

interface FloatingAlertAction {
  label: string;
  onClick: () => void;
}

interface FloatingAlertProps {
  /** Alert status - determines styling and ARIA attributes */
  status: AlertStatus;
  /** Alert content */
  children: ReactNode;
  /** Callback when dismiss button clicked. If omitted, no dismiss button shown. */
  onDismiss?: () => void;
  /** Optional action button (e.g., "Resend" for email verification) */
  action?: FloatingAlertAction;
  /** Container width - defaults to 480px (matches login form) */
  width?: string;
}

type AlertPosition = "center" | "top-right";

/**
 * Container for floating alerts - positions alerts above form content
 *
 * @param position - "center" (default, blocking) or "top-right" (non-blocking, shares with priority toasts)
 * @param width - Container width, defaults to 480px for center, 320px for top-right
 */
export const FloatingAlertContainer = ({
  children,
  position = "center",
  width,
}: {
  children: ReactNode;
  position?: AlertPosition;
  width?: string;
}) => {
  const isTopRight = position === "top-right";
  const defaultWidth = isTopRight ? "320px" : "480px";

  // Top-right uses layout token to position below navbar
  const topValue = isTopRight
    ? "calc(var(--chakra-sizes-layout-navbar) + var(--chakra-spacing-4))"
    : "4";

  return (
    <Box
      position={isTopRight ? "fixed" : "absolute"}
      top={topValue}
      {...(isTopRight
        ? { right: "4" }
        : { left: "50%", transform: "translateX(-50%)" })}
      w={width ?? defaultWidth}
      zIndex={isTopRight ? 1000 : 2} // Fixed position needs higher z-index
    >
      <VStack gap={3} align="stretch">
        {children}
      </VStack>
    </Box>
  );
};

/**
 * Individual floating alert - use inside FloatingAlertContainer
 */
export const FloatingAlert = ({
  status,
  children,
  onDismiss,
  action,
}: Omit<FloatingAlertProps, "width">) => {
  // Error alerts get assertive ARIA for screen readers
  const isError = status === "error";

  return (
    <Alert.Root
      status={status}
      boxShadow="lg"
      position="relative"
      {...(isError && {
        role: "alert",
        "aria-live": "assertive",
      })}
    >
      {onDismiss && (
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Dismiss"
          onClick={onDismiss}
          position="absolute"
          top={2}
          right={2}
        >
          <FiX size={16} />
        </IconButton>
      )}
      <Alert.Indicator />
      <Box flex="1" pr={onDismiss ? 8 : 0}>
        <Alert.Description>{children}</Alert.Description>
        {action && (
          <Box mt={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          </Box>
        )}
      </Box>
    </Alert.Root>
  );
};
