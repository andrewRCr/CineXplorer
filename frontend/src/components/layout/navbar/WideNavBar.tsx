import { LuPlus } from "react-icons/lu";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { useLogDialog } from "./useLogDialog";
import { Box, Button, HStack } from "@chakra-ui/react";
import Wordmark from "./Wordmark";
import MainNavLinks from "./MainNavLinks";
import SearchField from "./SearchField";
import AccountControl from "./AccountControl";

export default function WideNavBar() {
  const auth = useAuthContext();
  const openLog = useLogDialog();
  return (
    <HStack w="100%" h="100%" gap="4">
      <Wordmark />
      <MainNavLinks />
      <Box flex="1" minW="0" maxW="300px" ms="auto">
        <SearchField />
      </Box>
      {auth?.status === "authenticated" && (
        <Button size="sm" flexShrink="0" onClick={() => openLog()}>
          <LuPlus />
          Log
        </Button>
      )}
      <AccountControl />
    </HStack>
  );
}
