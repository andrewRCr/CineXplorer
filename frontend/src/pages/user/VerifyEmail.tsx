import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Text, Spinner, Alert, VStack, Button } from "@chakra-ui/react";
import { ROUTES } from "@/constants/routes";
import * as authService from "@/services/authService";

const VerifyEmail = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const hasVerifiedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent duplicate verification calls (React Strict Mode can cause double mounting)
    if (hasVerifiedRef.current) {
      return;
    }

    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      hasVerifiedRef.current = true;

      try {
        const response = await authService.verifyEmail(token);

        setStatus("success");
        setMessage(response.message || "Email verified successfully!");
        // Auto-redirect to login after 3 seconds on success
        let count = 3;
        setCountdown(count);
        timerRef.current = setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            navigate(ROUTES.LOGIN, {
              state: { emailVerified: true, message: response.message },
            });
          }
        }, 1000);
      } catch (error: unknown) {
        console.error("Email verification error:", error);
        setStatus("error");

        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
          if (axiosError.response?.status === 400) {
            setMessage(
              axiosError.response.data?.error || "Invalid or expired verification link."
            );
            return;
          }
        }
        setMessage(
          "An error occurred during verification. Please try again."
        );
      }
    };

    verifyEmail();

    // Cleanup timer on unmount to prevent memory leak
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [token, navigate]);

  const handleContinue = () => {
    navigate(ROUTES.LOGIN);
  };

  return (
    <Box
      position="relative"
      minH="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      paddingX={{ base: 4, md: 6 }}
      paddingY="32px"
    >
      <Box maxW="500px" w="100%" textAlign="center">
        {status === "loading" && (
          <VStack gap={4}>
            <Spinner size="xl" color="tertiary" />
            <Text fontSize="lg">Verifying your email...</Text>
          </VStack>
        )}

        {status === "success" && (
          <VStack gap={6}>
            <Alert.Root
              status="success"
              borderRadius="lg"
              border="1px solid"
              borderColor="success"
              boxShadow="sm"
            >
              <Alert.Indicator />
              <Box>
                <Alert.Title fontSize="lg" fontWeight="semibold" mb={2}>
                  Email Verified!
                </Alert.Title>
                <Alert.Description fontSize="md" mb={3}>
                  {message}
                </Alert.Description>
                <Text
                  fontSize="sm"
                  color="on-success"
                  fontWeight="medium"
                >
                  Redirecting to login in {countdown} second
                  {countdown !== 1 ? "s" : ""}...
                </Text>
              </Box>
            </Alert.Root>
            <Button
              variant="solid"
              size="lg"
              onClick={handleContinue}
            >
              Continue to Login Now
            </Button>
          </VStack>
        )}

        {status === "error" && (
          <VStack gap={6}>
            <Alert.Root
              status="error"
              borderRadius="lg"
              border="1px solid"
              borderColor="destructive"
              boxShadow="sm"
            >
              <Alert.Indicator />
              <Box>
                <Alert.Title fontSize="lg" fontWeight="semibold" mb={2}>
                  Verification Failed
                </Alert.Title>
                <Alert.Description fontSize="md">{message}</Alert.Description>
              </Box>
            </Alert.Root>
            <VStack gap={3}>
              <Button
                variant="neutral-outline"
                onClick={() => navigate(ROUTES.LOGIN)}
                size="lg"
                w="full"
                maxW="200px"
              >
                Back to Login
              </Button>
              <Button
                variant="neutral-outline"
                onClick={() => window.location.reload()}
                size="lg"
                w="full"
                maxW="200px"
              >
                Try Again
              </Button>
            </VStack>
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default VerifyEmail;
