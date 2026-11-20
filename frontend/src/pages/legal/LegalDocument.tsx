import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

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
  return (
    <Stack as="main" gap={4} py={8} mx="auto" w="full" maxW="3xl" minW="0">
      <Heading as="h1" size="2xl">
        {title}
      </Heading>
      <Text color="on-muted">
        <strong>Effective:</strong> {effectiveDate}
      </Text>
      {children}
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
