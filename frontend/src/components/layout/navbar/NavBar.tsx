import { Box, HStack, Container } from "@chakra-ui/react";
import AccountControl from "./AccountControl";
import MobileMenuButton from "./MobileMenuButton";
import WideNavBar from "./WideNavBar";
import Wordmark from "./Wordmark";

export default function NavBar() {
  return (
    <Box
      as="header"
      w="100%"
      h="layout-navbar"
      bg="layer-01"
      position="sticky"
      top="0"
      zIndex="navbar"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="border-strong-01"
    >
      <Container
        maxW="container.xl"
        px={{ base: 2, md: 6, lg: 8 }}
        w="100%"
        h="100%"
      >
        <HStack
          justifyContent="space-between"
          w="100%"
          h="100%"
          display={{ base: "flex", lg: "none" }}
        >
          <MobileMenuButton size="sm" />
          <Wordmark />
          <AccountControl />
        </HStack>
        <Box display={{ base: "none", lg: "block" }} h="100%">
          <WideNavBar />
        </Box>
      </Container>
    </Box>
  );
}
