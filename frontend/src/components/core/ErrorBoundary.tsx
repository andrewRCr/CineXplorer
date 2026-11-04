import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Alert,
  Code,
  Collapsible,
  Separator,
  HStack,
  IconButton,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { LuChevronDown, LuChevronUp, LuCopy } from "react-icons/lu";
import { MdWarning } from "react-icons/md";
import logger from "../../services/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showErrorDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
}

// Functional component for error display (since hooks can't be used in class components)
const ErrorDisplay: React.FC<{
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  showErrorDetails: boolean;
  onReset: () => void;
  onReportError: () => void;
}> = ({
  error,
  errorInfo,
  errorId,
  showErrorDetails,
  onReset,
  onReportError,
}) => {
  const { open: isOpen, onToggle } = useDisclosure();

  const copyErrorDetails = () => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    navigator.clipboard
      .writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Could show a toast here if toast context is available
        console.log("Error details copied to clipboard");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = JSON.stringify(errorDetails, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      });
  };

  return (
    <Box
      minH="50vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="background"
      px={4}
      pt={12}
    >
      <Container maxW="lg">
        <VStack gap={6} textAlign="center">
          {/* Main Error Alert */}
          <Alert.Root
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="auto"
            p={6}
            borderRadius="lg"
          >
            <Alert.Indicator asChild>
              <Box mb={4}>
                <MdWarning size="40px" color="destructive" />
              </Box>
            </Alert.Indicator>
            <Heading as="h2" size="lg" mb={2} color="destructive">
              Oops! Something went wrong
            </Heading>
            <Text color="foreground" mb={4}>
              We've encountered an unexpected error. Our team has been notified
              and is working on a fix.
            </Text>

            <HStack gap={4}>
              <Button
                bg="destructive"
                color="on-destructive"
                _hover={{ bg: "destructive/92" }}
                variant="solid"
                onClick={onReset}
                size="md"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                borderColor="destructive"
                color="destructive"
                _hover={{
                  bg: "destructive/8",
                  borderColor: "destructive",
                  color: "destructive",
                }}
                onClick={onReportError}
                size="md"
              >
                Report Issue
              </Button>
            </HStack>
          </Alert.Root>

          {/* Error ID Display */}
          <Box textAlign="center">
            <Text fontSize="sm" color="on-muted" mb={2}>
              Error ID for support:
            </Text>
            <HStack justify="center" gap={2}>
              <Code
                px={3}
                py={1}
                borderRadius="md"
                fontSize="sm"
                bg="muted"
                color="foreground"
              >
                {errorId}
              </Code>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                    aria-label="Copy error ID"
                    size="sm"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(errorId)}
                  >
                    <LuCopy />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Content>Copy error ID</Tooltip.Content>
              </Tooltip.Root>
            </HStack>
          </Box>

          {/* Developer/Debug Information */}
          {showErrorDetails && (
            <Box width="100%">
              <Separator mb={4} />

              <Button
                variant="ghost"
                size="sm"
                color="tertiary"
                _hover={{
                  bg: "tertiary/8",
                  color: "tertiary-hover",
                }}
                onClick={onToggle}
                mb={4}
              >
                {isOpen ? "Hide" : "Show"} Technical Details
                {isOpen ? <LuChevronUp /> : <LuChevronDown />}
              </Button>

              <Collapsible.Root open={isOpen}>
                <Collapsible.Content>
                  <VStack gap={4} align="stretch">
                    {/* Error Message */}
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Error Message:
                      </Text>
                      <Code
                        display="block"
                        p={3}
                        borderRadius="md"
                        fontSize="sm"
                        whiteSpace="pre-wrap"
                        bg="destructive/8"
                        color="foreground"
                        border="1px solid"
                        borderColor="destructive/30"
                      >
                        {error.message}
                      </Code>
                    </Box>

                    {/* Stack Trace */}
                    <Box>
                      <HStack justify="space-between" align="center" mb={2}>
                        <Text fontSize="sm" fontWeight="bold">
                          Stack Trace:
                        </Text>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <IconButton
                              aria-label="Copy error details"
                              size="sm"
                              variant="ghost"
                              onClick={copyErrorDetails}
                            >
                              <LuCopy />
                            </IconButton>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            Copy all error details
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </HStack>
                      <Code
                        display="block"
                        p={3}
                        borderRadius="md"
                        fontSize="xs"
                        whiteSpace="pre-wrap"
                        bg="muted"
                        color="foreground"
                        border="1px solid"
                        borderColor="border-strong-01"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {error.stack || "No stack trace available"}
                      </Code>
                    </Box>

                    {/* Component Stack */}
                    {errorInfo.componentStack && (
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" mb={2}>
                          Component Stack:
                        </Text>
                        <Code
                          display="block"
                          p={3}
                          borderRadius="md"
                          fontSize="xs"
                          whiteSpace="pre-wrap"
                          bg="info/10"
                          color="foreground"
                          border="1px solid"
                          borderColor="info/30"
                          maxH="150px"
                          overflowY="auto"
                        >
                          {errorInfo.componentStack}
                        </Code>
                      </Box>
                    )}
                  </VStack>
                </Collapsible.Content>
              </Collapsible.Root>
            </Box>
          )}

          {/* Help Text */}
          <Text fontSize="sm" color="on-muted" textAlign="center">
            If this problem persists, please contact support with the error ID
            above.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId =
      this.state.errorId ||
      `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log error with comprehensive context
    this.logError(error, errorInfo, errorId);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Auto-reset after 30 seconds in development (helpful for development)
    if (process.env.NODE_ENV === "development") {
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, 30000);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // Log comprehensive error information
    logger.logError(error, "React ErrorBoundary", {
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: {
        props: {
          showErrorDetails: this.props.showErrorDetails,
          hasFallback: !!this.props.fallback,
        },
      },
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Also report as critical error to backend
    logger.reportCriticalError(
      `React Error Boundary caught error: ${error.message}`,
      {
        errorId,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      "ErrorBoundary",
    );
  };

  private handleReset = () => {
    // Clear the auto-reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    // Log the reset action
    logger.info("ErrorBoundary reset by user", {
      errorId: this.state.errorId,
      previousError: this.state.error?.message,
    });

    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;

    if (error && errorId) {
      // Log the manual error report action
      logger.info("User manually reported error", {
        errorId,
        errorMessage: error.message,
      });

      // Send another report to backend to flag as "user reported"
      logger.reportCriticalError(
        `User-reported error: ${error.message}`,
        {
          errorId,
          userReported: true,
          name: error.name,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
        },
        "UserReported",
      );

      // Could integrate with a feedback system here
      // For now, we'll just show feedback that the error was reported
      alert("Thank you for reporting this error. Our team has been notified.");
    }
  };

  componentWillUnmount() {
    // Clean up timeout when component unmounts
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with full functionality
      if (this.state.error && this.state.errorInfo && this.state.errorId) {
        return (
          <ErrorDisplay
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            errorId={this.state.errorId}
            showErrorDetails={
              this.props.showErrorDetails ??
              process.env.NODE_ENV === "development"
            }
            onReset={this.handleReset}
            onReportError={this.handleReportError}
          />
        );
      }

      // Fallback if state is incomplete
      return (
        <Box
          minH="50vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Alert.Root status="error" maxW="md">
            <Alert.Indicator asChild>
              <MdWarning />
            </Alert.Indicator>
            <Box>
              <Text fontWeight="bold">Something went wrong</Text>
              <Text>Please refresh the page to try again.</Text>
            </Box>
          </Alert.Root>
        </Box>
      );
    }

    // Normal render when no error
    return this.props.children;
  }
}

export default ErrorBoundary;
export type { ErrorBoundaryProps };
