import { Box, Text, VStack } from "@chakra-ui/react";

/**
 * Layer System Section - Elevation Hierarchy
 */
export function LayerSystemSection() {
  return (
    <Box id="layers" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Layer System (Elevation Hierarchy)</Text>
      <VStack align="stretch" gap={4}>
        <Box bg="background" p={4} borderWidth="1px" borderColor="border">
          <Text color="foreground" fontWeight="bold">background</Text>
          <Text color="foreground/60" fontSize="sm">Base page background (lowest)</Text>
        </Box>
        <Box bg="layer-01" p={4} borderWidth="1px" borderColor="border">
          <Text color="foreground" fontWeight="bold">layer-01</Text>
          <Text color="foreground/60" fontSize="sm">Cards, panels (first elevation)</Text>
        </Box>
        <Box bg="layer-02" p={4} borderWidth="1px" borderColor="border">
          <Text color="foreground" fontWeight="bold">layer-02</Text>
          <Text color="foreground/60" fontSize="sm">Elevated panels, popovers (second elevation)</Text>
        </Box>
        <Box bg="layer-03" p={4} borderWidth="1px" borderColor="border">
          <Text color="foreground" fontWeight="bold">layer-03</Text>
          <Text color="foreground/60" fontSize="sm">Highest elevation (dropdowns, modals)</Text>
        </Box>
        <Box p={4}>
          <Text fontSize="sm" color="foreground/80" fontStyle="italic">
            Expected: Each layer should be visually distinct. layer-03 should NOT match background.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
