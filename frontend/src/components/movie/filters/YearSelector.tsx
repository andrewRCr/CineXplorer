import { useState, useEffect, useCallback } from "react";
import { Box, Text, HStack, Input } from "@chakra-ui/react";
import { debounce } from "lodash";

interface YearSelectorProps {
  minYear: string;
  maxYear: string;
  onMinYearChange: (year: string) => void;
  onMaxYearChange: (year: string) => void;
  pageSource?: string;
}

const YearSelector = ({
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
  pageSource,
}: YearSelectorProps) => {
  // Use current year dynamically (will update on component re-render)
  const currentYear = new Date().getFullYear();

  // Check if year filter should be disabled due to route constraints
  const isRouteConstrained = pageSource === "now-playing" || pageSource === "upcoming";

  // Calculate date range for route-constrained pages
  const getDateRangeInfo = () => {
    if (!isRouteConstrained) {
      return { text: "", startPlaceholder: "1900", endPlaceholder: currentYear.toString() };
    }

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    if (pageSource === "now-playing") {
      // Now Playing: today - 30 days to today + 5 days
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 5);
      return {
        text: `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`,
        startPlaceholder: startDate.getFullYear().toString(),
        endPlaceholder: endDate.getFullYear().toString(),
      };
    } else if (pageSource === "upcoming") {
      // Upcoming: today + 5 days to today + 65 days
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 5);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 65);
      return {
        text: `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`,
        startPlaceholder: startDate.getFullYear().toString(),
        endPlaceholder: endDate.getFullYear().toString(),
      };
    }

    return { text: "", startPlaceholder: "1900", endPlaceholder: currentYear.toString() };
  };

  const dateRangeInfo = getDateRangeInfo();

  // Local state for immediate UI updates
  const [localMinYear, setLocalMinYear] = useState(minYear);
  const [localMaxYear, setLocalMaxYear] = useState(maxYear);

  // Clamp year to valid bounds for better UX
  const clampYear = useCallback((year: string): string => {
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
  }, [currentYear]);

  // Sync local state when props change (e.g., from URL or external updates)
  // Clamp invalid values for better UX
  useEffect(() => {
    setLocalMinYear(clampYear(minYear));
  }, [minYear, currentYear, clampYear]);

  useEffect(() => {
    setLocalMaxYear(clampYear(maxYear));
  }, [maxYear, currentYear, clampYear]);

  // Validate year input
  const isValidYear = (year: string): boolean => {
    if (!year) return true; // Empty is valid (clears filter)
    const num = parseInt(year, 10);
    return (
      !isNaN(num) && year.length === 4 && num >= 1900 && num <= currentYear
    );
  };


  // Debounced update functions - only call parent when we have valid input
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedMinYearUpdate = useCallback(
    debounce((year: string) => {
      if (isValidYear(year)) {
        onMinYearChange(year);
      }
    }, 500),
    [onMinYearChange, currentYear] // debounce function dependencies cannot be analyzed by ESLint
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedMaxYearUpdate = useCallback(
    debounce((year: string) => {
      if (isValidYear(year)) {
        onMaxYearChange(year);
      }
    }, 500),
    [onMaxYearChange, currentYear] // debounce function dependencies cannot be analyzed by ESLint
  );

  // Handle input changes
  const handleMinYearChange = (value: string) => {
    // Prevent input beyond 4 characters
    if (value.length > 4) return;

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
    // Prevent input beyond 4 characters
    if (value.length > 4) return;

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

  const routeLabel =
    pageSource === "now-playing"
      ? "Now Playing"
      : pageSource === "upcoming"
      ? "Upcoming"
      : "";

  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
        Release Year
        {isRouteConstrained && (
          <Text as="span" color="muted-foreground" ml={1}>
            ({routeLabel})
          </Text>
        )}
      </Text>
      <HStack gap={2} align="center">
        <Input
          placeholder={dateRangeInfo.startPlaceholder}
          value={isRouteConstrained ? "" : localMinYear}
          onChange={(e) => handleMinYearChange(e.target.value)}
          onBlur={handleMinYearBlur}
          type="number"
          min="1900"
          max={currentYear}
          w="85px"
          h="32px"
          minH="32px"
          fontSize="14px"
          borderRadius="4px"
          borderColor={
            localMinYear && !isValidYear(localMinYear)
              ? "destructive"
              : "border"
          }
          bg="transparent"
          _hover={{
            bg: "accent/8",
          }}
          _invalid={{
            borderColor: "destructive",
            boxShadow: "0 0 0 1px red.300",
          }}
          disabled={isRouteConstrained}
          cursor={isRouteConstrained ? "not-allowed" : "text"}
        />
        <Text fontSize="sm" color="muted-foreground">
          to
        </Text>
        <Input
          placeholder={dateRangeInfo.endPlaceholder}
          value={isRouteConstrained ? "" : localMaxYear}
          onChange={(e) => handleMaxYearChange(e.target.value)}
          onBlur={handleMaxYearBlur}
          type="number"
          min="1900"
          max={currentYear}
          w="85px"
          h="32px"
          minH="32px"
          fontSize="14px"
          borderRadius="4px"
          borderColor={
            localMaxYear && !isValidYear(localMaxYear)
              ? "destructive"
              : "border"
          }
          bg="transparent"
          _hover={{
            bg: "accent/8",
          }}
          _invalid={{
            borderColor: "destructive",
            boxShadow: "0 0 0 1px red.300",
          }}
          disabled={isRouteConstrained}
          cursor={isRouteConstrained ? "not-allowed" : "text"}
        />
      </HStack>
      {isRouteConstrained && (
        <Text fontSize="xs" color="muted-foreground" mt={1}>
          Showing: {dateRangeInfo.text}
        </Text>
      )}
    </Box>
  );
};

export default YearSelector;
