import { Box } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

interface PageHeaderProps {
	title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => {
	return (
		<Box
			flexShrink={0}
			mb={6}
			minHeight="60px"
			display="flex"
			alignItems="flex-end"
			width="100%"
		>
			<Box
				fontSize="3xl"
				fontWeight="normal"
				fontStyle="italic"
				color={COLORS.text.main}
				textAlign="left"
				mb={1}
				position="relative"
				display="block"
			>
				{title}
				<Box
					position="absolute"
					bottom="-2px"
					left="0"
					right="0"
					height="2px"
					backgroundColor={COLORS.accent.primary}
					borderRadius="1px"
				/>
			</Box>
		</Box>
	);
};

export default PageHeader;