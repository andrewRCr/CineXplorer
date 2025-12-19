import { Box, Text, VStack, HStack } from "@chakra-ui/react";

/**
 * CineXplorer Extensions Section - App-Specific Tokens
 *
 * Shows movie-app-specific tokens (ratings, badges, drag-and-drop).
 */
export function CineXplorerExtensionsSection() {
  return (
    <Box id="cinexplorer-extensions" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
      <Text fontSize="xl" fontWeight="bold" mb={4}>CineXplorer Extensions</Text>
      <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
        <VStack align="stretch" gap={4}>
          {/* TMDB Community Scores - uses status colors */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">TMDB Community Scores (0-10)</Text>
            <HStack gap={2} wrap="wrap" justify="center">
              <Box bg="success" color="on-success" px={3} py={1} borderRadius="md" fontWeight="bold">
                8.2
              </Box>
              <Box bg="info" color="on-info" px={3} py={1} borderRadius="md" fontWeight="bold">
                6.5
              </Box>
              <Box bg="warning" color="on-warning" px={3} py={1} borderRadius="md" fontWeight="bold">
                4.1
              </Box>
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              ≥7.5: success (green), 5.0-7.4: info (blue), &lt;5.0: warning (yellow)
            </Text>
          </Box>

          {/* User Personal Rating - future 5-star system */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">User Personal Rating (future 5-star)</Text>
            <Box textAlign="center">
              <Box bg="layer-01" px={3} py={2} borderRadius="md" display="inline-block">
                <Text color="imdb-gold" fontWeight="bold" fontSize="xl">★★★★☆</Text>
              </Box>
            </Box>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              Stars use imdb-gold token: #785F05 (light mode, WCAG AA) / #F5C518 (dark mode, authentic IMDb)
            </Text>
          </Box>

          {/* Badge Token */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">Genre Badges</Text>
            <HStack gap={2} justify="center">
              <Box bg="badge" color="on-badge" px={3} py={1} borderRadius="full" fontSize="sm">
                Action
              </Box>
              <Box bg="badge" color="on-badge" px={3} py={1} borderRadius="full" fontSize="sm">
                Sci-Fi
              </Box>
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              Neutral labels for genres, tags
            </Text>
          </Box>

          {/* Drag and Drop Tokens */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">Drag & Drop States</Text>
            <HStack gap={2} justify="center">
              <Box
                bg="drag-active"
                p={2}
                px={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor="info"
                borderStyle="dashed"
                boxShadow="shadow-sm"
              >
                <Text fontSize="xs" fontWeight="medium" color="on-secondary">
                  drag-active
                </Text>
              </Box>
              <Box
                bg="drop-zone"
                p={2}
                px={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor="success"
                borderStyle="dashed"
              >
                <Text fontSize="xs" fontWeight="medium" color="foreground">
                  drop-zone
                </Text>
              </Box>
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={2} textAlign="center">
              drag-active: secondaryHover bg, on-secondary text, info dashed border | drop-zone: muted bg, foreground text, success dashed border
            </Text>
          </Box>
        </VStack>
      </Box>
      <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2} mt={3} textAlign="center">
        Note: TMDB community scores use status color tokens (success/info/warning) per MovieUserScore component thresholds.
      </Text>
    </Box>
  );
}
