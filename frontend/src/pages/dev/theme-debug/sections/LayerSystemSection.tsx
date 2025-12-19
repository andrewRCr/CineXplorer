import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import { useColorMode } from "@/components/core/chakra/color-mode";

/**
 * Layer System Section - Elevation Hierarchy
 */
export function LayerSystemSection() {
  const { colorMode } = useColorMode();

  return (
    <Box id="layers" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Layers: Surfaces & Containers</Text>
      <VStack align="stretch" gap={6}>
        {/* Basic Hierarchy */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Basic Layer Hierarchy</Text>
          <VStack align="stretch" gap={2}>
            <Box bg="background" p={4} borderWidth="1px" borderColor="border-strong-01">
              <Text color="foreground" fontWeight="bold">background</Text>
              <Text color="foreground/60" fontSize="sm">Base page background (lowest)</Text>
            </Box>
            <Box bg="layer-01" p={4} borderWidth="1px" borderColor="border-strong-01">
              <Text color="foreground" fontWeight="bold">layer-01</Text>
              <Text color="foreground/60" fontSize="sm">Cards, panels (first elevation)</Text>
            </Box>
            <Box bg="layer-02" p={4} borderWidth="1px" borderColor="border-strong-02">
              <Text color="foreground" fontWeight="bold">layer-02</Text>
              <Text color="foreground/60" fontSize="sm">Elevated panels, popovers (second elevation)</Text>
            </Box>
            <Box bg="layer-03" p={4} borderWidth="1px" borderColor="border-strong-03">
              <Text color="foreground" fontWeight="bold">layer-03</Text>
              <Text color="foreground/60" fontSize="sm">Highest elevation (dropdowns, modals)</Text>
            </Box>
          </VStack>
        </Box>

        {/* ADR-008 Explanation */}
        <Box bg="muted" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="sm" fontWeight="semibold" mb={2} color="foreground">
            ADR-008: Light Mode Alternating Pattern
          </Text>
          <VStack align="start" gap={2}>
            <Text fontSize="sm" color="on-muted">
              <strong>Light mode:</strong> Layers alternate (white → gray → white → gray) to create clear visual nesting.
              Progressive darkening on white becomes indistinguishable.
            </Text>
            <Text fontSize="sm" color="on-muted">
              <strong>Dark mode:</strong> Layers progressively lighten (darkest → progressively lighter) for depth perception.
            </Text>
            <Text fontSize="sm" color="on-muted" fontStyle="italic">
              Current mode: <strong>{colorMode}</strong> - Switch modes to see the difference in pattern.
            </Text>
          </VStack>
        </Box>

        {/* Nested Example - Demonstrates Alternating */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Nested Surfaces Example</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            {colorMode === "light"
              ? "Light mode: Notice how layers alternate (white→gray→white) creating visual 'popup' effect"
              : "Dark mode: Notice progressive lightening for depth perception"
            }
          </Text>
          <Box bg="background" p={4} borderWidth="1px" borderColor="border-strong-01">
            <Text fontSize="xs" color="foreground/60" mb={2}>background (page)</Text>
            <Box bg="layer-01" p={4} borderWidth="1px" borderColor="border-strong-01">
              <Text fontSize="xs" color="foreground/60" mb={2}>layer-01 (card)</Text>
              <Box bg="layer-02" p={4} borderWidth="1px" borderColor="border-strong-02">
                <Text fontSize="xs" color="foreground/60" mb={2}>layer-02 (modal)</Text>
                <Box bg="layer-03" p={3} borderWidth="1px" borderColor="border-strong-03">
                  <Text fontSize="xs" color="foreground">layer-03 (dropdown over modal)</Text>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Card with Hover State */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Interactive Card (Hover State)</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Demonstrates <code>layer-hover-01</code> and <code>tertiary/8</code> opacity pattern
          </Text>
          <HStack gap={4} wrap="wrap">
            <Box
              bg="layer-01"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border-strong-01"
              cursor="pointer"
              _hover={{ bg: "layer-hover-01" }}
              transition="all 0.2s"
              minW="200px"
            >
              <Text fontWeight="bold" mb={2}>Movie Card</Text>
              <Text fontSize="sm" color="on-muted">Hover to see layer-hover-01</Text>
            </Box>
            <Box
              bg="layer-01"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border-strong-01"
              cursor="pointer"
              _hover={{ bg: "tertiary/8" }}
              transition="all 0.2s"
              minW="200px"
            >
              <Text fontWeight="bold" mb={2}>List Item</Text>
              <Text fontSize="sm" color="on-muted">Hover to see tertiary/8</Text>
            </Box>
          </HStack>
        </Box>

        {/* Modal/Dialog Example */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Modal/Dialog Pattern</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Shows backdrop overlay and <code>layer-02</code> surface
          </Text>
          {/* Simulated backdrop */}
          <Box position="relative" bg="background" p={8} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
            {/* Backdrop overlay */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="foreground/30"
              borderRadius="md"
            />
            {/* Modal */}
            <Box
              position="relative"
              bg="layer-02"
              p={6}
              borderRadius="md"
              boxShadow="shadow-lg"
              borderWidth="1px"
              borderColor="border-strong-02"
              maxW="400px"
              mx="auto"
            >
              <HStack justify="space-between" mb={4}>
                <Text fontWeight="bold">Modal Dialog</Text>
                <Text
                  fontSize="xl"
                  cursor="pointer"
                  _hover={{ color: "tertiary" }}
                  color="on-muted"
                >
                  ×
                </Text>
              </HStack>
              <Text fontSize="sm" color="on-muted" mb={4}>
                Modal uses <code>layer-02</code> surface with <code>foreground/30</code> backdrop
              </Text>
              <HStack justify="flex-end" gap={2}>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  borderRadius="md"
                  color="tertiary"
                  _hover={{ color: "tertiary-hover" }}
                  fontSize="sm"
                >
                  Cancel
                </Box>
                <Box
                  as="button"
                  px={4}
                  py={2}
                  borderRadius="md"
                  bg="primary"
                  color="on-primary"
                  _hover={{ bg: "primary-hover" }}
                  fontSize="sm"
                >
                  Confirm
                </Box>
              </HStack>
            </Box>
          </Box>
        </Box>

        {/* Popover/Menu Dropdown */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Popover/Menu Dropdown</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Uses <code>popover</code> surface (contextual layer-02 or layer-03). Trigger follows outline button pattern.
          </Text>
          <Box position="relative">
            {/* Trigger button - uses outline button pattern */}
            <Box
              as="button"
              px={4}
              py={2}
              borderRadius="md"
              borderWidth="1px"
              borderColor="button-outline"
              color="on-button-outline"
              bg="background"
              _hover={{ bg: "tertiary/8", borderColor: "border-strong-02" }}
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "ring",
                outlineOffset: "2px",
              }}
              fontSize="sm"
              mb={2}
            >
              Options ▼
            </Box>
            {/* Dropdown menu (popover surface) */}
            <Box
              bg="popover"
              borderRadius="md"
              boxShadow="shadow-md"
              borderWidth="1px"
              borderColor="border-strong-02"
              minW="200px"
              overflow="hidden"
            >
              {['Edit Item', 'Duplicate', 'Share', 'Delete'].map((item, i) => (
                <Box
                  key={item}
                  px={4}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: "layer-hover-02" }}
                  color={i === 3 ? "destructive" : "foreground"}
                  fontSize="sm"
                  borderTopWidth={i > 0 ? "1px" : "0"}
                  borderColor="border-subtle-02"
                >
                  {item}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Validation Note */}
        <Box p={4} borderTopWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="sm" color="foreground/80" fontStyle="italic">
            Expected: Each layer should be visually distinct. Layer-03 should NOT match background.
            {colorMode === "light" && " Light mode should alternate (white→gray→white)."}
            {colorMode === "dark" && " Dark mode should progressively lighten."}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
