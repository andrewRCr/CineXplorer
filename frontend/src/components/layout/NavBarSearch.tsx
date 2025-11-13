import { useState } from "react";
import { Box, Input, IconButton } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

interface NavBarSearchProps {
  onSearch?: () => void; // Optional callback for when search is performed (useful for mobile drawer closing)
}

const NavBarSearch = ({ onSearch }: NavBarSearchProps = {}) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      // Navigate to search results page with the query parameter
      navigate(
        `${ROUTES.SEARCH_RESULTS}?query=${encodeURIComponent(query.trim())}`
      );
      // Call optional callback (useful for closing mobile drawer)
      onSearch?.();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      maxW="300px"
      w="100%"
      borderRadius="md"
      border="1px solid"
      borderColor="border-strong-01"
      backgroundColor="transparent"
      transition="all 0.2s ease"
      css={{
        "&:hover:not(:focus-within)": {
          borderColor: "var(--chakra-colors-border-strong-02)",
          backgroundColor: "color-mix(in srgb, var(--chakra-colors-tertiary) 8%, transparent)",
        },
        "&:focus-within": {
          borderColor: "var(--chakra-colors-tertiary)",
          backgroundColor: "transparent",
        },
      }}
    >
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Search movies..."
        size="sm"
        border="none"
        outline="none"
        backgroundColor="transparent"
        borderRadius="md 0 0 md"
        _focus={{
          border: "none",
          boxShadow: "none",
          outline: "none",
        }}
        _hover={{}}
      />
      <IconButton
        onClick={handleSearch}
        size="sm"
        variant="ghost"
        aria-label="Search"
        borderRadius="0 md md 0"
        backgroundColor="transparent"
        border="none"
        _hover={{
          backgroundColor: "transparent",
          color: query.trim() ? "tertiary" : undefined,
        }}
        _active={{
          backgroundColor: "transparent",
        }}
        disabled={!query.trim()}
        color={!query.trim() ? "on-muted" : "foreground"}
      >
        <FiSearch />
      </IconButton>
    </Box>
  );
};

export default NavBarSearch;
