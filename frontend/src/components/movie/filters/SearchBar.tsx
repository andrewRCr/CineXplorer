import { Input, Box } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search movies...",
}: SearchBarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Box 
      position="relative" 
      maxW="400px"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        position="absolute"
        left="12px"
        top="50%"
        transform="translateY(-50%)"
        color="on-muted"
        zIndex={1} // Acceptable: positions icon above input field
        pointerEvents="none"
      >
        <FiSearch />
      </Box>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        borderColor="input"
        bg={isHovered ? "tertiary/8" : "transparent"}
        pl="40px"
        transition="all 0.2s ease"
        _focus={{
          bg: "transparent",
        }}
        _focusVisible={{
          outlineColor: "ring",
          outlineWidth: "2px",
          outlineStyle: "solid",
          outlineOffset: "2px",
        }}
        _hover={{}}
      />
    </Box>
  );
};

export default SearchBar;
