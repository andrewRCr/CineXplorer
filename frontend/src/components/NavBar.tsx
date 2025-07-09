import React from "react";
import { HStack, Image, Text } from "@chakra-ui/react";
import logo from "../assets/icons8-movie-64.webp";
import { ColorModeButton } from "./ui/color-mode";

const NavBar = () => {
	return (
		<HStack justifyContent="space-between" padding="10px">
			<Image src={logo} boxSize="60px" />
			<Text fontSize="2xl" fontWeight="bold" color="white">
				CineXplorer
			</Text>
			<ColorModeButton aria-label="Toggle color mode" />
		</HStack>
	);
};

export default NavBar;
