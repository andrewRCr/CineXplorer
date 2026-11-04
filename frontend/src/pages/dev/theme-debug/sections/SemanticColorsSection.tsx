import { Box, Text, VStack, HStack, Code } from "@chakra-ui/react";
import { useThemeSelect } from "@/hooks/useThemeSelect";

/**
 * Semantic Colors Section - Brand and Status Colors
 *
 * Shows all semantic color tokens with their foreground pairs and usage examples.
 * Per ADR-010: Primary/Secondary/Tertiary hierarchy with optional brand separation.
 */
export function SemanticColorsSection() {
  const { theme } = useThemeSelect();

  return (
    <Box
      id="semantic-colors"
      bg="layer-01"
      p={6}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border-strong-01"
    >
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Semantic Colors
      </Text>
      <VStack align="stretch" gap={4}>
        {/* Brand Identity (Optional) - Always shown, with note for themes without brand colors */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Brand Identity (Optional)
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            {theme === "github-primer" ? (
              // GitHub has no brand colors
              <VStack gap={2}>
                <Text
                  fontSize="sm"
                  color="foreground/60"
                  textAlign="center"
                  fontStyle="italic"
                >
                  This theme does not define brand colors.
                </Text>
                <Text
                  fontSize="xs"
                  color="foreground/60"
                  textAlign="center"
                  maxW="600px"
                  lineHeight="1.5"
                >
                  GitHub uses a black/white logo with no specific brand color.
                  The <Code fontSize="xs">brand</Code> and{" "}
                  <Code fontSize="xs">brandSecondary</Code> tokens are undefined
                  for this theme.
                </Text>
              </VStack>
            ) : (
              // IBM Carbon, GitLab Pajamas, and Material Design 3 have brand colors
              <VStack gap={4}>
                {/* Color swatches (circles) */}
                <HStack gap={6} wrap="wrap" justify="center">
                  <VStack gap={2}>
                    <Box
                      bg="brand"
                      w="80px"
                      h="80px"
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    />
                    <VStack gap={0}>
                      <Text fontSize="xs" fontWeight="medium">
                        brand
                      </Text>
                      <Text fontSize="2xs" color="foreground/60">
                        {theme === "ibm-carbon"
                          ? "IBM Blue"
                          : theme === "gitlab-pajamas"
                            ? "Orange 01p"
                            : "Material Purple"}
                      </Text>
                    </VStack>
                  </VStack>
                  {theme === "gitlab-pajamas" && (
                    <>
                      <VStack gap={2}>
                        <Box
                          bg="brandSecondary"
                          w="80px"
                          h="80px"
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        />
                        <VStack gap={0}>
                          <Text fontSize="xs" fontWeight="medium">
                            brandSecondary
                          </Text>
                          <Text fontSize="2xs" color="foreground/60">
                            Orange 02p
                          </Text>
                        </VStack>
                      </VStack>
                      <VStack gap={2}>
                        <Box
                          bg="brandTertiary"
                          w="80px"
                          h="80px"
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        />
                        <VStack gap={0}>
                          <Text fontSize="xs" fontWeight="medium">
                            brandTertiary
                          </Text>
                          <Text fontSize="2xs" color="foreground/60">
                            Orange 03p (Tanuki Red)
                          </Text>
                        </VStack>
                      </VStack>
                    </>
                  )}
                </HStack>

                {/* Foreground token pairings */}
                <HStack gap={3} wrap="wrap" justify="center">
                  <Box
                    bg="brand"
                    color="on-brand"
                    px={3}
                    py={2}
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="medium"
                  >
                    on-brand
                  </Box>
                  {theme === "gitlab-pajamas" && (
                    <>
                      <Box
                        bg="brandSecondary"
                        color="on-brandSecondary"
                        px={3}
                        py={2}
                        borderRadius="md"
                        fontSize="xs"
                        fontWeight="medium"
                      >
                        on-brandSecondary
                      </Box>
                      <Box
                        bg="brandTertiary"
                        color="on-brandTertiary"
                        px={3}
                        py={2}
                        borderRadius="md"
                        fontSize="xs"
                        fontWeight="medium"
                      >
                        on-brandTertiary
                      </Box>
                    </>
                  )}
                </HStack>

                <Text
                  fontSize="xs"
                  color="foreground/60"
                  textAlign="center"
                  maxW="600px"
                  mx="auto"
                  lineHeight="1.5"
                >
                  {theme === "gitlab-pajamas"
                    ? "GitLab brand: 3 tanuki logo oranges (bright → medium → red). Use primary/tertiary for UI components."
                    : "Brand tokens are for logo/identity only. Use functional tokens (primary/tertiary) for UI components."}
                </Text>
              </VStack>
            )}
          </Box>
        </Box>

        {/* Core Colors - Primary/Secondary/Tertiary/Muted color tokens per ADR-010 */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Core Colors
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={4}>
              {/* Color swatches (circles) */}
              <HStack gap={6} wrap="wrap" justify="center">
                <VStack gap={2}>
                  <Box
                    bg="primary"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    primary
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Box
                    bg="secondary"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderWidth="1px"
                    borderColor="border-strong-01"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    secondary
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Box
                    bg="tertiary"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    tertiary
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Box
                    bg="muted"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    muted
                  </Text>
                </VStack>
              </HStack>

              {/* Foreground token pairings */}
              <HStack gap={3} wrap="wrap" justify="center">
                <Box
                  bg="primary"
                  color="on-primary"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-primary
                </Box>
                <Box
                  bg="secondary"
                  color="on-secondary"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                  borderWidth="1px"
                  borderColor="border-strong-01"
                >
                  on-secondary
                </Box>
                <Box
                  bg="tertiary"
                  color="on-tertiary"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-tertiary
                </Box>
                <Box
                  bg="muted"
                  color="on-muted"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-muted
                </Box>
              </HStack>

              <Text
                fontSize="xs"
                color="foreground/60"
                textAlign="center"
                maxW="600px"
                mx="auto"
                lineHeight="1.5"
              >
                Per ADR-010: Color tokens for the semantic hierarchy. Primary
                (action color), Secondary (subtle backgrounds), Tertiary
                (interactive text/links), Muted (disabled/deemphasized).
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Status Colors - Consistent format with Core Colors */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Status Colors
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={4}>
              {/* Color swatches (circles) */}
              <HStack gap={6} wrap="wrap" justify="center">
                <VStack gap={2}>
                  <Box
                    bg="success"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    success
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Box
                    bg="warning"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    warning
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Box
                    bg="info"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    info
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Box
                    bg="destructive"
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    destructive
                  </Text>
                </VStack>
              </HStack>

              {/* Foreground token pairings */}
              <HStack gap={3} wrap="wrap" justify="center">
                <Box
                  bg="success"
                  color="on-success"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-success
                </Box>
                <Box
                  bg="warning"
                  color="on-warning"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-warning
                </Box>
                <Box
                  bg="info"
                  color="on-info"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-info
                </Box>
                <Box
                  bg="destructive"
                  color="on-destructive"
                  px={3}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  on-destructive
                </Box>
              </HStack>
            </VStack>
          </Box>
        </Box>

        <Text
          fontSize="xs"
          color="foreground/70"
          fontStyle="italic"
          px={2}
          textAlign="center"
        >
          Both Core and Status colors use on-* tokens for text on colored
          backgrounds (e.g., on-primary, on-success) per ADR-011 naming
          convention.
        </Text>
      </VStack>
    </Box>
  );
}
