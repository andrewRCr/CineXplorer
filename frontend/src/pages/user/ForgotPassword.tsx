import { ROUTES } from "@/constants/routes";
import { Box, Button, VStack, Text } from "@chakra-ui/react";
import { TextLink } from "@/components/common";
import { AuthFormCard, FormField } from "@/components/auth";
import { useFormik } from "formik";
import { useState } from "react";
import * as authService from "@/services/authService";

const ForgotPassword = () => {
  const [success, setSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validate: (values) => {
      const errors: Partial<typeof values> = {};
      if (!values.email) {
        errors.email = "Required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        errors.email = "Invalid email address";
      }
      return errors;
    },
    onSubmit: async (values) => {
      try {
        await authService.requestPasswordReset(values.email);
        setSuccess(true);
      } catch {
        // Show generic success message even on error to prevent email enumeration
        // (Security best practice: don't reveal whether email exists)
        setSuccess(true);
      }
    },
  });

  if (success) {
    return (
      <Box
        position="relative"
        minH="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        paddingY="32px"
      >
        <AuthFormCard>
          <VStack gap="24px" align="flex-start">
            <Text fontSize="20px" fontWeight="semibold">
              Check your email
            </Text>
            <Text fontSize="16px" color="on-muted">
              If an account exists with that email address, we've sent password
              reset instructions. Check your inbox and spam folder.
            </Text>
            <TextLink to={ROUTES.LOGIN}>Back to login</TextLink>
          </VStack>
        </AuthFormCard>
      </Box>
    );
  }

  return (
    <Box
      position="relative"
      minH="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      paddingY="32px"
    >
      <AuthFormCard>
        <form onSubmit={formik.handleSubmit}>
          <VStack gap="24px" align="flex-start">
              <Text fontSize="20px" fontWeight="semibold">
                Reset your password
              </Text>
              <Text fontSize="16px" color="on-muted">
                Enter your email address and we'll send you a link to reset your
                password.
              </Text>
              <FormField
                name="email"
                label="Email Address"
                type="email"
                value={formik.values.email}
                error={formik.errors.email}
                touched={formik.touched.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                autoFocus
              />

              <Button
                type="submit"
                width="full"
                fontSize="16px"
                loading={formik.isSubmitting}
                loadingText="Sending..."
              >
                Send reset link
              </Button>

              <Text textAlign="center" w="100%" fontSize="16px">
                Remember your password?{" "}
                <TextLink to={ROUTES.LOGIN}>Sign in</TextLink>
              </Text>
            </VStack>
          </form>
        </AuthFormCard>
    </Box>
  );
};

export default ForgotPassword;
