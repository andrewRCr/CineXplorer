import {
	Box,
	Button,
	Checkbox,
	Field,
	Flex,
	Input,
	VStack,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import useAuthServiceContext from "@/hooks/useAuthServiceContext";

const Login = () => {
	const authContext = useAuthServiceContext();
	const login = authContext?.login;
	const navigate = useNavigate();
	const formik = useFormik({
		initialValues: {
			username: "",
			password: "",
			rememberMe: false,
		},
		onSubmit: async (values) => {
			// Handle login logic here
			const { username, password } = values;
			if (login) {
				const response = await login(username, password);
				if (response instanceof Error) {
					console.error("Login failed:", response);
					return;
				} else {
					navigate("/browse");
				}
			}
		},
	});

	return (
		<Flex bg="transparent" align="center" justify="center" h="85vh">
			<Box bg="gray" p={4} rounded="md" w={72}>
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
								id="username"
								name="username"
								type="text"
								onChange={formik.handleChange}
								value={formik.values.username}
							/>
						</Field.Root>
						<Field.Root
							required
							invalid={!!formik.errors.password && formik.touched.password}
						>
							<Field.Label htmlFor="password">Password</Field.Label>
							<Input
								id="password"
								name="password"
								type="password"
								value={formik.values.password}
								onChange={formik.handleChange}
							/>
						</Field.Root>
						<Checkbox.Root
							id="rememberMe"
							name="rememberMe"
							checked={formik.values.rememberMe}
							onCheckedChange={formik.handleChange}
						>
							<Checkbox.HiddenInput />
							<Checkbox.Control />
							<Checkbox.Label>Remember Me</Checkbox.Label>
						</Checkbox.Root>
						<Button type="submit" width="full">
							Login
						</Button>
					</VStack>
				</form>
			</Box>
		</Flex>
	);
};

export default Login;
