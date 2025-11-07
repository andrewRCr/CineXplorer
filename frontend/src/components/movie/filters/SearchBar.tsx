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
        color="text.secondary"
        zIndex={1}
        pointerEvents="none"
      >
        <FiSearch />
      </Box>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        borderColor="border.subtle"
        backgroundColor={isHovered ? "background.subItem" : "transparent"}
        pl="40px"
        transition="all 0.2s ease"
        _focus={{
          borderColor: "tertiary.primary",
          boxShadow: "0 0 0 1px",
          boxShadowColor: "tertiary.primary",
          backgroundColor: "transparent",
        }}
        _hover={{}}
      />
    </Box>
  );
};

export default SearchBar;
