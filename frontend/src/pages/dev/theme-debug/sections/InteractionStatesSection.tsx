import { Box, Text, VStack, HStack, Code } from "@chakra-ui/react";
import { useState } from "react";

/**
 * Interaction States Section - Material Design Opacity Overlay Implementation
 *
 * Shows the current implementation per ADR-009: Material Design 3 opacity overlays
 * (8% hover, 12% selected/active) for consistent cross-theme behavior.
 */
export function InteractionStatesSection() {
  const [selectedLayer01, setSelectedLayer01] = useState(false);
  const [selectedLayer02, setSelectedLayer02] = useState(false);

  return (
    <Box id="interaction-states" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Interaction States</Text>
      <VStack align="stretch" gap={6}>
        {/* Layer-01 States (Interactive Cards/List Items) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={3}>Layer-01 States (Cards/List Items)</Text>
          <Text fontSize="sm" color="foreground/70" mb={4}>
            Hover over or click cards to see interaction states. These use the <Code fontSize="xs">layer-hover-01</Code> and <Code fontSize="xs">layer-selected-01</Code> tokens.
          </Text>

          {/* Container showing layer-01 context */}
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <Text fontSize="xs" color="foreground/60" mb={3}>On background (layer-01 card):</Text>
            <Box display="flex" justifyContent="center">
              <Box
                bg={selectedLayer01 ? "layer-selected-01" : "layer-01"}
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor="border-strong-01"
                cursor="pointer"
                minW="160px"
                onClick={() => setSelectedLayer01(!selectedLayer01)}
                _hover={{ bg: selectedLayer01 ? "layer-selected-01" : "layer-hover-01" }}
              >
                <Text fontSize="sm" textAlign="center" fontWeight="medium">
                  {selectedLayer01 ? "Selected" : "Hover/Click me"}
                </Text>
              </Box>
            </Box>

            {/* Static Reference Swatches */}
            <HStack gap={2} mt={4} justify="center" wrap="wrap">
              <Box bg="layer-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-01" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Default (layer-01)</Text>
              </Box>
              <Box bg="layer-hover-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-01" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Hover (+8% fg)</Text>
              </Box>
              <Box bg="layer-selected-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-01" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Selected (+12% fg)</Text>
              </Box>
              <Box bg="layer-active-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-01" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Active (+12% fg)</Text>
              </Box>
            </HStack>
          </Box>
        </Box>

        {/* Layer-02 States (Elevated Surfaces) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={3}>Layer-02 States (Elevated Surfaces)</Text>
          <Text fontSize="sm" color="foreground/70" mb={4}>
            Same opacity overlay calculation applied to layer-02. Uses <Code fontSize="xs">layer-hover-02</Code> and <Code fontSize="xs">layer-selected-02</Code> tokens.
          </Text>

          {/* Container showing layer-02 context */}
          <Box bg="layer-01" p={4} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
            <Text fontSize="xs" color="foreground/60" mb={3}>On layer-01 (layer-02 elevated element):</Text>
            <Box display="flex" justifyContent="center">
              <Box
                bg={selectedLayer02 ? "layer-selected-02" : "layer-02"}
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor="border-strong-02"
                cursor="pointer"
                minW="160px"
                onClick={() => setSelectedLayer02(!selectedLayer02)}
                _hover={{ bg: selectedLayer02 ? "layer-selected-02" : "layer-hover-02" }}
              >
                <Text fontSize="sm" textAlign="center" fontWeight="medium">
                  {selectedLayer02 ? "Selected" : "Hover/Click me"}
                </Text>
              </Box>
            </Box>

            {/* Static Reference Swatches */}
            <HStack gap={2} mt={4} justify="center" wrap="wrap">
              <Box bg="layer-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-02" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Default (layer-02)</Text>
              </Box>
              <Box bg="layer-hover-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-02" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Hover (+8% fg)</Text>
              </Box>
              <Box bg="layer-selected-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-02" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Selected (+12% fg)</Text>
              </Box>
              <Box bg="layer-active-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border-strong-02" minW="110px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Active (+12% fg)</Text>
              </Box>
            </HStack>
          </Box>
        </Box>

        {/* Implementation and Expected (consistent with other sections) */}
        <Box p={4}>
          <Text fontSize="sm" color="foreground/80" fontStyle="italic" lineHeight="1.7">
            <strong>Expected:</strong> Hover/selected/active states should be visibly different from default
            across all 6 theme combinations. Universal opacity approach ensures consistent feel across themes.
            <br />
            <br />
            <strong>Implementation:</strong> Per ADR-009, all interaction states use Material Design 3's
            opacity overlay approach for consistency. Formula: base layer color + foreground color @ opacity
            (8% hover, 12% selected/active).
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
