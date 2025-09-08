import { Box, Button, HStack, Image, Text, Container } from "@chakra-ui/react";
import logo from "../../assets/icons8-movie-64.webp";
import { BsFillPlusCircleFill } from "react-icons/bs";
import { COLORS } from "@/constants/theme";
import NavBarUserMenu from "./NavBarUserMenu";

const NavBar = () => (
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
			<HStack justifyContent="space-between" py={2}>
				<Image src={logo} boxSize="60px" />
				<Text fontSize="3xl" fontWeight="bold" color={COLORS.text.main}>
					CineXplorer
				</Text>
				<HStack>
					<NavBarUserMenu />
					<Button size="sm" p={2} variant="solid" colorScheme="green">
						<BsFillPlusCircleFill size={16} />
						<Text fontWeight="bold" mb="0.25" ml="-0.5">
							LOG
						</Text>
					</Button>
				</HStack>
			</HStack>
		</Container>
	</Box>
);

export default NavBar;
