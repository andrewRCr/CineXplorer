import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

/**
 * AuthFormCard
 *
 * Card styling for authentication forms (Login, Register, ForgotPassword).
 * Provides consistent width, padding, background, and shadow.
 *
 * Use inside a centering container - this component handles the card only,
 * not page-level positioning (which pages need to control for alert placement).
 *
 * @example
 * ```tsx
 * <Box position="relative" minH="100%" display="flex" alignItems="center" justifyContent="center" paddingY="32px">
 *   <AuthFormCard>
 *     <form>...</form>
 *   </AuthFormCard>
 *   {error && <FloatingAlertContainer>...</FloatingAlertContainer>}
 * </Box>
 * ```
 */

interface AuthFormCardProps {
  children: ReactNode;
}

export const AuthFormCard = ({ children }: AuthFormCardProps) => (
  <Box position="relative" zIndex={1} w="100%" maxW="480px" px={{ base: 4, md: 0 }}>
    <Box
      bg="layer-01"
      color="foreground"
      p={{ base: 6, md: 10 }}
      rounded="lg"
      boxShadow="xl"
      w="100%"
    >
      {children}
    </Box>
  </Box>
);
