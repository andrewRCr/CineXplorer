import { Box, Text, VStack, Spinner } from "@chakra-ui/react";

const LoadingLayout = () => {
	return (
		<Box
			minH="100vh"
			display="flex"
			flexDirection="column"
			bg="background.main"
		>
			{/* Minimal loading - just spinner, no NavBar/Footer */}
			<Box flex="1" display="flex" alignItems="center" justifyContent="center">
				<VStack gap={4}>
					<Spinner size="xl" color="accent.primary" />
					<Text fontSize="lg" color="text.main">
						Loading...
					</Text>
				</VStack>
			</Box>
		</Box>
	);
};

export default LoadingLayout;
