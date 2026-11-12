import { Box, Container } from "@chakra-ui/react";
import PhoneNavBar from "./PhoneNavBar";
import WideNavBar from "./WideNavBar";

export default function NavBar() {
  return (
    <Box
      as="header"
      w="100%"
      h="layout-navbar"
      bg="layer-01"
      position="sticky"
      top="0"
      boxShadow="base"
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
        <Box display={{ base: "block", lg: "none" }} h="100%">
          <PhoneNavBar />
        </Box>
        <Box display={{ base: "none", lg: "block" }} h="100%">
          <WideNavBar />
        </Box>
      </Container>
    </Box>
  );
}
