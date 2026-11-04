import { Box, Text, VStack, HStack, Button } from "@chakra-ui/react";
import { useThemeSelect } from "@/hooks/useThemeSelect";
import { type ThemeName } from "@/theme";
import {
  ColorModeButton,
  useColorMode,
} from "@/components/core/chakra/color-mode";

// Section components
import { SemanticColorsSection } from "./sections/SemanticColorsSection";
import { CineXplorerExtensionsSection } from "./sections/CineXplorerExtensionsSection";
import { LayerSystemSection } from "./sections/LayerSystemSection";
import { ShadowSystemSection } from "./sections/ShadowSystemSection";
import { BorderHierarchySection } from "./sections/BorderHierarchySection";
import { OpacitySystemSection } from "./sections/OpacitySystemSection";
import { InteractionStatesSection } from "./sections/InteractionStatesSection";
import { UIElementTokensSection } from "./sections/UIElementTokensSection";
import { ButtonPatternsSection } from "./sections/ButtonPatternsSection";
import { FormControlsSection } from "./sections/FormControlsSection";
import { NavigationPatternsSection } from "./sections/NavigationPatternsSection";
import { FeedbackStatusSection } from "./sections/FeedbackStatusSection";
import { InteractiveListsSection } from "./sections/InteractiveListsSection";

/**
 * Theme display name mappings
 */
const THEME_DISPLAY_NAMES: Record<ThemeName, string> = {
  "ibm-carbon": "IBM Carbon",
  "github-primer": "GitHub Primer",
  "gitlab-pajamas": "GitLab Pajamas",
  "material-design-3": "Material Design 3",
} as const;

const THEME_SHORT_NAMES: Record<ThemeName, string> = {
  "ibm-carbon": "IBM",
  "github-primer": "GitHub",
  "gitlab-pajamas": "GitLab",
  "material-design-3": "Material",
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
      const navbarHeight = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--chakra-sizes-layout-navbar");
      const headerOffset = navbarHeight ? parseInt(navbarHeight, 10) : 120; // Fallback to 120px
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <Box bg="background" color="foreground" minH="100vh">
      {/* Sticky Header - flush with navbar bottom, no gap */}
      <Box
        position="sticky"
        top="var(--chakra-sizes-layout-navbar)"
        bg="layer-02"
        borderBottomWidth="1px"
        borderColor="border-strong-02"
        px={6}
        py={3}
        zIndex={5}
        style={{ willChange: "transform" }}
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
              {(
                [
                  "ibm-carbon",
                  "github-primer",
                  "gitlab-pajamas",
                  "material-design-3",
                ] as const
              ).map((t) => (
                <Button
                  key={t}
                  onClick={() => setTheme(t as ThemeName)}
                  size="sm"
                  variant="subtle"
                  bg={theme === t ? "button-subtle-selected" : "button-subtle"}
                  color={
                    theme === t
                      ? "on-button-subtle-selected"
                      : "on-button-subtle"
                  }
                  _hover={{
                    bg:
                      theme === t
                        ? "button-subtle-selected"
                        : "secondary-hover",
                  }}
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

          {/* Jump links row - compact hyperlink style with grouping */}
          <Box borderTopWidth="1px" borderColor="border-subtle-02" pt={2}>
            <HStack
              gap={3}
              flexWrap="wrap"
              justify="center"
              fontSize="sm"
              pb={0}
            >
              {/* Foundation group */}
              {[
                { id: "semantic-colors", label: "Colors" },
                { id: "cinexplorer-extensions", label: "Extensions" },
                { id: "layers", label: "Layers" },
                { id: "shadows", label: "Shadows" },
                { id: "borders", label: "Borders" },
                { id: "opacity-system", label: "Opacity" },
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

              {/* Separator */}
              <Text color="border" fontSize="lg" userSelect="none">
                |
              </Text>

              {/* Interaction group */}
              {[
                { id: "interaction-states", label: "States" },
                { id: "ui-elements", label: "UI" },
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

              {/* Separator */}
              <Text color="border" fontSize="lg" userSelect="none">
                |
              </Text>

              {/* Components group */}
              {[
                { id: "button-patterns", label: "Buttons" },
                { id: "form-controls", label: "Forms" },
                { id: "navigation-patterns", label: "Navigation" },
                { id: "feedback-status", label: "Feedback" },
                { id: "interactive-lists", label: "Lists" },
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
        {/* Foundation */}
        <SemanticColorsSection />
        <CineXplorerExtensionsSection />
        <LayerSystemSection />
        <ShadowSystemSection />
        <BorderHierarchySection />
        <OpacitySystemSection />

        {/* Interaction */}
        <InteractionStatesSection />
        <UIElementTokensSection />

        {/* Components */}
        <ButtonPatternsSection />
        <FormControlsSection />
        <NavigationPatternsSection />
        <FeedbackStatusSection />
        <InteractiveListsSection />
      </VStack>
    </Box>
  );
}
