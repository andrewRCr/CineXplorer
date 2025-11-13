import { Box, Text, VStack, Code } from "@chakra-ui/react";

/**
 * Border Hierarchy Section - Per-Layer Border System
 */
export function BorderHierarchySection() {
  return (
    <Box id="borders" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Border Hierarchy</Text>
      <VStack align="stretch" gap={3}>
        <Box p={4} borderWidth="2px" borderColor="border-subtle-00" bg="layer-01">
          <Text fontWeight="bold">border-subtle-00</Text>
          <Text fontSize="sm" color="foreground/60">Most subtle border (barely visible)</Text>
        </Box>
        <Box p={4} borderWidth="2px" borderColor="border-subtle-02" bg="layer-02">
          <Text fontWeight="bold">border-subtle-02</Text>
          <Text fontSize="sm" color="foreground/60">Subtle border for layer-02</Text>
        </Box>
        <Box p={4} borderWidth="2px" borderColor="border-strong-01" bg="layer-01">
          <Text fontWeight="bold">border-strong-01</Text>
          <Text fontSize="sm" color="foreground/60">Strong border for layer-01 (clear visibility)</Text>
        </Box>
        <Box p={4} borderWidth="2px" borderColor="border-strong-02" bg="layer-02">
          <Text fontWeight="bold">border-strong-02</Text>
          <Text fontSize="sm" color="foreground/60">Strong border for layer-02</Text>
        </Box>
        <Box p={4} borderWidth="2px" borderColor="border-strong-03" bg="layer-03">
          <Text fontWeight="bold">border-strong-03</Text>
          <Text fontSize="sm" color="foreground/60">Strong border for layer-03 (highest contrast)</Text>
        </Box>
        <Box p={4}>
          <Text fontSize="sm" color="foreground/80" fontStyle="italic" lineHeight="1.6">
            Expected: 5 tokens following IBM Carbon's architectural pattern:
            <br />
            • <strong>Light mode (alternating layers)</strong>: 2 distinct values
              (subtle + strong, reused across layers)
            <br />
            • <strong>Dark mode (progressive layers)</strong>: 5 distinct values
              (progressive lightening per layer for visibility)
            <br />
            • Subtle borders are intentionally faint, strong borders clearly visible
            <br />
            • All strong borders should meet WCAG 3:1 contrast requirements
            <br />
            <br />
            <Text as="span" fontSize="xs">
              *Note: GitLab Pajamas light mode <Code fontSize="xs">border-subtle-00</Code> (#ececef)
              matches <Code fontSize="xs">layer-01</Code> background. This is intentional per Pajamas
              design philosophy (acknowledged "partial WCAG 3:1 support"). Not a bug - just
              visible in debug view. Use <Code fontSize="xs">border-strong-*</Code> for accessible borders.
            </Text>
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
