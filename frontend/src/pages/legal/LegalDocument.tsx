import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { NavigationType, useLocation, useNavigationType } from "react-router";

interface LegalDocumentProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export function LegalDocument({
  title,
  effectiveDate,
  children,
}: LegalDocumentProps) {
  const { hash, key } = useLocation();
  const navigationType = useNavigationType();
  const content = useRef<HTMLElement>(null);
  const titleHeading = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    let id = "";
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
    }
    const heading = id
      ? content.current?.querySelector<HTMLHeadingElement>(
          `:is(h2, h3)#${CSS.escape(id)}`,
        )
      : null;
    if (heading) {
      heading.scrollIntoView();
      heading.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      if (!hash && navigationType !== NavigationType.Pop) {
        titleHeading.current?.focus({ preventScroll: true });
      }
    }
  }, [hash, key, navigationType]);

  return (
    <Stack asChild gap={4} py={8} mx="auto" w="full" maxW="3xl" minW="0">
      <main ref={content}>
        <Heading as="h1" size="2xl" ref={titleHeading} tabIndex={-1}>
          {title}
        </Heading>
        <Text color="on-muted">
          <strong>Effective:</strong> {effectiveDate}
        </Text>
        {children}
      </main>
    </Stack>
  );
}

export function LegalHeading({
  as,
  children,
}: {
  as: "h2" | "h3";
  children: string;
}) {
  const id = children
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");

  return (
    <Heading
      as={as}
      id={id}
      tabIndex={-1}
      scrollMarginTop="var(--chakra-sizes-layout-navbar)"
      size={as === "h2" ? "xl" : "lg"}
      mt={as === "h2" ? 4 : 2}
    >
      {children}
    </Heading>
  );
}

export function LegalTableRegion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box
      role="region"
      aria-label={label}
      tabIndex={0}
      overflowX="auto"
      focusVisibleRing="inside"
    >
      {children}
    </Box>
  );
}
