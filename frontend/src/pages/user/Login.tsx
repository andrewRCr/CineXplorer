import { ROUTES } from "@/constants/routes";
import {
	Box,
	Button,
	Checkbox,
	Container,
	Field,
	Input,
	VStack,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import useAuthContext from "@/hooks/useAuthContext";

const Login = () => {
	const authContext = useAuthContext();
	const login = authContext?.login;
	const navigate = useNavigate();
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
				const response = await login(username, password);
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

	return (
		<Container maxW="xs">
			<Box
				bg="gray"
				p={4}
				marginTop={8}
				display="flex"
				flexDirection="column"
				rounded="md"
				w={72}
			>
				<form onSubmit={formik.handleSubmit}>
					<VStack padding="2" align="flex-start">
						<Field.Root
							required
							invalid={!!formik.errors.username && formik.touched.username}
						>
							<Field.Label htmlFor="username">
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
							/>
							<Field.ErrorText>{formik.errors.username}</Field.ErrorText>
						</Field.Root>
						<Field.Root
							required
							invalid={!!formik.errors.password && formik.touched.password}
							marginTop="2"
						>
							<Field.Label htmlFor="password">Password</Field.Label>
							<Input
								id="password"
								name="password"
								type="password"
								value={formik.values.password}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
							/>
							<Field.ErrorText>{formik.errors.password}</Field.ErrorText>
						</Field.Root>
						<Checkbox.Root
							marginTop="2"
							id="rememberMe"
							name="rememberMe"
							checked={formik.values.rememberMe}
							onCheckedChange={formik.handleChange}
						>
							<Checkbox.HiddenInput />
							<Checkbox.Control />
							<Checkbox.Label>Remember Me</Checkbox.Label>
						</Checkbox.Root>
						<Button marginTop={4} type="submit" width="full">
							Login
						</Button>
					</VStack>
				</form>
			</Box>
		</Container>
	);
};

export default Login;
