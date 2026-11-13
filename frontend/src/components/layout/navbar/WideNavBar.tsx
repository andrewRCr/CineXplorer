import { Box, HStack } from "@chakra-ui/react";
import Wordmark from "./Wordmark";
import MainNavLinks from "./MainNavLinks";
import SearchField from "./SearchField";
import AccountControl from "./AccountControl";

export default function WideNavBar() {
  return (
    <HStack w="100%" h="100%" gap="4">
      <Wordmark />
      <MainNavLinks />
      <Box flex="1" minW="0" maxW="300px" ms="auto">
        <SearchField />
      </Box>
      <AccountControl />
    </HStack>
  );
}
