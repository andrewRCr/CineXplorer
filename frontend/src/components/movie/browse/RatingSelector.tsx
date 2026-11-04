import { useEffect, useMemo } from "react";
import { Box, Text, HStack } from "@chakra-ui/react";
import { StyledInput } from "@/components/common";
import { debounce } from "lodash";
import useInputDraft from "@/hooks/useInputDraft";

interface RatingSelectorProps {
  minRating: string;
  maxRating: string;
  onMinRatingChange: (rating: string) => void;
  onMaxRatingChange: (rating: string) => void;
}

// Validate rating input (0-10 TMDB scale with decimals)
const isValidRating = (rating: string): boolean => {
  if (!rating) return true; // Empty is valid (clears filter)
  const num = parseFloat(rating);
  // Allow 1-3 characters max (e.g., "7", "7.5", "10")
  // This prevents excessive decimal places like "7.123"
  if (rating.length > 3) return false;
  return !isNaN(num) && num >= 0 && num <= 10;
};

const RatingSelector = ({
  minRating,
  maxRating,
  onMinRatingChange,
  onMaxRatingChange,
}: RatingSelectorProps) => {
  const [localMinRating, setLocalMinRating] = useInputDraft(minRating);
  const [localMaxRating, setLocalMaxRating] = useInputDraft(maxRating);

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
  const debouncedMinRatingUpdate = useMemo(
    () =>
      debounce((rating: string) => {
        if (isValidRating(rating)) {
          onMinRatingChange(rating);
        }
      }, 500), // Consistent with YearSelector debounce
    [onMinRatingChange],
  );

  const debouncedMaxRatingUpdate = useMemo(
    () =>
      debounce((rating: string) => {
        if (isValidRating(rating)) {
          onMaxRatingChange(rating);
        }
      }, 500),
    [onMaxRatingChange],
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
      if (
        clampedValue === "" ||
        (clampedValue && isValidRating(clampedValue))
      ) {
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
      if (
        clampedValue === "" ||
        (clampedValue && isValidRating(clampedValue))
      ) {
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
        Average Rating
      </Text>
      <HStack gap={2} align="center">
        <StyledInput
          layer="01"
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
          // Active filter indication: primary color when rating has value
          color={localMinRating ? "primary" : "foreground"}
          borderColor={
            (localMinRating && !isValidRating(localMinRating)) ||
            !hasLogicalRange()
              ? "destructive"
              : undefined
          }
          _invalid={{
            borderColor: "destructive",
            boxShadow: "0 0 0 1px var(--chakra-colors-destructive)",
          }}
        />
        <Text fontSize="sm" color="on-muted">
          to
        </Text>
        <StyledInput
          layer="01"
          placeholder="10"
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
          // Active filter indication: primary color when rating has value
          color={localMaxRating ? "primary" : "foreground"}
          borderColor={
            (localMaxRating && !isValidRating(localMaxRating)) ||
            !hasLogicalRange()
              ? "destructive"
              : undefined
          }
          _invalid={{
            borderColor: "destructive",
            boxShadow: "0 0 0 1px var(--chakra-colors-destructive)",
          }}
        />
      </HStack>
    </Box>
  );
};

export default RatingSelector;
