import { Box, Heading, Text, VStack, HStack } from "@chakra-ui/react";

const TypographyTest = () => {
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

        {/* NavBar vs Heading Comparison */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            NavBar vs Heading Comparison
          </Heading>
          
          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold">Typography Test H1 (Heading component, size="4xl"):</Text>
              <Heading as="h1" size="4xl">
                CineXplorer
              </Heading>
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="bold">NavBar Style (Box component, fontFamily="heading", fontSize="3xl"):</Text>
              <Box
                as="span"
                fontFamily="heading"
                fontSize="3xl"
                color="text.main"
              >
                CineXplorer
              </Box>
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="bold">NavBar Style with Same Size (Box component, fontFamily="heading", fontSize="4xl"):</Text>
              <Box
                as="span"
                fontFamily="heading"
                fontSize="4xl"
                color="text.main"
              >
                CineXplorer
              </Box>
            </Box>
          </VStack>
        </Box>

        {/* Font Weight Variants */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            Font Weight Variants (Work Sans - Body Font)
          </Heading>
          
          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="text.muted">Footer Text Examples:</Text>
              
              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="thin" (100)</Text>
                  <Text fontSize="sm" fontWeight="thin" color="text.muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="light" (300)</Text>
                  <Text fontSize="sm" fontWeight="light" color="text.muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="normal" (400) - Current Footer</Text>
                  <Text fontSize="sm" fontWeight="normal" color="text.muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="medium" (500) - Current Footer</Text>
                  <Text fontSize="sm" fontWeight="medium" color="text.muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="semibold" (600)</Text>
                  <Text fontSize="sm" fontWeight="semibold" color="text.muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="bold" (700)</Text>
                  <Text fontSize="sm" fontWeight="bold" color="text.muted">
                    © 2025 CineXplorer. All rights reserved.
                  </Text>
                </Box>
              </VStack>
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="text.muted">Regular Text Examples:</Text>
              
              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="thin" (100)</Text>
                  <Text fontWeight="thin">
                    This is regular body text in Work Sans thin weight.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="light" (300)</Text>
                  <Text fontWeight="light">
                    This is regular body text in Work Sans light weight.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="normal" (400) - Default</Text>
                  <Text fontWeight="normal">
                    This is regular body text in Work Sans normal weight.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontWeight="medium" (500)</Text>
                  <Text fontWeight="medium">
                    This is regular body text in Work Sans medium weight.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* System vs Custom Fonts */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            System vs Custom Font Comparison
          </Heading>
          
          <VStack gap={4} align="start">
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="text.muted">Functional Text (Labels, Controls):</Text>
              
              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontFamily="system" - System fonts for utility text</Text>
                  <Text fontSize="sm" fontFamily="system" fontWeight="medium" color="text.secondary">
                    Browse by
                  </Text>
                  <Text fontSize="sm" fontFamily="system" fontWeight="medium" color="text.secondary" ml={4}>
                    Sort by
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontFamily="body" (Work Sans) - Current approach</Text>
                  <Text fontSize="sm" fontFamily="body" fontWeight="medium" color="text.secondary">
                    Browse by
                  </Text>
                  <Text fontSize="sm" fontFamily="body" fontWeight="medium" color="text.secondary" ml={4}>
                    Sort by
                  </Text>
                </Box>
              </VStack>
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="bold" fontSize="sm" color="text.muted">Content Text:</Text>
              
              <VStack gap={3} align="start" pl={4}>
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontFamily="body" (Work Sans) - Keep for content</Text>
                  <Text fontSize="md" fontFamily="body">
                    Movie titles, descriptions, and user-facing content should use Work Sans.
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="text.muted" mb={1}>fontFamily="heading" (Space Grotesk) - Keep for headings</Text>
                  <Text fontSize="lg" fontFamily="heading" fontWeight="semibold">
                    Section headings and branding should use Space Grotesk.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* Theme Colors Test */}
        <Box>
          <Heading as="h3" size="2xl" mb={4}>
            Theme Colors Test
          </Heading>
          
          <VStack gap={4} align="stretch">
            <Box>
              <Text mb={2} fontWeight="bold">Border Colors:</Text>
              <HStack gap={4}>
                <Box 
                  p={4} 
                  border="2px solid" 
                  borderColor="border.separator" 
                  borderRadius="md"
                >
                  border.separator (should be gray.700 #4A5568)
                </Box>
                <Box 
                  p={4} 
                  border="2px solid" 
                  borderColor="border.subtle" 
                  borderRadius="md"
                >
                  border.subtle (should be gray.200)
                </Box>
              </HStack>
            </Box>

            <Box>
              <Text mb={2} fontWeight="bold">Text Colors:</Text>
              <VStack align="start" gap={2}>
                <Text color="text.main">text.main (white)</Text>
                <Text color="text.muted">text.muted (gray.300)</Text>
                <Text color="text.error">text.error (red.500)</Text>
                <Text color="text.secondary">text.secondary (gray.400)</Text>
              </VStack>
            </Box>

            <Box>
              <Text mb={2} fontWeight="bold">Accent Colors:</Text>
              <HStack gap={4}>
                <Box p={4} bg="accent.primary" borderRadius="md" color="white">
                  accent.primary (blue.500)
                </Box>
                <Box p={4} bg="accent.secondary" borderRadius="md" color="white">
                  accent.secondary (blue.700)
                </Box>
              </HStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default TypographyTest;