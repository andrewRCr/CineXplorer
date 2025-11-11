import { Box, Text, VStack, HStack } from "@chakra-ui/react";

/**
 * Opacity System Section - Semantic Token Transparency
 *
 * Demonstrates the opacity modifier system that allows any semantic token
 * to use transparency with `/opacity` syntax (e.g., `primary/80` = 80% opacity).
 *
 * Per ADR-009, interaction states use Material Design 3's standard opacity
 * values for consistency across themes.
 */
export function OpacitySystemSection() {
  return (
    <Box id="opacity-system" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Opacity System</Text>
      <VStack align="stretch" gap={6}>

        {/* Introduction */}
        <Box>
          <Text fontSize="sm" color="on-muted" mb={3}>
            The opacity system allows any semantic token to use transparency with <code>/opacity</code> syntax
            (e.g., <code>primary/80</code> = 80% opacity). Per <strong>ADR-009</strong>, interaction states use
            Material Design 3's standard opacity values for consistency across themes.
          </Text>
          <Text fontSize="sm" color="on-muted">
            See <strong>strategy-semantic-tokens.md</strong> "Opacity Modifier Reference" section for complete patterns.
          </Text>
        </Box>

        {/* Standard Interaction Values */}
        <Box bg="muted" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="sm" fontWeight="semibold" mb={3} color="foreground">
            Standard Interaction Values (ADR-009)
          </Text>
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>8%</strong> - Hover states</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">layer-hover-01, primary/8</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>12%</strong> - Selected/Active/Focus</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">layer-selected-01, primary/12</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>16%</strong> - Drag active</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">drag-active</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>30%</strong> - Backdrop overlays</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">foreground/30</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>38%</strong> - Disabled states</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">opacity: 0.38</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Common Background Opacities */}
        <Box bg="muted" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="sm" fontWeight="semibold" mb={3} color="foreground">
            Common Background Opacities
          </Text>
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>10%, 20%, 30%</strong> - Alert backgrounds</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">success/10, warning/20</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="on-muted"><strong>50%, 80%</strong> - Semi-transparent overlays</Text>
              <Text fontSize="xs" color="on-muted" fontFamily="mono">background/80</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Syntax Demonstrations */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Syntax Demonstrations</Text>
          <Text fontSize="sm" color="on-muted" mb={4}>
            Examples showing the gradient of opacity values. These are demonstration values - prefer the
            standard interaction values above for actual component usage.
          </Text>

          <VStack align="stretch" gap={4}>
            {/* Semantic tokens */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Semantic Tokens with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 80, 60, 40, 20].map((opacity) => (
                  <Box
                    key={opacity}
                    bg={`primary/${opacity}`}
                    p={4}
                    borderWidth="1px"
                    borderColor="border"
                    minW="150px"
                  >
                    <Text color="foreground" fontSize="sm">primary/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Destructive token */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Destructive Token with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 60, 20].map((opacity) => (
                  <Box
                    key={opacity}
                    bg={`destructive/${opacity}`}
                    p={4}
                    borderWidth="1px"
                    borderColor="border"
                    minW="150px"
                  >
                    <Text color="foreground" fontSize="sm">destructive/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Tertiary token */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Tertiary Token with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 60, 20].map((opacity) => (
                  <Box
                    key={opacity}
                    bg={`tertiary/${opacity}`}
                    p={4}
                    borderWidth="1px"
                    borderColor="border"
                    minW="150px"
                  >
                    <Text color="foreground" fontSize="sm">tertiary/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Muted token */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Muted Token with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 60, 20].map((opacity) => (
                  <Box
                    key={opacity}
                    bg={`muted/${opacity}`}
                    p={4}
                    borderWidth="1px"
                    borderColor="border"
                    minW="150px"
                  >
                    <Text color="foreground" fontSize="sm">muted/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
            </Box>

            {/* Text colors with opacity */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Text Colors with Opacity</Text>
              <Box bg="background" p={4} borderWidth="1px" borderColor="border">
                <VStack align="start" gap={2}>
                  {[100, 80, 60, 40, 20].map((opacity) => (
                    <Text key={opacity} color={`foreground/${opacity}`}>
                      foreground/{opacity} - {opacity}% opacity text
                    </Text>
                  ))}
                </VStack>
              </Box>
            </Box>

            {/* Border colors with opacity */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Border Colors with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 60, 20].map((opacity) => (
                  <Box
                    key={opacity}
                    p={4}
                    borderWidth="2px"
                    borderColor={`border/${opacity}`}
                    minW="150px"
                  >
                    <Text fontSize="sm">border/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* References */}
        <Box p={3} borderTopWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="xs" color="foreground/70" fontStyle="italic">
            <strong>References:</strong> ADR-009 (Material Design 3 Opacity Overlays),
            strategy-semantic-tokens.md "Opacity Modifier Reference" section
          </Text>
        </Box>

      </VStack>
    </Box>
  );
}
