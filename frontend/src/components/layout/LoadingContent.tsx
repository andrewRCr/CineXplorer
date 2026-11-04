import { Box, Text, VStack, Spinner } from "@chakra-ui/react";
import { ReactNode } from "react";

interface LoadingContentProps {
  /**
   * Custom message to display
   * @default "Loading..."
   */
  message?: string;
  /**
   * Icon or logo to display above the message
   */
  icon?: ReactNode;
  /**
   * Display mode:
   * - 'content': Just the spinner/message (for use within existing layouts)
   * - 'layout': Full-page layout with background (for Suspense fallback)
   * @default 'layout'
   */
  mode?: "content" | "layout";
}

/**
 * Reusable loading component with consistent styling
 *
 * Modes:
 * - 'content': Use within existing page layouts (e.g., OAuth loading within AuthLayout)
 * - 'layout': Full-page loading screen (e.g., Suspense fallback for lazy-loaded routes)
 *
 * Provides consistent spinner styling, spacing, and typography across the app.
 */
const LoadingContent = ({
  message = "Loading...",
  icon,
  mode = "layout",
}: LoadingContentProps) => {
  const content = (
    <VStack gap={icon ? 6 : 4}>
      {/* Optional icon/logo */}
      {icon && (
        <Box
          bg="layer-02"
          p={8}
          borderRadius="20px"
          boxShadow="shadow-lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </Box>
      )}

      {/* Loading text and spinner */}
      <VStack gap={4}>
        <Text
          fontSize={icon ? "2xl" : "lg"}
          fontWeight={icon ? "600" : "normal"}
          color="foreground"
        >
          {message}
        </Text>
        <Spinner size="xl" color="tertiary" />
      </VStack>
    </VStack>
  );

  if (mode === "content") {
    // Content-only mode (for use within existing layouts)
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="400px"
        w="100%"
      >
        {content}
      </Box>
    );
  }

  // Layout mode (full-page with background for Suspense fallback)
  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="background">
      <Box flex="1" display="flex" alignItems="center" justifyContent="center">
        {content}
      </Box>
    </Box>
  );
};

export default LoadingContent;
