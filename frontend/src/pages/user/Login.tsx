import { ROUTES } from "@/constants/routes";
import {
	Box,
	Button,
	Checkbox,
	Container,
	Field,
	Input,
	VStack,
	Text,
	Link,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import useAuthContext from "@/hooks/useAuthContext";
import { COLORS } from "@/constants/theme";
import { useState, useEffect } from "react";

const Login = () => {
	const authContext = useAuthContext();
	const login = authContext?.login;
	const navigate = useNavigate();
	const [rememberMeChecked, setRememberMeChecked] = useState(false);

	const formik = useFormik({
		initialValues: {
			username: "",
			password: "",
			rememberMe: false,
		},
		validate: (values) => {
			const errors: Partial<typeof values> = {};
			if (!values.username) {
				errors.username = "Required";
			}
			if (!values.password) {
				errors.password = "Required";
			}
			return errors;
		},
		onSubmit: async (values) => {
			const { username, password } = values;
			if (login) {
				const response = await login(
					username,
					password,
					formik.values.rememberMe
				);
				if (response === 401) {
					console.log("Login failed: Invalid credentials");
					formik.setErrors({
						username: "Invalid username or password",
						password: "Invalid username or password",
					});
				} else {
					navigate(ROUTES.HOME);
				}
			}
		},
	});

	// Sync local state with Formik
	useEffect(() => {
		setRememberMeChecked(formik.values.rememberMe);
	}, [formik.values.rememberMe]);

	return (
		<Box
			position="absolute"
			top="20px"
			bottom="180px"
			left="0"
			right="0"
			display="flex"
			alignItems="center"
			justifyContent="center"
			paddingY="32px"
		>
			<Container maxW="md">
				<Box
					bg={COLORS.background.main}
					p={10}
					rounded="lg"
					boxShadow="xl"
					w="100%"
					maxW="520px"
					mx="auto"
				>
					<form onSubmit={formik.handleSubmit}>
						<VStack gap="24px" align="flex-start">
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
										Username or Email Address
									</Field.Label>
									<Input
										autoFocus
										id="username"
										name="username"
										type="text"
										value={formik.values.username}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
										border="1px solid"
										borderColor={COLORS.border.main}
										_focus={{
											borderColor: COLORS.accent.primary,
											boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
										}}
									/>
									<Field.ErrorText
										fontSize="14px"
										position="absolute"
										top="100%"
										left="0"
										right="0"
										mt="4px"
									>
										{formik.errors.username}
									</Field.ErrorText>
								</Field.Root>
							</Box>
							<Box minH="80px" w="100%" mt={3}>
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
									<Input
										id="password"
										name="password"
										type="password"
										value={formik.values.password}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
										border="1px solid"
										borderColor={COLORS.border.main}
										_focus={{
											borderColor: COLORS.accent.primary,
											boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
										}}
									/>
									<Field.ErrorText
										fontSize="14px"
										position="absolute"
										top="100%"
										left="0"
										right="0"
										mt="4px"
									>
										{formik.errors.password}
									</Field.ErrorText>
								</Field.Root>
							</Box>
							<Checkbox.Root
								mt={3}
								id="rememberMe"
								name="rememberMe"
								checked={rememberMeChecked}
								onCheckedChange={(details) => {
									const checked = Boolean(details.checked);
									setRememberMeChecked(checked);
									formik.setFieldValue("rememberMe", checked);
								}}
								onBlur={() => {
									formik.setFieldTouched("rememberMe", true);
								}}
							>
								<Checkbox.HiddenInput />
								<Checkbox.Control borderColor={COLORS.border.main} />
								<Checkbox.Label fontSize="16px">Remember Me</Checkbox.Label>
							</Checkbox.Root>
							<Button
								mt={3}
								type="submit"
								width="full"
								fontSize="16px"
								// isLoading={formik.isSubmitting}
							>
								Login
							</Button>
							<Text mt="4px" textAlign="center" w="100%" fontSize="16px">
								Don't have an account?{" "}
								<Link href={ROUTES.REGISTER} color="blue.400">
									Register
								</Link>
							</Text>
						</VStack>
					</form>
				</Box>
			</Container>
		</Box>
	);
};

export default Login;
