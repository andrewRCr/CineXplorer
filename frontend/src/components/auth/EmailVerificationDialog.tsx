import {
  VStack,
  Text,
  HStack,
  Button,
  Spinner,
  Dialog,
  Portal,
} from "@chakra-ui/react";

/**
 * EmailVerificationDialog
 *
 * Modal dialog for email verification flow. Shown when user navigates to
 * `/login?verify=TOKEN`. Uses a button safeguard to prevent email client
 * link scanning from consuming tokens.
 *
 * States:
 * - pending: Shows "Complete Verification" button
 * - verifying: Shows spinner while API call in progress
 * - success: Shows success message, auto-closes after delay
 * - error: Shows error message with guidance, allows dismiss
 *
 * @example
 * ```tsx
 * <EmailVerificationDialog
 *   verificationState={verificationState}
 *   verificationMessage={verificationMessage}
 *   onVerify={handleVerifyEmail}
 *   onDismiss={() => {
 *     setVerificationState(null);
 *     window.history.replaceState({}, "", ROUTES.LOGIN);
 *   }}
 * />
 * ```
 */

export type VerificationState =
  "pending" | "verifying" | "success" | "error" | null;

interface EmailVerificationDialogProps {
  /** Current verification state */
  verificationState: VerificationState;
  /** Message to display (for success/error states) */
  verificationMessage: string;
  /** Handler for "Complete Verification" button click */
  onVerify: () => void;
  /** Handler for dialog dismiss (cancel, close, or after success) */
  onDismiss: () => void;
}

export const EmailVerificationDialog = ({
  verificationState,
  verificationMessage,
  onVerify,
  onDismiss,
}: EmailVerificationDialogProps) => {
  return (
    <Dialog.Root
      open={verificationState !== null}
      onOpenChange={(details) => {
        if (!details.open) {
          onDismiss();
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
                {verificationState === "error"
                  ? "Verification Failed"
                  : "Verify Your Email"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={6}>
              {verificationState === "pending" && (
                <VStack gap={4}>
                  <Text textAlign="center">
                    Click the button below to complete your email verification
                    for CineXplorer.
                  </Text>
                  <Button
                    variant="solid"
                    bg="primary"
                    color="on-primary"
                    _hover={{ bg: "primary-hover" }}
                    _active={{ bg: "primary-active" }}
                    onClick={onVerify}
                    w="full"
                    size="lg"
                  >
                    Complete Verification
                  </Button>
                </VStack>
              )}
              {verificationState === "verifying" && (
                <HStack justify="center" gap={3} py={4}>
                  <Spinner size="md" color="tertiary" />
                  <Text>Verifying your email...</Text>
                </HStack>
              )}
              {verificationState === "success" && (
                <VStack gap={3} py={2}>
                  <Text color="success" textAlign="center" fontWeight="medium">
                    {verificationMessage}
                  </Text>
                </VStack>
              )}
              {verificationState === "error" && (
                <VStack gap={3}>
                  <Text color="destructive" textAlign="center">
                    {verificationMessage}
                  </Text>
                  <Text fontSize="sm" color="on-muted" textAlign="center">
                    You can log in and request a new verification email if
                    needed.
                  </Text>
                </VStack>
              )}
            </Dialog.Body>
            {/* Show footer with dismiss option for pending/error states */}
            {(verificationState === "pending" ||
              verificationState === "error") && (
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {verificationState === "error" ? "Close" : "Cancel"}
                  </Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
