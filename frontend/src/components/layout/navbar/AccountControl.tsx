import {
  Avatar,
  Box,
  Button,
  Menu,
  Portal,
  Text,
  Link as ChakraLink,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { signInPathFor } from "@/utilities/returnPath";
import { ROUTES } from "@/constants/routes";

export default function AccountControl() {
  const layout = useBreakpointValue(
    { base: "phone", lg: "wide" },
    { ssr: false },
  );
  const { status, user, logout } = useAuthContext() ?? {};
  const location = useLocation();
  if (status === "resolving") return <Box h="8" w="16" aria-hidden="true" />;
  if (status !== "authenticated")
    return (
      <ChakraLink
        asChild
        color="foreground"
        whiteSpace="nowrap"
        _focusVisible={{
          outlineWidth: "2px",
          outlineStyle: "solid",
          outlineColor: "ring",
          outlineOffset: "2px",
        }}
      >
        <Link to={signInPathFor(location.pathname, location.search)}>
          Sign in
        </Link>
      </ChakraLink>
    );
  return (
    <Menu.Root
      key={layout}
      positioning={{ placement: "bottom-end", gutter: 8 }}
    >
      <Menu.Trigger asChild>
        <Button
          size="sm"
          bg="layer-01"
          color="foreground"
          aria-label={user?.username}
          _hover={{ bg: "layer-hover-01" }}
          _active={{ bg: "layer-active-01" }}
          px="2"
          flexShrink="0"
        >
          <Text
            display={{ base: "none", lg: "block" }}
            fontWeight="bold"
            maxW="12rem"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {user?.username}
          </Text>
          <Avatar.Root
            size="xs"
            bg="layer-02"
            color="foreground"
            aria-hidden="true"
          >
            <Avatar.Fallback>
              <Box
                as="span"
                data-initial={user?.username?.charAt(0)}
                _before={{ content: "attr(data-initial)" }}
              />
            </Avatar.Fallback>
          </Avatar.Root>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg="popover"
            color="on-popover"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border-subtle-02"
          >
            <Menu.Item
              value="profile"
              asChild
              color="on-popover"
              _highlighted={{ bg: "tertiary", color: "on-tertiary" }}
            >
              <Link to={ROUTES.PROFILE}>Profile</Link>
            </Menu.Item>
            <Menu.Item
              value="sign-out"
              color="on-popover"
              _highlighted={{ bg: "tertiary", color: "on-tertiary" }}
              onSelect={() => {
                void logout?.();
              }}
            >
              Sign out
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
