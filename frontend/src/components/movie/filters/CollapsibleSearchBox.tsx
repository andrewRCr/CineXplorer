import { useState, useRef, useEffect, useCallback } from "react";
import { HStack, Button, Input } from "@chakra-ui/react";
import { FiSearch, FiX } from "react-icons/fi";

interface CollapsibleSearchBoxProps {
  query: string;
  onQueryChange: (query: string) => void;
  pageSource?: string;
}

const CollapsibleSearchBox = ({
  query,
  onQueryChange,
  pageSource,
}: CollapsibleSearchBoxProps) => {
  const [localQuery, setLocalQuery] = useState(query);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Track focus timeout for cleanup
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Close search bar when page source changes (e.g., via sidebar navigation)
  useEffect(() => {
    setIsSearchExpanded(false);
    // Clear any pending focus timeout when page source changes
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, [pageSource]);
  
  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  // Memoize handlers to prevent unnecessary re-renders
  const handleSearchSubmit = useCallback(() => {
    onQueryChange(localQuery);
    // Don't close the search bar after submitting - let user close manually
  }, [localQuery, onQueryChange]);

  const toggleSearch = useCallback(() => {
    const wasExpanded = isSearchExpanded;
    setIsSearchExpanded(!wasExpanded);
    
    // Clear any existing focus timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    
    // Focus the input when expanding
    if (!wasExpanded) {
      focusTimeoutRef.current = setTimeout(() => {
        searchInputRef.current?.focus();
        focusTimeoutRef.current = null; // Clear reference after execution
      }, 100);
    }
  }, [isSearchExpanded]);

  const closeSearch = useCallback(() => {
    setIsSearchExpanded(false);
    // Clear any pending focus timeout when closing
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    // Don't clear the query on close, only when parent calls onQueryChange
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }, [handleSearchSubmit, closeSearch]);
  
  // Memoize input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  }, []);

  return (
    <HStack
      alignSelf="center"
      gap={0}
      align="stretch"
      border="1px solid"
      // DESIGN: Uses button-outline (not input) for visual consistency with adjacent filter dropdowns
      borderColor="button-outline"
      borderRadius="4px"
      width={isSearchExpanded ? "260px" : "32px"}
      height="32px"
      transition="width 0.3s ease-in-out"
      overflow="hidden" // Prevents content from spilling during animation
    >
      <Input
        ref={searchInputRef}
        placeholder="Search results..."
        value={localQuery}
        onChange={handleInputChange}
        onKeyDown={handleSearchKeyDown}
        size="sm"
        border="none"
        borderRadius="0"
      backgroundColor="background"
      color="foreground"
      _focus={{ boxShadow: "none" }}
      _hover={{
        bg: "tertiary/8",
      }}
        fontSize="14px"
        height="30px"
        flex="1"
        p={isSearchExpanded ? 2 : 0} // No padding when collapsed
        minW="0" // Allows input to shrink to 0
        opacity={isSearchExpanded ? 1 : 0}
        visibility={isSearchExpanded ? "visible" : "hidden"}
        transition="opacity 0.2s 0.1s, visibility 0.2s 0.1s, padding 0.3s, background-color 0.2s ease"
        disabled={!isSearchExpanded}
      />
      <Button
        aria-label={isSearchExpanded ? "Submit search" : "Open search"}
        onClick={isSearchExpanded ? handleSearchSubmit : toggleSearch}
        size="sm"
        variant="ghost"
        border="none"
        borderRadius={0}
      backgroundColor="background"
      color="foreground"
      _hover={{
        bg: "tertiary/8",
      }}
        height="30px"
        minW="30px"
        p={0}
        flexShrink={0}
      >
        <FiSearch size={14} />
      </Button>
      {isSearchExpanded && (
        <Button
          aria-label="Close search"
          onClick={closeSearch}
          size="sm"
          variant="ghost"
          border="none"
          borderRadius="0 4px 4px 0"
          backgroundColor="transparent"
        color="on-muted"
        _hover={{
          bg: "tertiary/8",
          color: "foreground",
        }}
          height="30px"
          minW="30px"
          p={0}
          flexShrink={0}
          opacity={isSearchExpanded ? 1 : 0}
          transition="opacity 0.2s ease-in-out 0.1s"
        >
          <FiX size={16} />
        </Button>
      )}
    </HStack>
  );
};

export default CollapsibleSearchBox;
