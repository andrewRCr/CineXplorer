import { Flex, Link as ChakraLink } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import { catalogWindow } from "@/utilities/catalogWindow";
import { ROUTES } from "@/constants/routes";

const windows = [
  { value: "browse", path: ROUTES.BROWSE, label: "All films" },
  { value: "now-playing", path: ROUTES.NOW_PLAYING, label: "In theaters" },
  { value: "upcoming", path: ROUTES.UPCOMING, label: "Coming soon" },
] as const;

export default function CatalogWindowTabs() {
  const location = useLocation();
  const current = catalogWindow(location.pathname);
  if (!current) return null;
  return (
    <Flex
      as="nav"
      aria-label="Release windows"
      gap="4"
      flexWrap="wrap"
      w="100%"
      mt="2"
    >
      {windows.map((window) => (
        <ChakraLink
          asChild
          key={window.value}
          color="foreground"
          textDecoration={window.value === current ? "underline" : "none"}
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
            to={`${window.path}${location.search}`}
            aria-current={window.value === current ? "page" : undefined}
          >
            {window.label}
          </Link>
        </ChakraLink>
      ))}
    </Flex>
  );
}
