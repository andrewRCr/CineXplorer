import { useState, useEffect, useCallback } from "react";
import { Box, Text, HStack, Input } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";
import { debounce } from "lodash";

interface YearSelectorProps {
	minYear: string;
	maxYear: string;
	onMinYearChange: (year: string) => void;
	onMaxYearChange: (year: string) => void;
}

const YearSelector = ({
	minYear,
	maxYear,
	onMinYearChange,
	onMaxYearChange,
}: YearSelectorProps) => {
	// Use current year dynamically (will update on component re-render)
	const currentYear = new Date().getFullYear();

	// Local state for immediate UI updates
	const [localMinYear, setLocalMinYear] = useState(minYear);
	const [localMaxYear, setLocalMaxYear] = useState(maxYear);

	// Sync local state when props change (e.g., from URL or external updates)
	useEffect(() => {
		setLocalMinYear(minYear);
	}, [minYear]);

	useEffect(() => {
		setLocalMaxYear(maxYear);
	}, [maxYear]);

	// Validate year input
	const isValidYear = (year: string): boolean => {
		if (!year) return true; // Empty is valid (clears filter)
		const num = parseInt(year, 10);
		return (
			!isNaN(num) && year.length === 4 && num >= 1900 && num <= currentYear
		);
	};

	// Debounced update functions - only call parent when we have valid input
	const debouncedMinYearUpdate = useCallback(
		debounce((year: string) => {
			if (isValidYear(year)) {
				onMinYearChange(year);
			}
		}, 500),
		[onMinYearChange, currentYear]
	);

	const debouncedMaxYearUpdate = useCallback(
		debounce((year: string) => {
			if (isValidYear(year)) {
				onMaxYearChange(year);
			}
		}, 500),
		[onMaxYearChange, currentYear]
	);

	// Handle input changes
	const handleMinYearChange = (value: string) => {
		setLocalMinYear(value);

		// If empty, update immediately to clear filter
		if (value === "") {
			debouncedMinYearUpdate.cancel();
			onMinYearChange("");
		} else {
			// Otherwise, debounce the update
			debouncedMinYearUpdate(value);
		}
	};

	const handleMaxYearChange = (value: string) => {
		setLocalMaxYear(value);

		// If empty, update immediately to clear filter
		if (value === "") {
			debouncedMaxYearUpdate.cancel();
			onMaxYearChange("");
		} else {
			// Otherwise, debounce the update
			debouncedMaxYearUpdate(value);
		}
	};

	// Cleanup debounced functions on unmount
	useEffect(() => {
		return () => {
			debouncedMinYearUpdate.cancel();
			debouncedMaxYearUpdate.cancel();
		};
	}, [debouncedMinYearUpdate, debouncedMaxYearUpdate]);

	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Release Year
			</Text>
			<HStack gap={2} align="center">
				<Input
					placeholder="1900"
					value={localMinYear}
					onChange={(e) => handleMinYearChange(e.target.value)}
					type="number"
					min="1900"
					max={currentYear}
					w="100px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
					borderColor={
						localMinYear && !isValidYear(localMinYear) ? "red.300" : "gray.200"
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
					placeholder={currentYear.toString()}
					value={localMaxYear}
					onChange={(e) => handleMaxYearChange(e.target.value)}
					type="number"
					min="1900"
					max={currentYear}
					w="100px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
					borderColor={
						localMaxYear && !isValidYear(localMaxYear) ? "red.300" : "gray.200"
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

export default YearSelector;
