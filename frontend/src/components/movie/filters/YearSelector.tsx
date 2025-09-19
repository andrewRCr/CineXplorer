import { useState, useEffect, useCallback } from "react";
import { Box, Text, HStack, Input } from "@chakra-ui/react";
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
	// Clamp invalid values for better UX
	useEffect(() => {
		setLocalMinYear(clampYear(minYear));
	}, [minYear, currentYear]);

	useEffect(() => {
		setLocalMaxYear(clampYear(maxYear));
	}, [maxYear, currentYear]);

	// Validate year input
	const isValidYear = (year: string): boolean => {
		if (!year) return true; // Empty is valid (clears filter)
		const num = parseInt(year, 10);
		return (
			!isNaN(num) && year.length === 4 && num >= 1900 && num <= currentYear
		);
	};

	// Clamp year to valid bounds for better UX
	const clampYear = (year: string): string => {
		if (!year) return year; // Keep empty values
		const num = parseInt(year, 10);
		if (isNaN(num)) {
			// For non-numeric values, clamp to closest valid year
			return "1900"; // Default to earliest valid year
		}
		// Clamp numeric values to valid range
		if (num < 1900) return "1900";
		if (num > currentYear) return currentYear.toString();
		return year; // Already valid
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

	// Handle blur events to clamp invalid values for better UX
	const handleMinYearBlur = () => {
		if (localMinYear && !isValidYear(localMinYear)) {
			const clampedValue = clampYear(localMinYear);
			setLocalMinYear(clampedValue);
			// Cancel any pending debounced update and send the clamped value immediately
			debouncedMinYearUpdate.cancel();
			if (clampedValue && isValidYear(clampedValue)) {
				onMinYearChange(clampedValue);
			}
		}
	};

	const handleMaxYearBlur = () => {
		if (localMaxYear && !isValidYear(localMaxYear)) {
			const clampedValue = clampYear(localMaxYear);
			setLocalMaxYear(clampedValue);
			// Cancel any pending debounced update and send the clamped value immediately
			debouncedMaxYearUpdate.cancel();
			if (clampedValue && isValidYear(clampedValue)) {
				onMaxYearChange(clampedValue);
			}
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
			<Text fontSize="sm" fontWeight="medium" mb={2} color="text.main">
				Release Year
			</Text>
			<HStack gap={2} align="center">
				<Input
					placeholder="1900"
					value={localMinYear}
					onChange={(e) => handleMinYearChange(e.target.value)}
					onBlur={handleMinYearBlur}
					type="number"
					min="1900"
					max={currentYear}
					w="100px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
				borderColor={
					localMinYear && !isValidYear(localMinYear) ? "red.300" : "border.separator"
				}
				bg="transparent"
				_hover={{
					backgroundColor: "background.main",
				}}
					_invalid={{
						borderColor: "red.300",
						boxShadow: "0 0 0 1px red.300",
					}}
				/>
			<Text fontSize="sm" color="text.secondary">
				to
			</Text>
				<Input
					placeholder={currentYear.toString()}
					value={localMaxYear}
					onChange={(e) => handleMaxYearChange(e.target.value)}
					onBlur={handleMaxYearBlur}
					type="number"
					min="1900"
					max={currentYear}
					w="100px"
					h="32px"
					minH="32px"
					fontSize="14px"
					borderRadius="4px"
				borderColor={
					localMaxYear && !isValidYear(localMaxYear) ? "red.300" : "border.separator"
				}
				bg="transparent"
				_hover={{
					backgroundColor: "background.main",
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
