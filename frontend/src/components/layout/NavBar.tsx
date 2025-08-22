import { Button, HStack, Image, Text } from "@chakra-ui/react";
import logo from "../../assets/icons8-movie-64.webp";
import { BsFillPlusCircleFill } from "react-icons/bs";

const NavBar = () => {
	return (
		<HStack justifyContent="space-between" padding="10px">
			<Image src={logo} boxSize="60px" />
			<Text fontSize="3xl" fontWeight="bold" color="white">
				CineXplorer
			</Text>

			<HStack justifyContent="right">
				<Button size="sm" p={2} variant="solid" colorPalette="green">
					<BsFillPlusCircleFill size="md" />
					<Text fontWeight={"bold"} mb="0.25" ml="-0.5">
						LOG
					</Text>
				</Button>
				{/* <ColorModeButton aria-label="Toggle color mode" /> */}
			</HStack>
		</HStack>
	);
};

export default NavBar;
