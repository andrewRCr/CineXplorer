import { useEffect, useState } from "react";
import { Grid, GridItem, Show, useBreakpointValue } from "@chakra-ui/react";
import useUser from "./hooks/useUser";
import { CanceledError } from "./services/apiClient";
import userService, { type User } from "./services/userService";
import "./App.css";
import NavBar from "./components/NavBar";

function App() {
	const showSidebar = useBreakpointValue({
		base: false,
		lg: true,
	});

	//const { user, error, setUser, setError } = useUser();

	// const requestCreateUser = (newUser: User) => {
	// 	userService.create(newUser).catch((err) => {
	// 		if (err instanceof CanceledError) return;
	// 		setError(err.message);
	// 	});
	// };
	// const requestUpdateCurrentUser = (updatedUser: User) => {
	// 	userService.update(updatedUser).catch((err) => {
	// 		if (err instanceof CanceledError) return;
	// 		setError(err.message);
	// 	});
	// };
	// return (
	// 	<>
	// 		{error && <p className="text-danger">{error}</p>}
	// 		<ul>{user && <li key={user.id}>{user.username}</li>}</ul>
	// 		<Button>click me</Button>
	// 	</>
	// );

	return (
		<Grid
			templateAreas={{
				base: `"nav" "main"`,
				lg: `"nav nav" "sidebar main"`,
			}}
		>
			<GridItem area="nav" bg="gray">
				<NavBar />
			</GridItem>
			<Show when={showSidebar}>
				<GridItem area="sidebar" bg="goldenrod">
					Sidebar
				</GridItem>
			</Show>
			<GridItem area="main" bg="dodgerblue">
				Main
			</GridItem>
		</Grid>
	);
}

export default App;
