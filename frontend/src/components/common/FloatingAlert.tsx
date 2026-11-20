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
 * **Placement:**
 * - In a form's card, above the form (sign-in, forgot password): the card's first child
 * - In `FloatingAlertContainer`: top-center over the page, without shifting its layout (registration)
 *
 * **Use for:**
 * - Auth errors requiring user action
 * - Notices the visitor arrives with or must act on (account created, email verified, signed out)
 * - Messages requiring user acknowledgment before proceeding
 *
 * **Pattern:**
 * - Dismissible via close button (optional) or auto-clears on user action
 * - WCAG compliant: `role="alert"` (assertive) for errors, `role="status"` (polite) otherwise
 * - Uses Alert recipe (no inline style overrides)
 *
 * **Do NOT use for:**
 * - Ephemeral success feedback (use toasts - auto-dismiss)
 * - Inline validation errors (use Field.ErrorText)
 *
 *
 * @example
 * ```tsx
 * // In a form's card, above the form
 * <Box w="full" mb={6}>
 *   <FloatingAlert status="success" onDismiss={() => setNotice(null)}>
 *     Account created! Check your email to verify.
 *   </FloatingAlert>
 * </Box>
 *
 * // Floating top-center over the page
 * <FloatingAlertContainer>
 *   <FloatingAlert status="error" onDismiss={() => setError("")}>
 *     That username is taken.
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

/**
 * Container for floating alerts - positions alerts top-center, above form content
 *
 * @param width - Container width, defaults to 480px (matches the auth forms)
 */
export const FloatingAlertContainer = ({
  children,
  width,
}: {
  children: ReactNode;
  width?: string;
}) => {
  return (
    <Box
      position="absolute"
      top="4"
      left="50%"
      transform="translateX(-50%)"
      w={width ?? "480px"}
      zIndex={2}
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
  // Screen readers announce errors at once, and other alerts when they finish speaking
  const isError = status === "error";

  return (
    <Alert.Root
      status={status}
      boxShadow="lg"
      position="relative"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
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
              borderColor="border-strong-02"
              _hover={{ borderColor: "primary" }}
              _active={{ borderColor: "primary" }}
            >
              {action.label}
            </Button>
          </Box>
        )}
      </Box>
    </Alert.Root>
  );
};
