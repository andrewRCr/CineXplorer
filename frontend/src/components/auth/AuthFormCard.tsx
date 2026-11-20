import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

/**
 * AuthFormCard
 *
 * Card styling for authentication forms (Login, Register, ForgotPassword).
 * Provides consistent width, padding, background, and shadow.
 *
 * Use inside a centering container - this component handles the card only,
 * not page-level positioning. A form's alerts go first inside the card, above the form.
 *
 * @example
 * ```tsx
 * <Box position="relative" minH="100%" display="flex" alignItems="center" justifyContent="center" paddingY="32px">
 *   <AuthFormCard>
 *     {error && <Box w="full" mb={6}><FloatingAlert status="error">...</FloatingAlert></Box>}
 *     <form>...</form>
 *   </AuthFormCard>
 * </Box>
 * ```
 */

interface AuthFormCardProps {
  children: ReactNode;
}

export const AuthFormCard = ({ children }: AuthFormCardProps) => (
  <Box
    position="relative"
    zIndex={1}
    w="100%"
    maxW="480px"
    px={{ base: 4, md: 0 }}
  >
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
