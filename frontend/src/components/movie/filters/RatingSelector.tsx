import { Box, Text, HStack, Input } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

interface RatingSelectorProps {
	minRating: string;
	maxRating: string;
	onMinRatingChange: (rating: string) => void;
	onMaxRatingChange: (rating: string) => void;
}

const RatingSelector = ({
	minRating,
	maxRating,
	onMinRatingChange,
	onMaxRatingChange,
}: RatingSelectorProps) => {
	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Rating
			</Text>
			<HStack gap={2} align="center">
				<Input
					placeholder="Min"
					value={minRating}
					onChange={(e) => onMinRatingChange(e.target.value)}
					type="number"
					min="0"
					max="10"
					step="0.1"
					w="80px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
					borderColor="gray.200"
					bg="transparent"
					_hover={{
						backgroundColor: COLORS.background.main,
					}}
				/>
				<Text fontSize="sm" color={COLORS.text.secondary}>
					to
				</Text>
				<Input
					placeholder="Max"
					value={maxRating}
					onChange={(e) => onMaxRatingChange(e.target.value)}
					type="number"
					min="0"
					max="10"
					step="0.1"
					w="80px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
					borderColor="gray.200"
					bg="transparent"
					_hover={{
						backgroundColor: COLORS.background.main,
					}}
				/>
			</HStack>
		</Box>
	);
};

export default RatingSelector;
