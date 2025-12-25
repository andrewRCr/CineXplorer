import { useState, useEffect } from "react";
import {
  VStack,
  Text,
  HStack,
  Button,
  Spinner,
  Dialog,
  Portal,
  CloseButton,
} from "@chakra-ui/react";
import { FormField } from "./FormField";

/**
 * PasswordResetDialog
 *
 * Modal dialog for completing password reset flow. Shown when user navigates to
 * `/login?reset=KEY` from the password reset email link.
 *
 * States:
 * - form: Shows password input form
 * - submitting: Shows spinner while API call in progress
 * - success: Shows success message, user should login
 * - error: Shows error message with guidance
 *
 * @example
 * ```tsx
 * <PasswordResetDialog
 *   resetKey={resetKey}
 *   onSuccess={() => {
 *     // Show success toast, clear URL
 *     setResetKey(null);
 *   }}
 *   onDismiss={() => {
 *     setResetKey(null);
 *     window.history.replaceState({}, "", ROUTES.LOGIN);
 *   }}
 * />
 * ```
 */

export type ResetState = "form" | "submitting" | "success" | "error" | null;

interface PasswordResetDialogProps {
  /** Password reset key from URL */
  resetKey: string | null;
  /** Handler for successful password reset */
  onSuccess: (autoLoggedIn: boolean) => void;
  /** Handler for dialog dismiss */
  onDismiss: () => void;
  /** Function to submit the password reset */
  onSubmit: (key: string, password: string) => Promise<{ success: boolean; autoLoggedIn: boolean }>;
}

export const PasswordResetDialog = ({
  resetKey,
  onSuccess,
  onDismiss,
  onSubmit,
}: PasswordResetDialogProps) => {
  const [resetState, setResetState] = useState<ResetState>(resetKey ? "form" : null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const validateForm = (): boolean => {
    let valid = true;

    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!confirmPassword) {
      setConfirmError("Please confirm your password");
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      valid = false;
    } else {
      setConfirmError("");
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!resetKey || !validateForm()) return;

    setResetState("submitting");
    setSubmitError("");

    try {
      const result = await onSubmit(resetKey, password);
      if (result.success) {
        setResetState("success");
        // Notify parent after brief delay to show success state
        setTimeout(() => {
          onSuccess(result.autoLoggedIn);
        }, 1500);
      }
    } catch (error) {
      setResetState("error");
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Password reset failed. Please try again."
      );
    }
  };

  const handleDismiss = () => {
    // Reset form state
    setPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setConfirmError("");
    setSubmitError("");
    setResetState(null);
    onDismiss();
  };

  // Update state when resetKey changes
  useEffect(() => {
    if (resetKey && resetState === null) {
      setResetState("form");
    }
  }, [resetKey, resetState]);

  return (
    <Dialog.Root
      open={resetKey !== null}
      onOpenChange={(details) => {
        if (!details.open) {
          handleDismiss();
        }
      }}
      closeOnInteractOutside={false}
      placement="top"
    >
      <Portal>
        <Dialog.Backdrop bg="backdrop" backdropFilter="blur(4px)" />
        <Dialog.Positioner pt={24}>
          <Dialog.Content bg="layer-01" maxW="400px">
            <Dialog.Header>
              <Dialog.Title>
                {resetState === "error" ? "Reset Failed" : "Set New Password"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={6}>
              {resetState === "form" && (
                <VStack gap={4} align="stretch">
                  <Text color="on-muted">
                    Enter your new password below.
                  </Text>
                  <FormField
                    name="password"
                    label="New Password"
                    type="password"
                    value={password}
                    error={passwordError}
                    touched={!!passwordError}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                      setSubmitError("");
                    }}
                    autoFocus
                  />
                  <FormField
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    error={confirmError}
                    touched={!!confirmError}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmError("");
                      setSubmitError("");
                    }}
                  />
                  {submitError && (
                    <Text color="destructive" fontSize="sm">
                      {submitError}
                    </Text>
                  )}
                  <Button
                    variant="solid"
                    bg="primary"
                    color="on-primary"
                    _hover={{ bg: "primary-hover" }}
                    _active={{ bg: "primary-active" }}
                    onClick={handleSubmit}
                    w="full"
                    size="lg"
                  >
                    Reset Password
                  </Button>
                </VStack>
              )}
              {resetState === "submitting" && (
                <HStack justify="center" gap={3} py={4}>
                  <Spinner size="md" color="tertiary" />
                  <Text>Resetting your password...</Text>
                </HStack>
              )}
              {resetState === "success" && (
                <VStack gap={3} py={2}>
                  <Text color="success" textAlign="center" fontWeight="medium">
                    Password reset successfully!
                  </Text>
                  <Text fontSize="sm" color="on-muted" textAlign="center">
                    You can now log in with your new password.
                  </Text>
                </VStack>
              )}
              {resetState === "error" && (
                <VStack gap={3}>
                  <Text color="destructive" textAlign="center">
                    {submitError}
                  </Text>
                  <Text fontSize="sm" color="on-muted" textAlign="center">
                    You can request a new password reset link if needed.
                  </Text>
                </VStack>
              )}
            </Dialog.Body>
            {/* Show footer with dismiss option for form/error states */}
            {(resetState === "form" || resetState === "error") && (
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            )}
            {/* Close button for error state */}
            {resetState === "error" && (
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" top={2} right={2} />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
