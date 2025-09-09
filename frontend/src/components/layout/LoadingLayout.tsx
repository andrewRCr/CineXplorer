import { COLORS } from "@/constants/theme";
import { Box, Text, VStack, Spinner } from "@chakra-ui/react";

const LoadingLayout = () => {
	return (
		<Box
			minH="100vh"
			display="flex"
			flexDirection="column"
			bg={COLORS.background.main}
		>
			{/* Minimal loading - just spinner, no NavBar/Footer */}
			<Box flex="1" display="flex" alignItems="center" justifyContent="center">
				<VStack gap={4}>
					<Spinner size="xl" color={COLORS.accent.primary} />
					<Text fontSize="lg" color={COLORS.text.main}>
						Loading...
					</Text>
				</VStack>
			</Box>
		</Box>
	);
};

export default LoadingLayout;
