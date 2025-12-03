import { Box, Button } from "@chakra-ui/react";
import { FiX } from "react-icons/fi";
import type { BrowseParams } from "@/types/browseTypes";

interface ClearFiltersButtonProps {
  filters: BrowseParams;
  onClearFilters: () => void;
  showAdvanced: boolean;
}

const ClearFiltersButton = ({
  filters,
  onClearFilters,
  showAdvanced,
}: ClearFiltersButtonProps) => {
  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.minYear !== "" ||
    filters.maxYear !== "" ||
    filters.minRuntime !== "" ||
    filters.maxRuntime !== "" ||
    filters.language !== "";

  return (
    <Box
      position="absolute"
      bottom="-28px" // Position it below the dropdowns
      left="0"
      right="0"
      height="25px"
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Button
        onClick={onClearFilters}
        size="xs"
        variant="ghost"
        color="destructive"
        _hover={{ bg: "tertiary/8", color: "destructive" }}
        fontSize="xs"
        visibility={
          hasActiveFilters && !showAdvanced ? "visible" : "hidden"
        }
        opacity={hasActiveFilters && !showAdvanced ? 1 : 0}
        transition="visibility 0s, opacity 0.2s ease-in-out"
        mt={4} // Nudge the button down further
      >
        <FiX style={{ marginRight: "4px" }} />
        Clear filters
      </Button>
    </Box>
  );
};

export default ClearFiltersButton;
