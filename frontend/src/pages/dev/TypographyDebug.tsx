import { Box, Heading, Text, VStack } from "@chakra-ui/react";

/**
 * Typography Debug Page
 *
 * Displays all text styles in the design system for visual verification.
 */
const TypographyDebug = () => {
  return (
    <Box p={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading as="h1" size="4xl" mb={4}>
            Heading 1 (Space Grotesk)
          </Heading>
          <Text fontSize="lg">
            This is a paragraph set in Work Sans. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua.
          </Text>
        </Box>

        <Box>
          <Heading as="h2" size="3xl" mb={4}>
            Heading 2 (Space Grotesk)
          </Heading>
          <Text fontSize="md">
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </Text>
          <Text fontSize="md" fontStyle="italic" mt={2}>
            This is italicized text (Work Sans).
          </Text>
          <Text fontSize="md" fontWeight="bold" mt={2}>
            This is bold text (Work Sans).
          </Text>
        </Box>

        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            Heading 3 (Space Grotesk)
          </Heading>
          <Text>
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum.
          </Text>
        </Box>

        <Box>
          <Heading as="h4" size="xl" mb={4}>
            Heading 4 (Space Grotesk)
          </Heading>
          <Text>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
            quae ab illo inventore veritatis et quasi architecto beatae vitae
            dicta sunt explicabo.
          </Text>
        </Box>


        {/* Font Weight Variants */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            Font Weight Variants (Work Sans - Body Font)
          </Heading>

          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="on-muted">Footer Text Examples:</Text>

              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="thin" (100)</Text>
                  <Text fontSize="sm" fontWeight="thin" color="on-muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="light" (300)</Text>
                  <Text fontSize="sm" fontWeight="light" color="on-muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="normal" (400) - Current Footer</Text>
                  <Text fontSize="sm" fontWeight="normal" color="on-muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="medium" (500) - Current Footer</Text>
                  <Text fontSize="sm" fontWeight="medium" color="on-muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="semibold" (600)</Text>
                  <Text fontSize="sm" fontWeight="semibold" color="on-muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="bold" (700)</Text>
                  <Text fontSize="sm" fontWeight="bold" color="on-muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
              </VStack>
            </Box>

            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="on-muted">Regular Text Examples:</Text>

              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="thin" (100)</Text>
                  <Text fontWeight="thin">
                    This is regular body text in Work Sans thin weight.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="light" (300)</Text>
                  <Text fontWeight="light">
                    This is regular body text in Work Sans light weight.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="normal" (400) - Default</Text>
                  <Text fontWeight="normal">
                    This is regular body text in Work Sans normal weight.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontWeight="medium" (500)</Text>
                  <Text fontWeight="medium">
                    This is regular body text in Work Sans medium weight.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* New Font Family Demonstrations */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            Inter Font Demonstration
          </Heading>

          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="on-muted">Inter - Modern and Clean:</Text>
              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Heading style (fontFamily="inter", fontSize="2xl", fontWeight="semibold")</Text>
                  <Text fontFamily="inter" fontSize="2xl" fontWeight="semibold">
                    Modern Interface Heading
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Body text (fontFamily="inter", fontSize="md")</Text>
                  <Text fontFamily="inter" fontSize="md">
                    This is regular body text in Inter. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Small utility text (fontFamily="inter", fontSize="sm", color="text.secondary")</Text>
                  <Text fontFamily="inter" fontSize="sm" color="text.secondary">
                    Browse by • Sort by • Filter options
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Weight variants</Text>
                  <VStack align="start" gap={2} pl={2}>
                    <Text fontFamily="inter" fontSize="md" fontWeight="light">Inter Light (300)</Text>
                    <Text fontFamily="inter" fontSize="md" fontWeight="normal">Inter Regular (400)</Text>
                    <Text fontFamily="inter" fontSize="md" fontWeight="medium">Inter Medium (500)</Text>
                    <Text fontFamily="inter" fontSize="md" fontWeight="semibold">Inter Semibold (600)</Text>
                    <Text fontFamily="inter" fontSize="md" fontWeight="bold">Inter Bold (700)</Text>
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Box>

        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            Source Sans 3 Font Demonstration
          </Heading>

          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="on-muted">Source Sans 3 - Professional and Readable:</Text>
              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Heading style (fontFamily="sourcesans", fontSize="2xl", fontWeight="semibold")</Text>
                  <Text fontFamily="sourcesans" fontSize="2xl" fontWeight="semibold">
                    Professional Interface Heading
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Body text (fontFamily="sourcesans", fontSize="md")</Text>
                  <Text fontFamily="sourcesans" fontSize="md">
                    This is regular body text in Source Sans 3. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Small utility text (fontFamily="sourcesans", fontSize="sm", color="text.secondary")</Text>
                  <Text fontFamily="sourcesans" fontSize="sm" color="text.secondary">
                    Advanced filters • Search options • Results
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Weight variants</Text>
                  <VStack align="start" gap={2} pl={2}>
                    <Text fontFamily="sourcesans" fontSize="md" fontWeight="extraLight">Source Sans 3 ExtraLight (200)</Text>
                    <Text fontFamily="sourcesans" fontSize="md" fontWeight="light">Source Sans 3 Light (300)</Text>
                    <Text fontFamily="sourcesans" fontSize="md" fontWeight="normal">Source Sans 3 Regular (400)</Text>
                    <Text fontFamily="sourcesans" fontSize="md" fontWeight="medium">Source Sans 3 Medium (500)</Text>
                    <Text fontFamily="sourcesans" fontSize="md" fontWeight="semibold">Source Sans 3 Semibold (600)</Text>
                    <Text fontFamily="sourcesans" fontSize="md" fontWeight="bold">Source Sans 3 Bold (700)</Text>
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* System vs Custom Fonts */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            All Font Family Comparison
          </Heading>

          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="on-muted">All Available Font Families - Same Text for Direct Comparison:</Text>

              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontFamily="heading" (Space Grotesk) - Current heading font</Text>
                  <Text fontSize="lg" fontFamily="heading" fontWeight="semibold">
                    The quick brown fox jumps over the lazy dog.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontFamily="body" (Work Sans) - Current body font</Text>
                  <Text fontSize="lg" fontFamily="body" fontWeight="medium">
                    The quick brown fox jumps over the lazy dog.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontFamily="inter" (Inter) - New option</Text>
                  <Text fontSize="lg" fontFamily="inter" fontWeight="medium">
                    The quick brown fox jumps over the lazy dog.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontFamily="sourcesans" (Source Sans 3) - New option</Text>
                  <Text fontSize="lg" fontFamily="sourcesans" fontWeight="medium">
                    The quick brown fox jumps over the lazy dog.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>fontFamily="system" (System fonts) - For utility text</Text>
                  <Text fontSize="lg" fontFamily="system" fontWeight="medium">
                    The quick brown fox jumps over the lazy dog.
                  </Text>
                </Box>
              </VStack>
            </Box>

            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="on-muted">Current Usage Strategy:</Text>

              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Headings & Branding → Space Grotesk</Text>
                  <Text fontSize="md" fontFamily="heading" fontWeight="semibold">
                    CineXplorer • Movie Discovery • Section Headers
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Body Content → Work Sans</Text>
                  <Text fontSize="md" fontFamily="body">
                    Movie descriptions, user content, and main text blocks.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="on-muted" mb={1}>Utility Labels → System Fonts</Text>
                  <Text fontSize="sm" fontFamily="system" color="text.secondary">
                    Browse by • Sort by • Filter options
                  </Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default TypographyDebug;