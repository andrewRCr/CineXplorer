import { useState, useEffect, useCallback } from "react";
import { Box, Text, HStack, Input } from "@chakra-ui/react";
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

  // Sync local state when props change (no conversion needed - native 0-10 scale)
  useEffect(() => {
    setLocalMinRating(minRating);
  }, [minRating]);

  useEffect(() => {
    setLocalMaxRating(maxRating);
  }, [maxRating]);
  
  // Validate rating input (0-10 TMDB scale with decimals)
  const isValidRating = (rating: string): boolean => {
    if (!rating) return true; // Empty is valid (clears filter)
    const num = parseFloat(rating);
    // Allow 1-3 characters max (e.g., "7", "7.5", "10")
    // This prevents excessive decimal places like "7.123"
    if (rating.length > 3) return false;
    return !isNaN(num) && num >= 0 && num <= 10;
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
      // For non-numeric values, clear the field instead of setting to 0
      return "";
    }
    // Clamp numeric values to valid range (0-10 scale)
    if (num < 0) return "0";
    if (num > 10) return "10";
    // Round to 1 decimal place for cleaner UX
    return (Math.round(num * 10) / 10).toString();
  };
  
  // Debounced update functions with validation (no conversion needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedMinRatingUpdate = useCallback(
    debounce((rating: string) => {
      if (isValidRating(rating)) {
        onMinRatingChange(rating);
      }
    }, 500), // Consistent with YearSelector debounce
    [onMinRatingChange] // debounce function dependencies cannot be analyzed by ESLint
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedMaxRatingUpdate = useCallback(
    debounce((rating: string) => {
      if (isValidRating(rating)) {
        onMaxRatingChange(rating);
      }
    }, 500),
    [onMaxRatingChange] // debounce function dependencies cannot be analyzed by ESLint
  );
  
  // Handle input changes
  const handleMinRatingChange = (value: string) => {
    // Prevent input beyond 3 characters
    if (value.length > 3) return;

    setLocalMinRating(value);

    if (value === "") {
      debouncedMinRatingUpdate.cancel();
      onMinRatingChange("");
    } else {
      debouncedMinRatingUpdate(value);
    }
  };

  const handleMaxRatingChange = (value: string) => {
    // Prevent input beyond 3 characters
    if (value.length > 3) return;

    setLocalMaxRating(value);

    // If empty, update immediately to clear filter
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
      // Always update parent state, even if clamped to empty string
      // This ensures visual state matches filter state
      if (clampedValue === "" || (clampedValue && isValidRating(clampedValue))) {
        onMinRatingChange(clampedValue);
      }
    }
  };

  const handleMaxRatingBlur = () => {
    if (localMaxRating && !isValidRating(localMaxRating)) {
      const clampedValue = clampRating(localMaxRating);
      setLocalMaxRating(clampedValue);
      // Cancel any pending debounced update and send the clamped value immediately
      debouncedMaxRatingUpdate.cancel();
      // Always update parent state, even if clamped to empty string
      // This ensures visual state matches filter state
      if (clampedValue === "" || (clampedValue && isValidRating(clampedValue))) {
        onMaxRatingChange(clampedValue);
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
      <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
        Rating
      </Text>
      <HStack gap={2} align="center">
        <Input
          placeholder="0.0"
          value={localMinRating}
          onChange={(e) => handleMinRatingChange(e.target.value)}
          onBlur={handleMinRatingBlur}
          type="number"
          min="0"
          max="10"
          step="0.1"
          w="70px"
          h="32px"
          minH="32px"
          fontSize="14px"
          borderRadius="4px"
        borderColor={
          (localMinRating && !isValidRating(localMinRating)) || !hasLogicalRange()
            ? "destructive"
            : "border"
        }
        bg="transparent"
        _hover={{
          bg: "tertiary/8",
        }}
          _invalid={{
            borderColor: "destructive",
            boxShadow: "0 0 0 1px red.300",
          }}
        />
      <Text fontSize="sm" color="on-muted">
        to
      </Text>
        <Input
          placeholder="10.0"
          value={localMaxRating}
          onChange={(e) => handleMaxRatingChange(e.target.value)}
          onBlur={handleMaxRatingBlur}
          type="number"
          min="0"
          max="10"
          step="0.1"
          w="70px"
          h="32px"
          minH="32px"
          fontSize="14px"
          borderRadius="4px"
        borderColor={
          (localMaxRating && !isValidRating(localMaxRating)) || !hasLogicalRange()
            ? "destructive"
            : "border"
        }
        bg="transparent"
        _hover={{
          bg: "tertiary/8",
        }}
          _invalid={{
            borderColor: "destructive",
            boxShadow: "0 0 0 1px red.300",
          }}
        />
      </HStack>
    </Box>
  );
};

export default RatingSelector;
