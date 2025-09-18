import { Box, HStack, Image, Container, useBreakpointValue } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import logo from "../../assets/icons8-movie-64.webp";
import { COLORS } from "@/constants/theme";
import { ROUTES } from "@/constants/routes";
import NavBarUserMenu from "./NavBarUserMenu";
import NavBarSearch from "./NavBarSearch";
import MobileMenuButton from "./MobileMenuButton";

// Reusable Logo and Title Component
const LogoAndTitle = () => (
	<Link to={ROUTES.HOME} style={{ textDecoration: "none" }}>
		<HStack gap={3} alignItems="center">
			<Image
				src={logo}
				boxSize="60px"
				cursor="pointer"
				transition="all 0.2s"
				alt="CineXplorer Logo"
				_hover={{
					transform: "scale(1.05)",
					filter:
						"brightness(1.1) drop-shadow(0 0 8px rgba(99, 179, 237, 0.3))",
				}}
				_active={{
					transform: "scale(0.95)",
				}}
			/>
			<Box
				as="span"
				fontSize="3xl"
				fontWeight="bold"
				color={COLORS.text.main}
				cursor="pointer"
				transition="all 0.2s"
				position="relative"
				_hover={{
					color: COLORS.accent.primary,
					transform: "scale(1.02)",
					textShadow: "0 0 8px rgba(99, 179, 237, 0.3)",
					_after: {
						width: "100%",
					},
				}}
				_active={{
					transform: "scale(0.98)",
				}}
				_after={{
					content: '""',
					position: "absolute",
					bottom: "-2px",
					left: "50%",
					transform: "translateX(-50%)",
					width: "0%",
					height: "2px",
					backgroundColor: COLORS.accent.primary,
					transition: "width 0.3s ease",
					borderRadius: "1px",
				}}
			>
				CineXplorer
			</Box>
		</HStack>
	</Link>
);

const NavBar = () => {
	// Show hamburger menu on mobile, logo on left for desktop
	const isMobile = useBreakpointValue({ base: true, lg: false }, { ssr: false }) ?? true;

	return (
		<Box
			w="100%"
			bg={COLORS.background.navBar}
			position="sticky"
			top={0}
			zIndex={10}
			boxShadow="base"
			borderBottom="1px solid"
			borderColor={COLORS.border.main}
		>
			<Container maxW="container.xl" px={{ base: 2, md: 6, lg: 8 }} w="100%">
				<HStack justifyContent="space-between" py={2} position="relative">
					{isMobile ? (
						/* Mobile Layout: Hamburger - Logo/Title - User Controls */
						<>
							{/* Left - Hamburger Menu */}
							<Box>
								<MobileMenuButton size="sm" />
							</Box>

							{/* Center - Logo and Title */}
							<LogoAndTitle />
							
							{/* Right side - User controls */}
							<HStack gap={4} alignItems="center">
								<NavBarUserMenu />
							</HStack>
						</>
					) : (
						/* Desktop Layout: Logo on left, CineXplorer text centered, search and user controls on right */
						<>
							{/* Left - Logo only */}
							<Link to={ROUTES.HOME} style={{ textDecoration: "none" }}>
								<Image
									src={logo}
									boxSize="60px"
									cursor="pointer"
									transition="all 0.2s"
									alt="CineXplorer Logo"
									_hover={{
										transform: "scale(1.05)",
										filter:
											"brightness(1.1) drop-shadow(0 0 8px rgba(99, 179, 237, 0.3))",
									}}
									_active={{
										transform: "scale(0.95)",
									}}
								/>
							</Link>
							
							{/* Center - CineXplorer text only */}
							<Box position="absolute" left="50%" transform="translateX(-50%)">
								<Link to={ROUTES.HOME} style={{ textDecoration: "none" }}>
									<Box
										as="span"
										fontSize="3xl"
										fontWeight="bold"
										color={COLORS.text.main}
										cursor="pointer"
										transition="all 0.2s"
										position="relative"
										_hover={{
											color: COLORS.accent.primary,
											transform: "scale(1.02)",
											textShadow: "0 0 8px rgba(99, 179, 237, 0.3)",
											_after: {
												width: "100%",
											},
										}}
										_active={{
											transform: "scale(0.98)",
										}}
										_after={{
											content: '""',
											position: "absolute",
											bottom: "-2px",
											left: "50%",
											transform: "translateX(-50%)",
											width: "0%",
											height: "2px",
											backgroundColor: COLORS.accent.primary,
											transition: "width 0.3s ease",
											borderRadius: "1px",
										}}
									>
										CineXplorer
									</Box>
								</Link>
							</Box>
							
							{/* Right side - Search and User controls */}
							<HStack gap={4} alignItems="center">
								<NavBarSearch />
								<NavBarUserMenu />
							</HStack>
						</>
					)}
				</HStack>
			</Container>
		</Box>
	);
};

export default NavBar;
