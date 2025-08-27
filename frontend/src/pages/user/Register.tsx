import { ROUTES } from "@/constants/routes";
import { Box, Button, Container, Field, Input, VStack } from "@chakra-ui/react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import useAuthContext from "@/hooks/useAuthContext";

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
							invalid={!!formik.errors.email && formik.touched.email}
						>
							<Field.Label htmlFor="email">Email Address</Field.Label>
							<Input
								autoFocus
								id="email"
								name="email"
								type="text"
								value={formik.values.email}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
							/>
							<Field.ErrorText>{formik.errors.email}</Field.ErrorText>
						</Field.Root>
						<Field.Root
							required
							invalid={!!formik.errors.username && formik.touched.username}
						>
							<Field.Label htmlFor="username">CineXplorer Username</Field.Label>
							<Input
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

						<Button marginTop={4} type="submit" width="full">
							Register
						</Button>
					</VStack>
				</form>
			</Box>
		</Container>
	);
};

export default Register;
