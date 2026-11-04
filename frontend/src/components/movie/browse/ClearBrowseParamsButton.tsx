import { Box, Button } from "@chakra-ui/react";
import { FiX } from "react-icons/fi";
import type { BrowseParams } from "@/types/browseTypes";
import { hasActiveFilters } from "@/utilities/browseParamUtils";

interface ClearBrowseParamsButtonProps {
  browseParams: BrowseParams;
  onClear: () => void;
  isAdvancedOpen: boolean;
}

/** Width of the icon button - used for placeholder to prevent layout shift */
const BUTTON_SIZE = "24px";

/**
 * Compact clear filters button (icon-only) for QuickBrowseBar.
 * Shows when filters are active and advanced panel is closed.
 * Positioned after filter controls, before sort (since it clears filters, not sort).
 *
 * Renders a same-width placeholder when hidden to prevent layout shift.
 */
const ClearBrowseParamsButton = ({
  browseParams,
  onClear,
  isAdvancedOpen,
}: ClearBrowseParamsButtonProps) => {
  // Use hasActiveFilters (excludes sort) - sort is user preference, not a filter
  const hasActiveParams = hasActiveFilters(browseParams);

  // Show when filters active AND advanced panel closed
  const isVisible = hasActiveParams && !isAdvancedOpen;

  if (!isVisible) {
    // Placeholder to reserve space and prevent layout shift
    return (
      <Box
        data-testid="browse-reset-placeholder"
        w={BUTTON_SIZE}
        h={BUTTON_SIZE}
        ml={2}
        flexShrink={0}
      />
    );
  }

  return (
    <Button
      onClick={onClear}
      size="xs"
      variant="ghost"
      color="destructive"
      _hover={{ bg: "tertiary/8", color: "destructive" }}
      ml={2}
      flexShrink={0}
      w={BUTTON_SIZE}
      h={BUTTON_SIZE}
      minW={BUTTON_SIZE}
      p={0}
      aria-label="Clear filters"
      title="Clear filters"
    >
      <FiX size={14} />
    </Button>
  );
};

export default ClearBrowseParamsButton;
