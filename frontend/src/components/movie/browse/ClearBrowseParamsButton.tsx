import { Box, Button } from "@chakra-ui/react";
import { FiX } from "react-icons/fi";
import type { BrowseParams } from "@/types/browseTypes";

interface ClearBrowseParamsButtonProps {
  browseParams: BrowseParams;
  onClear: () => void;
  isAdvancedOpen: boolean;
}

const ClearBrowseParamsButton = ({
  browseParams,
  onClear,
  isAdvancedOpen,
}: ClearBrowseParamsButtonProps) => {
  const hasActiveParams =
    browseParams.genres.length > 0 ||
    browseParams.minYear !== "" ||
    browseParams.maxYear !== "" ||
    browseParams.minRuntime !== "" ||
    browseParams.maxRuntime !== "" ||
    browseParams.language !== "";

  return (
    <Box
      position="absolute"
      bottom="-28px"
      left="0"
      right="0"
      height="25px"
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Button
        onClick={onClear}
        size="xs"
        variant="ghost"
        color="destructive"
        _hover={{ bg: "tertiary/8", color: "destructive" }}
        fontSize="xs"
        visibility={
          hasActiveParams && !isAdvancedOpen ? "visible" : "hidden"
        }
        opacity={hasActiveParams && !isAdvancedOpen ? 1 : 0}
        transition="visibility 0s, opacity 0.2s ease-in-out"
        mt={4}
      >
        <FiX style={{ marginRight: "4px" }} />
        Clear filters
      </Button>
    </Box>
  );
};

export default ClearBrowseParamsButton;
