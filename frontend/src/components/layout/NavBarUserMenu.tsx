import {
	Button,
	Text,
	Menu,
	MenuItem,
	Avatar,
	HStack,
	MenuTrigger,
	MenuContent,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import useAuthContext from "@/hooks/useAuthContext";

const NavBarUserMenu = () => {
	const { isAuthenticated, logout, user } = useAuthContext() ?? {};
	const navigate = useNavigate();

	if (!isAuthenticated) {
		return (
			<Link to={ROUTES.LOGIN} style={{ textDecoration: "none" }}>
				<Button size="sm" variant="outline">
					Login
				</Button>
			</Link>
		);
	}
	return (
		<Menu.Root>
			<MenuTrigger as={Button}>
				<HStack gap={2}>
					<Text fontWeight="bold">{user?.username}</Text>
					<Avatar.Root size="xs">
						{/* <Avatar.Image src={user?.avatarUrl} alt={user?.username} /> */}
						<Avatar.Fallback>{user?.username?.charAt(0)}</Avatar.Fallback>
					</Avatar.Root>
				</HStack>
			</MenuTrigger>
			<MenuContent>
				<MenuItem value="profile">
					<Link to={ROUTES.PROFILE} style={{ textDecoration: "none" }}>
						Profile
					</Link>
				</MenuItem>
				<MenuItem value="settings">
					<Link to={ROUTES.SETTINGS} style={{ textDecoration: "none" }}>
						Settings
					</Link>
				</MenuItem>
				<MenuItem
					value="logout"
					onClick={() => {
						if (logout) {
							logout();
						}
						navigate(ROUTES.HOME);
					}}
				>
					Logout
				</MenuItem>
			</MenuContent>
		</Menu.Root>
	);
};

export default NavBarUserMenu;
