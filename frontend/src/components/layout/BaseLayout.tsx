import NavBar from "./NavBar";
import Footer from "./Footer";
import { Box } from "@chakra-ui/react";
import { type ReactNode } from "react";

interface BaseLayoutProps {
	children: ReactNode;
}

const BaseLayout = ({ children }: BaseLayoutProps) => {
	return (
		<Box
			minH="100vh"
			display="flex"
			flexDirection="column"
			bg="background.main"
		>
			{/* NavBar */}
			<NavBar />

			{/* Main Content Area - Customizable */}
			{children}

			{/* Footer */}
			<Footer />
		</Box>
	);
};

export default BaseLayout;
