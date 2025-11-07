import { Box, Text, VStack, HStack, Button, Code, Input } from "@chakra-ui/react";
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 120; // Account for sticky header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

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
        <VStack align="stretch" gap={3}>
          {/* Top row: Title and controls */}
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

          {/* Jump links row - compact hyperlink style */}
          <Box borderTopWidth="1px" borderColor="border-subtle-02" pt={2}>
            <HStack gap={3} flexWrap="wrap" justify="center" fontSize="sm" pb={0}>
              {[
                { id: 'semantic-colors', label: 'Colors' },
                { id: 'cinexplorer-extensions', label: 'Extensions' },
                { id: 'layers', label: 'Layers' },
                { id: 'borders', label: 'Borders' },
                { id: 'shadows', label: 'Shadows' },
                { id: 'interaction-states', label: 'States' },
                { id: 'ui-elements', label: 'UI' },
                { id: 'opacity-modifiers', label: 'Opacity' },
              ].map(({ id, label }) => (
                <Text
                  key={id}
                  as="button"
                  onClick={() => scrollToSection(id)}
                  color="accent"
                  cursor="pointer"
                  textDecoration="underline"
                  _hover={{ color: "accent-hover" }}
                >
                  {label}
                </Text>
              ))}
            </HStack>
          </Box>
        </VStack>
      </Box>

      {/* Content */}
      <VStack align="stretch" gap={6} maxW="800px" mx="auto" p={8}>
        {/* Semantic Colors */}
        <SemanticColorsSection />

        {/* CineXplorer Extensions */}
        <CineXplorerExtensionsSection />

        {/* Layer System */}
        <LayerSystemSection />

        {/* Border Hierarchy */}
        <BorderHierarchySection />

        {/* Shadow System */}
        <ShadowSystemSection />

        {/* Interaction States */}
        <InteractionStatesSection />

        {/* UI Element Tokens */}
        <UIElementTokensSection />

        {/* Opacity Modifier Tests */}
        <Box id="opacity-modifiers" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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

      </VStack>
    </Box>
  );
}

/**
 * Semantic Colors Section - Brand, Core Actions, and Status Colors
 *
 * Shows all semantic color tokens with their foreground pairs and usage examples.
 * Per ADR-010: Primary/Secondary/Tertiary hierarchy with optional brand separation.
 */
function SemanticColorsSection() {
  const { theme } = useThemeSelect();

  return (
    <Box id="semantic-colors" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Semantic Colors</Text>
      <VStack align="stretch" gap={4}>
        {/* Brand Identity (Optional) - Always shown, with note for themes without brand colors */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Brand Identity (Optional)</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            {theme === 'github-primer' ? (
              // GitHub has no brand colors
              <VStack gap={2}>
                <Text fontSize="sm" color="foreground/60" textAlign="center" fontStyle="italic">
                  This theme does not define brand colors.
                </Text>
                <Text fontSize="xs" color="foreground/60" textAlign="center" maxW="600px" lineHeight="1.5">
                  GitHub uses a black/white logo with no specific brand color. The <Code fontSize="xs">brand</Code> and <Code fontSize="xs">brandSecondary</Code> tokens are undefined for this theme.
                </Text>
              </VStack>
            ) : (
              // IBM Carbon and GitLab Pajamas have brand colors
              <>
                <HStack gap={3} wrap="wrap" justify="center">
                  <Box bg="brand" color="foreground" p={3} borderRadius="md" minW="140px" textAlign="center" borderWidth="1px" borderColor="border">
                    <Text fontWeight="bold" fontSize="sm">brand</Text>
                    <Text fontSize="xs" color="foreground/60" mt={1}>
                      {theme === 'ibm-carbon' ? 'IBM Blue' : 'GitLab Purple'}
                    </Text>
                  </Box>
                  {theme === 'gitlab-pajamas' && (
                    <Box bg="brandSecondary" color="foreground" p={3} borderRadius="md" minW="140px" textAlign="center" borderWidth="1px" borderColor="border">
                      <Text fontWeight="bold" fontSize="sm">brandSecondary</Text>
                      <Text fontSize="xs" color="foreground/60" mt={1}>GitLab Orange</Text>
                    </Box>
                  )}
                </HStack>
                <Text fontSize="xs" color="foreground/60" mt={2} textAlign="center" maxW="600px" mx="auto" lineHeight="1.5">
                  Brand tokens are for logo/identity only. Use functional tokens (primary/tertiary) for UI components.
                </Text>
              </>
            )}
          </Box>
        </Box>

        {/* Core Actions - Primary/Secondary/Tertiary/Muted hierarchy per ADR-010 */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Core Actions</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <HStack gap={3} wrap="wrap" justify="center">
              <Box bg="primary" color="primary-foreground" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">primary</Text>
              </Box>
              <Box bg="secondary" color="secondary-foreground" p={3} borderRadius="md" minW="140px" textAlign="center" borderWidth="1px" borderColor="border-strong-01">
                <Text fontWeight="bold" fontSize="sm">secondary</Text>
              </Box>
              <Box bg="tertiary" color="tertiary-foreground" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">tertiary</Text>
              </Box>
              <Box bg="muted" color="muted-foreground" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">muted</Text>
              </Box>
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={2} textAlign="center" maxW="600px" mx="auto" lineHeight="1.5">
              Per ADR-010: Primary (background token for buttons), Secondary (outline pattern), Tertiary (foreground token for links), Muted (non-interactive).
            </Text>
          </Box>
        </Box>

        {/* Secondary Outline Pattern */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="foreground/80">
            Secondary Token Usage Pattern:
          </Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={3}>
              <Box
                bg="secondary"
                color="secondary-foreground"
                borderWidth="1px"
                borderColor="border-strong-01"
                p={3}
                borderRadius="md"
                minW="200px"
                textAlign="center"
              >
                <Text fontWeight="bold" fontSize="sm">Secondary Button (Outline)</Text>
              </Box>
              <Text fontSize="xs" color="foreground/60" textAlign="center" maxW="600px" lineHeight="1.5">
                Industry standard pattern (Bootstrap, Carbon, Primer, Pajamas): Secondary uses outline/ghost styling
                with <Code fontSize="xs">border-strong-01</Code> token (per strategy-border-system.md). Background uses
                official secondary token + mandatory 1px border for visual hierarchy (primary=filled, secondary=outline)
                and cross-theme consistency.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Status Colors - All 4 in one row, content centered, header not */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Status Colors</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <HStack gap={3} wrap="wrap" justify="center">
              <Box bg="success" color="on-success" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">success</Text>
              </Box>
              <Box bg="warning" color="on-warning" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">warning</Text>
              </Box>
              <Box bg="info" color="on-info" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">info</Text>
              </Box>
              <Box bg="destructive" color="on-destructive" p={3} borderRadius="md" minW="140px" textAlign="center">
                <Text fontWeight="bold" fontSize="sm">destructive</Text>
              </Box>
            </HStack>
          </Box>
        </Box>

        <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2} textAlign="center">
          Core action colors use -foreground pairs for text. Status colors show solid backgrounds with on-[status] text colors for optimal contrast.
        </Text>
      </VStack>
    </Box>
  );
}

/**
 * CineXplorer Extensions Section - App-Specific Tokens
 *
 * Shows movie-app-specific tokens (ratings, badges, drag-and-drop).
 */
function CineXplorerExtensionsSection() {
  return (
    <Box id="cinexplorer-extensions" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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
                <Text color="rating" fontWeight="bold" fontSize="xl">★★★★☆</Text>
              </Box>
            </Box>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              Stars use rating token color (IMDb gold) on layer-01 (movie cards)
            </Text>
          </Box>

          {/* Badge Token */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">Genre Badges</Text>
            <HStack gap={2} justify="center">
              <Box bg="badge" color="badge-foreground" px={3} py={1} borderRadius="full" fontSize="sm">
                Action
              </Box>
              <Box bg="badge" color="badge-foreground" px={3} py={1} borderRadius="full" fontSize="sm">
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
              <Box bg="drag-active" p={2} px={3} borderRadius="md" borderWidth="2px" borderColor="border" borderStyle="dashed">
                <Text fontSize="xs" color="foreground">drag-active</Text>
              </Box>
              <Box bg="drop-zone" p={2} px={3} borderRadius="md" borderWidth="2px" borderColor="border" borderStyle="dashed">
                <Text fontSize="xs" color="foreground">drop-zone</Text>
              </Box>
            </HStack>
          </Box>
        </VStack>
      </Box>
      <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2} mt={3} textAlign="center">
        Note: TMDB community scores use status color tokens (success/info/warning) per MovieUserScore component thresholds.
      </Text>
    </Box>
  );
}

/**
 * Layer System Section - Elevation Hierarchy
 */
function LayerSystemSection() {
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

/**
 * Border Hierarchy Section - Per-Layer Border System
 */
function BorderHierarchySection() {
  return (
    <Box id="borders" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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

/**
 * Shadow System Section - Elevation Differentiation
 */
function ShadowSystemSection() {
  return (
    <Box id="shadows" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Shadow System</Text>
      <VStack align="stretch" gap={4}>
        {/* shadow-sm: cards on background */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>shadow-sm (cards)</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <Box bg="layer-01" p={6} borderRadius="md" boxShadow="shadow-sm" textAlign="center">
              <Text fontWeight="bold">Card with shadow-sm</Text>
              <Text fontSize="xs" color="foreground/60">layer-01 on background</Text>
            </Box>
          </Box>
        </Box>

        {/* shadow-md: popovers on layer-01 */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>shadow-md (popovers)</Text>
          <Box bg="layer-01" p={4} borderRadius="md" borderWidth="1px" borderColor="border">
            <Box bg="layer-02" p={6} borderRadius="md" boxShadow="shadow-md" textAlign="center">
              <Text fontWeight="bold">Popover with shadow-md</Text>
              <Text fontSize="xs" color="foreground/60">layer-02 on layer-01</Text>
            </Box>
          </Box>
        </Box>

        {/* shadow-lg: modals on background */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2}>shadow-lg (modals)</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <Box bg="layer-02" p={6} borderRadius="md" boxShadow="shadow-lg" textAlign="center">
              <Text fontWeight="bold">Modal with shadow-lg</Text>
              <Text fontSize="xs" color="foreground/60">layer-02 on background</Text>
            </Box>
          </Box>
        </Box>

        <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2}>
          Expected: Progressive depth from sm → md → lg. IBM Carbon uses minimal shadows (prefers layer colors).
        </Text>
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
    <Box id="interaction-states" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
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
            <HStack gap={3} wrap="wrap" justify="center">
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
            <HStack gap={3} mt={4} justify="center">
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
            <HStack gap={3} wrap="wrap" justify="center">
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
            <HStack gap={3} mt={4} justify="center">
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

/**
 * UI Element Tokens Section - Form Inputs and Focus Indicators
 *
 * Shows tokens for input fields and focus rings.
 */
function UIElementTokensSection() {
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  return (
    <Box id="ui-elements" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>UI Element Tokens</Text>
      <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
        <VStack align="stretch" gap={4}>
          {/* Input Token */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2}>input (form field borders)</Text>
            <Input
              placeholder="Example text input"
              borderColor="input"
              bg="background"
              color="foreground"
              maxW="400px"
              _focus={{ borderColor: "ring", outline: "none", boxShadow: "0 0 0 1px var(--chakra-colors-ring)" }}
            />
          </Box>

          {/* Ring Token */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2}>ring (focus indicator)</Text>
            <Button
              onFocus={() => setFocusedInput('button')}
              onBlur={() => setFocusedInput(null)}
              bg="layer-01"
              color="foreground"
              borderWidth="1px"
              borderColor="border"
              _focus={{ outline: "2px solid", outlineColor: "ring", outlineOffset: "2px" }}
            >
              {focusedInput === 'button' ? 'Focused! (ring visible)' : 'Click or Tab to focus'}
            </Button>
            <Text fontSize="xs" color="foreground/60" fontStyle="italic" mt={2}>
              Try Tab key to see focus ring
            </Text>
          </Box>
        </VStack>
      </Box>
      <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2} mt={3}>
        Focus rings must meet WCAG contrast requirements for keyboard navigation accessibility.
      </Text>
    </Box>
  );
}