import { Box, Text, VStack, HStack } from "@chakra-ui/react";

/**
 * Opacity System Section - Semantic Token Transparency
 *
 * Demonstrates the opacity modifier system that allows any semantic token
 * to use transparency with `/opacity` syntax (e.g., `primary/80` = 80% opacity).
 *
 * Per ADR-009 and ADR-016, interaction states use a dual opacity system:
 * - MD3 baseline (8%/12%): outline/ghost/secondary buttons
 * - Improved (12%/16%): solid buttons, layer surfaces for better visibility
 */
export function OpacitySystemSection() {
  return (
    <Box id="opacity-system" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Opacity System</Text>
      <VStack align="stretch" gap={6}>

        {/* Introduction */}
        <Box>
          <Text fontSize="sm" color="on-muted" mb={3}>
            The opacity system allows any semantic token to use transparency with <code>/opacity</code> syntax
            (e.g., <code>primary/80</code> = 80% opacity). Per <strong>ADR-009</strong> and <strong>ADR-016</strong>,
            interaction states use a dual opacity system: MD3 baseline (8%/12%) for outline/ghost/secondary buttons,
            and improved (12%/16%) for solid buttons and layer surfaces to ensure better visibility across themes.
          </Text>
          <Text fontSize="sm" color="on-muted">
            See <strong>strategy-component-styling.md</strong> "Opacity Modifier Reference" section (lines 1105-1121) for complete patterns.
          </Text>
        </Box>

        {/* Standard Interaction Values */}
        <Box bg="muted" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="sm" fontWeight="semibold" mb={3} color="foreground">
            Interaction Opacity Values (ADR-009 + ADR-016)
          </Text>
          <VStack align="stretch" gap={3}>
            {/* MD3 Baseline (outline/ghost/secondary buttons) */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="foreground" mb={1}>MD3 Baseline (outline/ghost/secondary):</Text>
              <VStack align="stretch" gap={1} pl={2}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="on-muted"><strong>8%</strong> - Hover</Text>
                  <Text fontSize="xs" color="on-muted" fontFamily="mono">tertiary/8</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="on-muted"><strong>12%</strong> - Active/pressed</Text>
                  <Text fontSize="xs" color="on-muted" fontFamily="mono">tertiary/12</Text>
                </HStack>
              </VStack>
            </Box>

            {/* Improved for Solids (ADR-016) */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="foreground" mb={1}>Improved (solid buttons/layer surfaces):</Text>
              <VStack align="stretch" gap={1} pl={2}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="on-muted"><strong>12%</strong> - Hover/selected</Text>
                  <Text fontSize="xs" color="on-muted" fontFamily="mono">layer-hover-01, layer-selected-01</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="on-muted"><strong>16%</strong> - Active/drag</Text>
                  <Text fontSize="xs" color="on-muted" fontFamily="mono">layer-active-01, drag-active</Text>
                </HStack>
              </VStack>
            </Box>

            {/* Other Values */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="foreground" mb={1}>Other values:</Text>
              <VStack align="stretch" gap={1} pl={2}>
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
            Examples using actual interaction opacity values. Prefer dedicated semantic tokens
            (layer-hover-01, primary-hover) over manual opacity syntax for consistency.
          </Text>

          <VStack align="stretch" gap={4}>
            {/* Primary token with interaction values */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Primary Token (Interaction Values)</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 16, 12, 8].map((opacity) => (
                  <Box
                    key={opacity}
                    bg={`primary/${opacity}`}
                    p={4}
                    borderWidth="1px"
                    borderColor="border-subtle-02"
                    minW="130px"
                  >
                    <Text color={opacity === 100 ? "on-primary" : "foreground"} fontSize="sm">primary/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
              <Text fontSize="xs" color="foreground/60" mt={2}>
                100: solid, 16: active, 12: hover/selected, 8: baseline hover
              </Text>
            </Box>

            {/* Tertiary token with interaction values */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Tertiary Token (Interaction Values)</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 12, 8].map((opacity) => (
                  <Box
                    key={opacity}
                    bg={`tertiary/${opacity}`}
                    p={4}
                    borderWidth="1px"
                    borderColor="border-subtle-02"
                    minW="130px"
                  >
                    <Text color={opacity === 100 ? "on-tertiary" : "foreground"} fontSize="sm">tertiary/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
              <Text fontSize="xs" color="foreground/60" mt={2}>
                100: solid, 12: active, 8: hover (MD3 baseline for outline/ghost buttons)
              </Text>
            </Box>

            {/* Foreground with overlay values */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Foreground Token (Overlays & Text)</Text>
              <Box bg="background" p={4} borderWidth="1px" borderColor="border-strong-01">
                <VStack align="start" gap={2}>
                  {[100, 80, 30, 16, 12].map((opacity) => (
                    <Text key={opacity} color={`foreground/${opacity}`}>
                      foreground/{opacity} - {opacity === 30 ? 'backdrop overlay' : opacity === 16 || opacity === 12 ? 'layer interaction' : opacity === 80 ? 'secondary text' : 'primary text'}
                    </Text>
                  ))}
                </VStack>
              </Box>
              <Text fontSize="xs" color="foreground/60" mt={2}>
                100/80: text, 30: backdrop, 16: layer active, 12: layer hover/selected
              </Text>
            </Box>

            {/* Border colors with opacity */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Border Colors with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                {[100, 60, 30].map((opacity) => (
                  <Box
                    key={opacity}
                    p={4}
                    borderWidth="2px"
                    borderColor={`border/${opacity}`}
                    minW="130px"
                  >
                    <Text fontSize="sm">border/{opacity}</Text>
                  </Box>
                ))}
              </HStack>
              <Text fontSize="xs" color="foreground/60" mt={2}>
                Demonstration of border opacity - use border-strong-* hierarchy in practice
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* References */}
        <Box p={3} borderTopWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="xs" color="foreground/70" fontStyle="italic">
            <strong>References:</strong> ADR-009 (Material Design 3 Opacity Overlays),
            ADR-016 (Improve Interaction State Contrast),
            strategy-component-styling.md "Opacity Modifier Reference" section (lines 1105-1121)
          </Text>
        </Box>

      </VStack>
    </Box>
  );
}
