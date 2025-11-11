import { Box, Text, VStack, HStack, Button } from "@chakra-ui/react";
import { useThemeSelect } from "@/hooks/useThemeSelect";
import { type ThemeName } from "@/theme";
import { ColorModeButton, useColorMode } from "@/components/chakra/color-mode";

// Section components
import { SemanticColorsSection } from "./sections/SemanticColorsSection";
import { CineXplorerExtensionsSection } from "./sections/CineXplorerExtensionsSection";
import { LayerSystemSection } from "./sections/LayerSystemSection";
import { BorderHierarchySection } from "./sections/BorderHierarchySection";
import { ShadowSystemSection } from "./sections/ShadowSystemSection";
import { InteractionStatesSection } from "./sections/InteractionStatesSection";
import { UIElementTokensSection } from "./sections/UIElementTokensSection";
import { FormControlsSection } from "./sections/FormControlsSection";

/**
 * Theme display name mappings
 */
const THEME_DISPLAY_NAMES: Record<ThemeName, string> = {
  'ibm-carbon': 'IBM Carbon',
  'github-primer': 'GitHub Primer',
  'gitlab-pajamas': 'GitLab Pajamas',
  'material-design-3': 'Material Design 3',
} as const;

const THEME_SHORT_NAMES: Record<ThemeName, string> = {
  'ibm-carbon': 'IBM',
  'github-primer': 'GitHub',
  'gitlab-pajamas': 'GitLab',
  'material-design-3': 'Material',
} as const;

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
      // Calculate header offset from layout token (navbar + sticky header)
      const navbarHeight = getComputedStyle(document.documentElement)
        .getPropertyValue('--chakra-sizes-layout-navbar');
      const headerOffset = navbarHeight ? parseInt(navbarHeight, 10) : 120; // Fallback to 120px
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
              {THEME_DISPLAY_NAMES[theme]} · {colorMode}
            </Text>

            {/* Theme Switcher */}
            <HStack gap={2} flexShrink={0}>
              {(['ibm-carbon', 'github-primer', 'gitlab-pajamas', 'material-design-3'] as const).map((t) => (
                <Button
                  key={t}
                  onClick={() => setTheme(t as ThemeName)}
                  size="sm"
                  variant="subtle"
                  bg={theme === t ? "button-subtle-selected" : "button-subtle"}
                  color={theme === t ? "on-button-subtle-selected" : "on-button-subtle"}
                  _hover={{ bg: theme === t ? "button-subtle-selected" : "secondary-hover" }}
                  _active={{ bg: "secondary-active" }}
                >
                  {THEME_SHORT_NAMES[t]}
                </Button>
              ))}
              <ColorModeButton
                variant="outline"
                borderColor="button-outline"
                color="on-button-outline"
                _hover={{ bg: "tertiary/8", borderColor: "tertiary" }}
                _active={{ bg: "tertiary/12", borderColor: "tertiary" }}
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
                { id: 'form-controls', label: 'Forms' },
                { id: 'ui-elements', label: 'UI' },
                { id: 'opacity-modifiers', label: 'Opacity' },
              ].map(({ id, label }) => (
                <Text
                  key={id}
                  as="button"
                  onClick={() => scrollToSection(id)}
                  color="tertiary"
                  cursor="pointer"
                  textDecoration="underline"
                  _hover={{ color: "tertiary-hover" }}
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

        {/* Form Controls */}
        <FormControlsSection />

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
                <Box bg="tertiary/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">tertiary/100</Text>
                </Box>
                <Box bg="tertiary/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">tertiary/60</Text>
                </Box>
                <Box bg="tertiary/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
                  <Text color="foreground" fontSize="sm">tertiary/20</Text>
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
