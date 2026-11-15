import { Box, Flex, Heading, Link as ChakraLink } from "@chakra-ui/react";
import { Link, Outlet, useMatch } from "react-router";
import { ROUTES } from "@/constants/routes";

export default function Library() {
  const history = useMatch(ROUTES.LIBRARY_HISTORY) !== null;
  return (
    <Box py={4}>
      <Heading as="h1" mb={4}>
        Library
      </Heading>
      <Flex as="nav" aria-label="Library" gap="4" mb={6}>
        {[
          { path: ROUTES.LIBRARY, label: "Films", current: !history },
          { path: ROUTES.LIBRARY_HISTORY, label: "History", current: history },
        ].map((link) => (
          <ChakraLink
            asChild
            key={link.path}
            color="foreground"
            textDecoration={link.current ? "underline" : "none"}
            textDecorationColor="tertiary"
            textDecorationThickness="2px"
            textUnderlineOffset="6px"
            _focusVisible={{
              outlineWidth: "2px",
              outlineStyle: "solid",
              outlineColor: "ring",
              outlineOffset: "2px",
            }}
          >
            <Link
              to={link.path}
              aria-current={link.current ? "page" : undefined}
            >
              {link.label}
            </Link>
          </ChakraLink>
        ))}
      </Flex>
      <Outlet />
    </Box>
  );
}
