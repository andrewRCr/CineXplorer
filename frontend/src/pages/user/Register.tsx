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
				console.log("Register response:", response);
				if (response === 409) {
					console.log("Registration failed: Username or email already exists");
					formik.setErrors({
						username: "Username invalid or already taken.",
						email: "Email invalid or already taken.",
					});
				} else if (response === 400) {
					console.log("Registration failed");
					formik.setErrors({
						password: "Password invalid.",
					});
				} else {
					console.log("Registration successful");
					navigate(ROUTES.LOGIN);
				}
			}
		},
	});

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
									<Input
										autoFocus
										id="email"
										name="email"
										type="email"
										value={formik.values.email}
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
									<Input
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

							<Button
								type="submit"
								width="full"
								fontSize="16px"
							>
								Register
							</Button>
							<Text mt="16px" textAlign="center" w="100%" fontSize="16px">
								Already have an account?{" "}
								<Link href={ROUTES.LOGIN} color="blue.400">
									Sign In
								</Link>
							</Text>
						</VStack>
					</form>
				</Box>
			</Container>
		</Box>
	);
};

export default Register;
