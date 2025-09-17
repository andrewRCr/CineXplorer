import { useState, useEffect, useCallback } from "react";
import { Box, Text, HStack, Input } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";
import { debounce } from "lodash";

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
	// Local state for immediate UI updates
	const [localMinRating, setLocalMinRating] = useState(minRating);
	const [localMaxRating, setLocalMaxRating] = useState(maxRating);
	
	// Sync local state when props change (convert from TMDB 0-10 to percentage 0-100)
	useEffect(() => {
		const percentage = minRating ? (Math.round(parseFloat(minRating) * 10 * 100) / 100).toString() : "";
		setLocalMinRating(percentage);
	}, [minRating]);
	
	useEffect(() => {
		const percentage = maxRating ? (Math.round(parseFloat(maxRating) * 10 * 100) / 100).toString() : "";
		setLocalMaxRating(percentage);
	}, [maxRating]);
	
	// Validate rating input (0-100 percentage scale for user-friendliness)
	const isValidRating = (rating: string): boolean => {
		if (!rating) return true; // Empty is valid (clears filter)
		const num = parseFloat(rating);
		return !isNaN(num) && num >= 0 && num <= 100;
	};
	
	// Check if min/max relationship is logical
	const hasLogicalRange = (): boolean => {
		if (!localMinRating || !localMaxRating) return true;
		const min = parseFloat(localMinRating);
		const max = parseFloat(localMaxRating);
		return min <= max;
	};

	// Clamp rating to valid bounds for better UX
	const clampRating = (rating: string): string => {
		if (!rating) return rating; // Keep empty values
		const num = parseFloat(rating);
		if (isNaN(num)) {
			// For non-numeric values, clamp to 0
			return "0";
		}
		// Clamp numeric values to valid range
		if (num < 0) return "0";
		if (num > 100) return "100";
		return Math.round(num).toString(); // Round to whole number for cleaner UX
	};
	
	// Debounced update functions with validation and conversion
	const debouncedMinRatingUpdate = useCallback(
		debounce((rating: string) => {
			if (isValidRating(rating)) {
				// Convert percentage (0-100) to TMDB scale (0-10)
				const tmdbRating = (parseFloat(rating) / 10).toString();
				onMinRatingChange(tmdbRating);
			}
		}, 300), // Shorter debounce for ratings since they're typically single digits
		[onMinRatingChange]
	);
	
	const debouncedMaxRatingUpdate = useCallback(
		debounce((rating: string) => {
			if (isValidRating(rating)) {
				// Convert percentage (0-100) to TMDB scale (0-10)
				const tmdbRating = (parseFloat(rating) / 10).toString();
				onMaxRatingChange(tmdbRating);
			}
		}, 300),
		[onMaxRatingChange]
	);
	
	// Handle input changes
	const handleMinRatingChange = (value: string) => {
		setLocalMinRating(value);
		
		if (value === "") {
			debouncedMinRatingUpdate.cancel();
			onMinRatingChange("");
		} else {
			debouncedMinRatingUpdate(value);
		}
	};
	
	const handleMaxRatingChange = (value: string) => {
		setLocalMaxRating(value);
		
		// For rating, max is typically 100% (implicit) unless user specifically wants a range
		if (value === "") {
			debouncedMaxRatingUpdate.cancel();
			onMaxRatingChange("");
		} else {
			debouncedMaxRatingUpdate(value);
		}
	};

	// Handle blur events to clamp invalid values for better UX
	const handleMinRatingBlur = () => {
		if (localMinRating && !isValidRating(localMinRating)) {
			const clampedValue = clampRating(localMinRating);
			setLocalMinRating(clampedValue);
			// Cancel any pending debounced update and send the clamped value immediately
			debouncedMinRatingUpdate.cancel();
			if (clampedValue && isValidRating(clampedValue)) {
				// Convert percentage (0-100) to TMDB scale (0-10)
				const tmdbRating = (parseFloat(clampedValue) / 10).toString();
				onMinRatingChange(tmdbRating);
			}
		}
	};

	const handleMaxRatingBlur = () => {
		if (localMaxRating && !isValidRating(localMaxRating)) {
			const clampedValue = clampRating(localMaxRating);
			setLocalMaxRating(clampedValue);
			// Cancel any pending debounced update and send the clamped value immediately
			debouncedMaxRatingUpdate.cancel();
			if (clampedValue && isValidRating(clampedValue)) {
				// Convert percentage (0-100) to TMDB scale (0-10)
				const tmdbRating = (parseFloat(clampedValue) / 10).toString();
				onMaxRatingChange(tmdbRating);
			}
		}
	};

	// Cleanup debounced functions on unmount
	useEffect(() => {
		return () => {
			debouncedMinRatingUpdate.cancel();
			debouncedMaxRatingUpdate.cancel();
		};
	}, [debouncedMinRatingUpdate, debouncedMaxRatingUpdate]);
	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Rating (%)
			</Text>
			<HStack gap={2} align="center">
				<Input
					placeholder="0"
					value={localMinRating}
					onChange={(e) => handleMinRatingChange(e.target.value)}
					onBlur={handleMinRatingBlur}
					type="number"
					min="0"
					max="100"
					step="1"
					w="80px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
					borderColor={
						(localMinRating && !isValidRating(localMinRating)) || !hasLogicalRange()
							? "red.300"
							: "gray.200"
					}
					bg="transparent"
					_hover={{
						backgroundColor: COLORS.background.main,
					}}
					_invalid={{
						borderColor: "red.300",
						boxShadow: "0 0 0 1px red.300",
					}}
				/>
				<Text fontSize="sm" color={COLORS.text.secondary}>
					to
				</Text>
				<Input
					placeholder="100"
					value={localMaxRating}
					onChange={(e) => handleMaxRatingChange(e.target.value)}
					onBlur={handleMaxRatingBlur}
					type="number"
					min="0"
					max="100"
					step="1"
					w="80px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
					borderColor={
						(localMaxRating && !isValidRating(localMaxRating)) || !hasLogicalRange()
							? "red.300"
							: "gray.200"
					}
					bg="transparent"
					_hover={{
						backgroundColor: COLORS.background.main,
					}}
					_invalid={{
						borderColor: "red.300",
						boxShadow: "0 0 0 1px red.300",
					}}
				/>
			</HStack>
		</Box>
	);
};

export default RatingSelector;
