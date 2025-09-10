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
			<HStack gap={2}>
				<Input
					placeholder="Min"
					value={minRating}
					onChange={(e) => onMinRatingChange(e.target.value)}
					type="number"
					min="0"
					max="10"
					step="0.1"
					size="sm"
					borderColor={COLORS.border.main}
					_focus={{
						borderColor: COLORS.accent.primary,
						boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
					}}
					_hover={{
						borderColor: COLORS.accent.secondary,
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
					size="sm"
					borderColor={COLORS.border.main}
					_focus={{
						borderColor: COLORS.accent.primary,
						boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
					}}
					_hover={{
						borderColor: COLORS.accent.secondary,
					}}
				/>
			</HStack>
		</Box>
	);
};

export default RatingSelector;
