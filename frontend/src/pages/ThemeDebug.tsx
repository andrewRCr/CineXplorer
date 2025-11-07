import { Box, Text, VStack, HStack, Button, Code } from "@chakra-ui/react";
import { useState } from "react";
import { useThemeSelect } from "@/hooks/useThemeSelect";
import { type ThemeName } from "@/theme";
import { ColorModeButton, useColorMode } from "@/components/chakra/color-mode";

/**
 * Theme System Debug Page
 *
 * Visual testing and validation for the unified theme token system.
 */
export default function ThemeDebug() {
  const { theme, setTheme } = useThemeSelect();
  const { colorMode } = useColorMode();

  return (
    <Box
      bg="background"
      color="foreground"
      minH="100vh"
    >
      {/* Sticky Header - flush with navbar bottom, no gap */}
      <Box
        position="sticky"
        top="var(--chakra-sizes-layout-navbar)"
        bg="layer-02"
        borderBottomWidth="1px"
        borderColor="border"
        px={6}
        py={3}
        zIndex={5}
        style={{ willChange: 'transform' }}
      >
        <HStack justify="space-between" gap={4} flexWrap="wrap">
          {/* Title */}
          <Text fontSize="xl" fontWeight="bold" flexShrink={0}>
            Theme System Debug
          </Text>

          {/* Current State (Compact) */}
          <Text fontSize="sm" color="foreground/80" flexShrink={0}>
            {theme === 'ibm-carbon' ? 'IBM Carbon' : theme === 'github-primer' ? 'GitHub Primer' : 'GitLab Pajamas'} · {colorMode}
          </Text>

          {/* Theme Switcher */}
          <HStack gap={2} flexShrink={0}>
            {(['ibm-carbon', 'github-primer', 'gitlab-pajamas'] as const).map((t) => (
              <Button
                key={t}
                onClick={() => setTheme(t as ThemeName)}
                size="sm"
                bg={theme === t ? "layer-selected-02" : "layer-02"}
                color="foreground"
                borderWidth="1px"
                borderColor="border"
                _hover={{ bg: theme === t ? "layer-selected-02" : "layer-hover-02" }}
                _active={{ bg: "layer-active-02" }}
              >
                {t === 'ibm-carbon' ? 'IBM' : t === 'github-primer' ? 'GitHub' : 'GitLab'}
              </Button>
            ))}
            <ColorModeButton
              bg="layer-02"
              _hover={{ bg: "layer-hover-02" }}
              _active={{ bg: "layer-active-02" }}
            />
          </HStack>
        </HStack>
      </Box>

      {/* Content */}
      <VStack align="stretch" gap={6} maxW="800px" mx="auto" p={8}>
        {/* Opacity Modifier Tests */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Opacity Modifier Tests</Text>
          <VStack align="stretch" gap={4}>
            {/* Test with semantic tokens */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Semantic Tokens with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                <Box bg="primary/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">primary/100</Text>
                </Box>
                <Box bg="primary/80" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">primary/80</Text>
                </Box>
                <Box bg="primary/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">primary/60</Text>
                </Box>
                <Box bg="primary/40" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">primary/40</Text>
                </Box>
                <Box bg="primary/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">primary/20</Text>
                </Box>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Destructive Token with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                <Box bg="destructive/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">destructive/100</Text>
                </Box>
                <Box bg="destructive/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">destructive/60</Text>
                </Box>
                <Box bg="destructive/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">destructive/20</Text>
                </Box>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Accent Token with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                <Box bg="accent/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">accent/100</Text>
                </Box>
                <Box bg="accent/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">accent/60</Text>
                </Box>
                <Box bg="accent/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">accent/20</Text>
                </Box>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Muted Token with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                <Box bg="muted/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">muted/100</Text>
                </Box>
                <Box bg="muted/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">muted/60</Text>
                </Box>
                <Box bg="muted/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">muted/20</Text>
                </Box>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Text Colors with Opacity</Text>
              <Box bg="background" p={4} borderWidth="1px" borderColor="border">
                <VStack align="start" gap={2}>
                  <Text color="foreground/100">foreground/100 - Full opacity</Text>
                  <Text color="foreground/80">foreground/80 - 80% opacity</Text>
                  <Text color="foreground/60">foreground/60 - 60% opacity</Text>
                  <Text color="foreground/40">foreground/40 - 40% opacity</Text>
                  <Text color="foreground/20">foreground/20 - 20% opacity</Text>
                </VStack>
              </Box>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Border Colors with Opacity</Text>
              <HStack gap={2} wrap="wrap">
                <Box p={4} borderWidth="2px" borderColor="border/100" minW="150px">
                  <Text fontSize="sm">border/100</Text>
                </Box>
                <Box p={4} borderWidth="2px" borderColor="border/60" minW="150px">
                  <Text fontSize="sm">border/60</Text>
                </Box>
                <Box p={4} borderWidth="2px" borderColor="border/20" minW="150px">
                  <Text fontSize="sm">border/20</Text>
                </Box>
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* ========== UNIFIED TOKENS TESTING (Phase 3) ========== */}

        {/* Layer System */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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

        {/* Shadow System */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Shadow System</Text>
          <VStack align="stretch" gap={6}>
            <HStack gap={4} wrap="wrap" justify="center">
              <Box
                bg="layer-01"
                p={8}
                borderRadius="md"
                boxShadow="shadow-sm"
                minW="200px"
                textAlign="center"
              >
                <Text fontWeight="bold" mb={2}>shadow-sm</Text>
                <Text fontSize="sm" color="foreground/60">Subtle (cards)</Text>
              </Box>
              <Box
                bg="layer-01"
                p={8}
                borderRadius="md"
                boxShadow="shadow-md"
                minW="200px"
                textAlign="center"
              >
                <Text fontWeight="bold" mb={2}>shadow-md</Text>
                <Text fontSize="sm" color="foreground/60">Moderate (popovers)</Text>
              </Box>
              <Box
                bg="layer-01"
                p={8}
                borderRadius="md"
                boxShadow="shadow-lg"
                minW="200px"
                textAlign="center"
              >
                <Text fontWeight="bold" mb={2}>shadow-lg</Text>
                <Text fontSize="sm" color="foreground/60">Large (modals)</Text>
              </Box>
            </HStack>
            <Box p={4}>
              <Text fontSize="sm" color="foreground/80" fontStyle="italic">
                Expected: Progressive depth increase from sm → md → lg. Shadows should be clearly visible.
                Note: IBM Carbon uses minimal shadows (prefers layer colors).
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* Border Hierarchy */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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

        {/* Interaction States */}
        <InteractionStatesSection />
      </VStack>
    </Box>
  );
}

/**
 * Interaction States Section - Material Design Opacity Overlay Implementation
 *
 * Shows the current implementation per ADR-009: Material Design 3 opacity overlays
 * (8% hover, 12% selected/active) for consistent cross-theme behavior.
 */
function InteractionStatesSection() {
  const [selectedLayer01, setSelectedLayer01] = useState<number | null>(null);
  const [selectedLayer02, setSelectedLayer02] = useState<number | null>(null);

  return (
    <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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
            <Text fontSize="xs" color="foreground/60" mb={3}>On background (layer-01 cards):</Text>
            <HStack gap={3} wrap="wrap">
              {[1, 2, 3].map((i) => (
                <Box
                  key={`layer01-${i}`}
                  bg="layer-01"
                  p={4}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="border"
                  cursor="pointer"
                  minW="160px"
                  onClick={() => setSelectedLayer01(selectedLayer01 === i ? null : i)}
                  _hover={{ bg: "layer-hover-01" }}
                  {...(selectedLayer01 === i && { bg: "layer-selected-01" })}
                >
                  <Text fontSize="sm" textAlign="center" fontWeight="medium">
                    {selectedLayer01 === i ? "Selected" : "Hover/Click me"}
                  </Text>
                </Box>
              ))}
            </HStack>

            {/* Static Reference Swatches */}
            <HStack gap={3} mt={4}>
              <Box bg="layer-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border" minW="120px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Default (layer-01)</Text>
              </Box>
              <Box bg="layer-hover-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border" minW="120px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Hover (+8% fg)</Text>
              </Box>
              <Box bg="layer-selected-01" p={3} borderRadius="md" borderWidth="1px" borderColor="border" minW="120px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Selected (+12% fg)</Text>
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
          <Box bg="layer-01" p={4} borderRadius="md" borderWidth="1px" borderColor="border">
            <Text fontSize="xs" color="foreground/60" mb={3}>On layer-01 (layer-02 elevated elements):</Text>
            <HStack gap={3} wrap="wrap">
              {[1, 2, 3].map((i) => (
                <Box
                  key={`layer02-${i}`}
                  bg="layer-02"
                  p={4}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="border"
                  cursor="pointer"
                  minW="160px"
                  onClick={() => setSelectedLayer02(selectedLayer02 === i ? null : i)}
                  _hover={{ bg: "layer-hover-02" }}
                  {...(selectedLayer02 === i && { bg: "layer-selected-02" })}
                >
                  <Text fontSize="sm" textAlign="center" fontWeight="medium">
                    {selectedLayer02 === i ? "Selected" : "Hover/Click me"}
                  </Text>
                </Box>
              ))}
            </HStack>

            {/* Static Reference Swatches */}
            <HStack gap={3} mt={4}>
              <Box bg="layer-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border" minW="120px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Default (layer-02)</Text>
              </Box>
              <Box bg="layer-hover-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border" minW="120px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Hover (+8% fg)</Text>
              </Box>
              <Box bg="layer-selected-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border" minW="120px">
                <Text fontSize="xs" textAlign="center" color="foreground/60">Selected (+12% fg)</Text>
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