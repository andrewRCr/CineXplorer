interface SearchFieldProps {
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export default function SearchField({ onSubmit, autoFocus }: SearchFieldProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const navigate = useNavigate();
  return (
    <Box
      as="form"
      role="search"
      display="flex"
      alignItems="center"
      maxW="300px"
      minW="0"
      w="100%"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border-strong-01"
      bg="transparent"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        void navigate(
          `${ROUTES.SEARCH_RESULTS}?query=${encodeURIComponent(trimmed)}`,
        );
        onSubmit?.();
      }}
      css={{
        "&:hover:not(:has(input:focus-visible))": {
          borderColor: "border-strong-02",
          bg: "tertiary/8",
        },
        "&:has(input:focus-visible)": {
          borderColor: "tertiary",
          bg: "transparent",
        },
      }}
    >
      <VisuallyHidden asChild>
        <label htmlFor={inputId}>Search films</label>
      </VisuallyHidden>
      <Input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search films"
        autoFocus={autoFocus}
        size="sm"
        minW="0"
        border="none"
        outline="none"
        bg="transparent"
        color="foreground"
        _focus={{ border: "none", outline: "none", boxShadow: "none" }}
      />
      <IconButton
        type="submit"
        size="sm"
        variant="ghost"
        aria-label="Search"
        disabled={!query.trim()}
        bg="transparent"
        border="none"
        color={query.trim() ? "foreground" : "on-muted"}
      >
        <FiSearch />
      </IconButton>
    </Box>
  );
}
import { useId, useState } from "react";
import { Box, Input, IconButton, VisuallyHidden } from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants/routes";
