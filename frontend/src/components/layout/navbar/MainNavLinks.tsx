import { Flex, Link as ChakraLink } from "@chakra-ui/react";
import { Link, useLocation, useMatch } from "react-router";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { ROUTES } from "@/constants/routes";
import { catalogWindow } from "@/utilities/catalogWindow";

interface Props {
  direction?: "row" | "column";
  onNavigate?: () => void;
}
export default function MainNavLinks({ direction = "row", onNavigate }: Props) {
  const { pathname } = useLocation();
  const onWatchlist = useMatch(ROUTES.WATCHLIST) !== null;
  const { status } = useAuthContext() ?? {};
  const links = [
    {
      path: ROUTES.BROWSE,
      label: "Films",
      current: catalogWindow(pathname) !== null,
    },
  ];
  if (status === "authenticated")
    links.push({
      path: ROUTES.WATCHLIST,
      label: "Watchlist",
      current: onWatchlist,
    });
  return (
    <Flex
      as="nav"
      aria-label="Main"
      direction={direction}
      gap="4"
      flexShrink="0"
    >
      {links.map((link) => (
        <ChakraLink
          asChild
          key={link.path}
          color="foreground"
          whiteSpace="nowrap"
          textDecoration={link.current ? "underline" : "none"}
          textDecorationColor="tertiary"
          textDecorationThickness="2px"
          textUnderlineOffset="6px"
          _hover={{
            textDecoration: "underline",
            textDecorationColor: "tertiary",
          }}
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
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        </ChakraLink>
      ))}
    </Flex>
  );
}
