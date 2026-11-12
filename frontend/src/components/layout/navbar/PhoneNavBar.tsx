import { useEffect, useRef, useState } from "react";
import { HStack, IconButton } from "@chakra-ui/react";
import { FiSearch, FiX } from "react-icons/fi";
import NavDrawer from "./NavDrawer";
import Wordmark from "./Wordmark";
import SearchField from "./SearchField";
import AccountControl from "./AccountControl";

export default function PhoneNavBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const wasSearching = useRef(false);
  useEffect(() => {
    if (wasSearching.current && !searchOpen) searchButton.current?.focus();
    wasSearching.current = searchOpen;
  }, [searchOpen]);
  return (
    <HStack w="100%" h="100%" gap="1" justifyContent="space-between">
      {searchOpen ? (
        <>
          <SearchField
            autoFocus
            onEscape={() => setSearchOpen(false)}
            onSubmit={() => setSearchOpen(false)}
          />
          <IconButton
            aria-label="Close search"
            variant="ghost"
            size="sm"
            color="foreground"
            flexShrink="0"
            onClick={() => setSearchOpen(false)}
          >
            <FiX />
          </IconButton>
        </>
      ) : (
        <>
          <NavDrawer />
          <Wordmark />
          <IconButton
            ref={searchButton}
            aria-label="Search films"
            variant="ghost"
            size="sm"
            color="foreground"
            flexShrink="0"
            onClick={() => setSearchOpen(true)}
          >
            <FiSearch />
          </IconButton>
          <AccountControl />
        </>
      )}
    </HStack>
  );
}
