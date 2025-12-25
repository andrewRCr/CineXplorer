import { ROUTES } from "@/constants/routes";
import { Box, Button, VStack, Text } from "@chakra-ui/react";
import { TextLink, FloatingAlert, FloatingAlertContainer } from "@/components/common";
import { AuthFormCard, FormField } from "@/components/auth";
import { useFormik } from "formik";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { priorityToaster } from "@/components/core/chakra/toaster";

const Register = () => {
  const authContext = useAuthContext();
  const register = authContext?.register;
  const navigate = useNavigate();
  const [registrationError, setRegistrationError] = useState("");

  const formik = useFormik({
    initialValues: {
      username: "",
      email: "",
      password: "",
    },
    validate: (values) => {
      const errors: Partial<typeof values> = {};
      if (!values.username) {
        errors.username = "Required";
      }
      if (!values.email) {
        errors.email = "Required";
      }
      if (!values.password) {
        errors.password = "Required";
      }
      return errors;
    },
    onSubmit: async (values) => {
      const { username, email, password } = values;
      if (register) {
        const toastId = "register-toast";
        priorityToaster.loading({ id: toastId, title: "Creating account..." });

        const response = await register(username, email, password);

        if (response.success) {
          // Clear any error state on success
          setRegistrationError("");

          // Dismiss loading toast and navigate to login
          // Login page will show persistent success alert (non-blocking, top-right)
          priorityToaster.dismiss(toastId);
          navigate(ROUTES.LOGIN, {
            state: {
              registrationSuccess: true,
              message: "Account created! Check your email to verify your account before logging in.",
            },
          });
        } else {
          // Dismiss loading toast and show error as FloatingAlert
          priorityToaster.dismiss(toastId);
          setRegistrationError(response.error.message);
        }
      }
    },
  });

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
              <FormField
                name="email"
                label="Email Address"
                type="email"
                value={formik.values.email}
                error={formik.errors.email}
                touched={formik.touched.email}
                onChange={(e) => {
                  formik.handleChange(e);
                  setRegistrationError("");
                }}
                onBlur={formik.handleBlur}
                autoFocus
              />
              <FormField
                name="username"
                label="CineXplorer Username"
                value={formik.values.username}
                error={formik.errors.username}
                touched={formik.touched.username}
                onChange={(e) => {
                  formik.handleChange(e);
                  setRegistrationError("");
                }}
                onBlur={formik.handleBlur}
              />
              <FormField
                name="password"
                label="Password"
                type="password"
                value={formik.values.password}
                error={formik.errors.password}
                touched={formik.touched.password}
                onChange={(e) => {
                  formik.handleChange(e);
                  setRegistrationError("");
                }}
                onBlur={formik.handleBlur}
              />

              <Button
                type="submit"
                width="full"
                fontSize="16px"
                loading={formik.isSubmitting}
                loadingText="Registering..."
              >
                Register
              </Button>
              <Text mt="16px" textAlign="center" w="100%" fontSize="16px">
                Already have an account?{" "}
                <TextLink to={ROUTES.LOGIN}>Sign In</TextLink>
              </Text>
            </VStack>
          </form>
        </AuthFormCard>

      {/* Floating alert - positioned above form, no layout shift */}
      {/* Registration errors use persistent alert; success redirects to login with alert there */}
      {registrationError && (
        <FloatingAlertContainer>
          <FloatingAlert
            status="error"
            onDismiss={() => setRegistrationError("")}
          >
            {registrationError}
          </FloatingAlert>
        </FloatingAlertContainer>
      )}
    </Box>
  );
};

export default Register;
