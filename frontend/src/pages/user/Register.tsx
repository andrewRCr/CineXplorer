import { ROUTES } from "@/constants/routes";
import { Box, Button, Field, VStack, Text } from "@chakra-ui/react";
import { StyledInput } from "@/components/common";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { TextLink } from "@/components/common";

const Register = () => {
  const authContext = useAuthContext();
  const register = authContext?.register;
  const navigate = useNavigate();
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
        const response = await register(username, email, password);

        if (response.success) {
          // Toast notification handled by useAuth.register()
          navigate(ROUTES.LOGIN);
        }
        // Error case: toast notification handled by useAuth.register()
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
      {/* Register Box - Centered */}
      <Box position="relative" zIndex={1} w="480px">
        <Box
          bg="layer-01"
          color="foreground"
          p={10}
          rounded="lg"
          boxShadow="xl"
          w="100%"
        >
          <form onSubmit={formik.handleSubmit}>
            <VStack gap="24px" align="flex-start">
              <Box minH="80px" w="100%">
                <Field.Root
                  required
                  invalid={!!formik.errors.email && formik.touched.email}
                  w="100%"
                  position="relative"
                >
                  <Field.Label
                    htmlFor="email"
                    fontSize="16px"
                    fontWeight="medium"
                    mb={2}
                  >
                    Email Address
                  </Field.Label>
                  <StyledInput
                    autoFocus
                    id="email"
                    name="email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    layer="01"
                  />
                  <Field.ErrorText
                    fontSize="14px"
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    mt="4px"
                    color="destructive"
                  >
                    {formik.errors.email}
                  </Field.ErrorText>
                </Field.Root>
              </Box>
              <Box minH="80px" w="100%">
                <Field.Root
                  required
                  invalid={!!formik.errors.username && formik.touched.username}
                  w="100%"
                  position="relative"
                >
                  <Field.Label
                    htmlFor="username"
                    fontSize="16px"
                    fontWeight="medium"
                    mb={2}
                  >
                    CineXplorer Username
                  </Field.Label>
                  <StyledInput
                    id="username"
                    name="username"
                    type="text"
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    layer="01"
                  />
                  <Field.ErrorText
                    fontSize="14px"
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    mt="4px"
                    color="destructive"
                  >
                    {formik.errors.username}
                  </Field.ErrorText>
                </Field.Root>
              </Box>
              <Box minH="80px" w="100%">
                <Field.Root
                  required
                  invalid={!!formik.errors.password && formik.touched.password}
                  w="100%"
                  position="relative"
                >
                  <Field.Label
                    htmlFor="password"
                    fontSize="16px"
                    fontWeight="medium"
                    mb={2}
                  >
                    Password
                  </Field.Label>
                  <StyledInput
                    id="password"
                    name="password"
                    type="password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    layer="01"
                  />
                  <Field.ErrorText
                    fontSize="14px"
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    mt="4px"
                    color="destructive"
                  >
                    {formik.errors.password}
                  </Field.ErrorText>
                </Field.Root>
              </Box>

              <Button
                type="submit"
                width="full"
                fontSize="16px"
                loading={formik.isSubmitting}
                loadingText="Registering..."
                bg="primary"
                color="on-primary"
                _hover={{
                  bg: "primary-hover",
                }}
              >
                Register
              </Button>
              <Text mt="16px" textAlign="center" w="100%" fontSize="16px">
                Already have an account?{" "}
                <TextLink to={ROUTES.LOGIN}>Sign In</TextLink>
              </Text>
            </VStack>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;
