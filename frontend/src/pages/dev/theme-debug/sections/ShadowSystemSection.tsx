import { Box, Text, VStack } from "@chakra-ui/react";

/**
 * Shadow System Section - Elevation Differentiation
 */
export function ShadowSystemSection() {
  return (
    <Box
      id="shadows"
      bg="layer-01"
      p={6}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border-strong-01"
    >
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Shadow System
      </Text>
      <VStack align="stretch" gap={4}>
        {/* shadow-sm: cards on background */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            shadow-sm (cards)
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <Box
              bg="layer-01"
              p={6}
              borderRadius="md"
              boxShadow="shadow-sm"
              textAlign="center"
            >
              <Text fontWeight="bold">Card with shadow-sm</Text>
              <Text fontSize="xs" color="foreground/60">
                layer-01 on background
              </Text>
            </Box>
          </Box>
        </Box>

        {/* shadow-md: popovers on layer-01 */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            shadow-md (popovers)
          </Text>
          <Box
            bg="layer-01"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-strong-01"
          >
            <Box
              bg="layer-02"
              p={6}
              borderRadius="md"
              boxShadow="shadow-md"
              textAlign="center"
            >
              <Text fontWeight="bold">Popover with shadow-md</Text>
              <Text fontSize="xs" color="foreground/60">
                layer-02 on layer-01
              </Text>
            </Box>
          </Box>
        </Box>

        {/* shadow-lg: modals on background */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            shadow-lg (modals)
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <Box
              bg="layer-02"
              p={6}
              borderRadius="md"
              boxShadow="shadow-lg"
              textAlign="center"
            >
              <Text fontWeight="bold">Modal with shadow-lg</Text>
              <Text fontSize="xs" color="foreground/60">
                layer-02 on background
              </Text>
            </Box>
          </Box>
        </Box>

        <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2}>
          Expected: Progressive depth from sm → md → lg. IBM Carbon uses minimal
          shadows (prefers layer colors).
        </Text>
      </VStack>
    </Box>
  );
}
