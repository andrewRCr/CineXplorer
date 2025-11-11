import { Box, Text, VStack, HStack, Link, Tabs, Breadcrumb, Code } from "@chakra-ui/react";
import { LuHouse, LuChevronRight } from "react-icons/lu";

/**
 * Navigation Patterns Section
 *
 * Demonstrates navigation UI patterns: inline text links, tabs, and breadcrumbs.
 * Per semantic token strategy: Links use tertiary color with underline for accessibility.
 */
export function NavigationPatternsSection() {
  return (
    <Box id="navigation-patterns" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Navigation Patterns</Text>
      <VStack align="stretch" gap={4}>
        {/* Inline Text Links */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Inline Text Links</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={4} align="center">
              {/* Link in context (matches Register.tsx usage) */}
              <Text color="foreground">
                Already have an account?{" "}
                <Link
                  href="#"
                  color="tertiary"
                  textDecoration="underline"
                  textUnderlineOffset="2px"
                  _hover={{ color: "tertiary-hover" }}
                  _active={{ color: "tertiary-active" }}
                  _focus={{
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                  }}
                >
                  Sign in
                </Link>
              </Text>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Per semantic token strategy: Links use <Code fontSize="xs">tertiary</Code> color with underline for accessibility.
                Underline is required (WCAG) - color alone is insufficient for color-blind users.
                Hover uses <Code fontSize="xs">tertiary-hover</Code>, focus uses <Code fontSize="xs">ring</Code> token.
                Default 1px underline with 2px offset prevents descenders from touching underline.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Tab Patterns */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Tab Patterns</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={4} align="center">
              {/* Basic tabs with states */}
              <VStack gap={2} align="start">
                <Text fontSize="sm" fontWeight="medium">Tab States (default, hover, active/selected):</Text>
                <Tabs.Root defaultValue="overview" maxW="600px">
                  <Tabs.List>
                    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                    <Tabs.Trigger value="details">Details</Tabs.Trigger>
                    <Tabs.Trigger value="reviews">Reviews</Tabs.Trigger>
                    <Tabs.Trigger value="cast" disabled>Cast</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="overview" pt={4}>
                    <Text fontSize="sm" color="foreground">Overview content - shows movie synopsis and key information</Text>
                  </Tabs.Content>
                  <Tabs.Content value="details" pt={4}>
                    <Text fontSize="sm" color="foreground">Details content - technical specifications and metadata</Text>
                  </Tabs.Content>
                  <Tabs.Content value="reviews" pt={4}>
                    <Text fontSize="sm" color="foreground">Reviews content - user ratings and reviews</Text>
                  </Tabs.Content>
                  <Tabs.Content value="cast" pt={4}>
                    <Text fontSize="sm" color="foreground">Cast content (disabled state shown)</Text>
                  </Tabs.Content>
                </Tabs.Root>
              </VStack>

              {/* Variant demonstration */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">Tab Variants:</Text>
                <HStack gap={4} wrap="wrap" align="start" justify="center">
                  {/* Line variant */}
                  <VStack gap={1} align="start">
                    <Text fontSize="xs" color="foreground/60">line (default)</Text>
                    <Tabs.Root defaultValue="tab1" variant="line" size="sm">
                      <Tabs.List>
                        <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
                        <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
                      </Tabs.List>
                    </Tabs.Root>
                  </VStack>

                  {/* Enclosed variant */}
                  <VStack gap={1} align="start">
                    <Text fontSize="xs" color="foreground/60">enclosed</Text>
                    <Tabs.Root defaultValue="tab1" variant="enclosed" size="sm">
                      <Tabs.List>
                        <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
                        <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
                      </Tabs.List>
                    </Tabs.Root>
                  </VStack>

                  {/* Outline variant */}
                  <VStack gap={1} align="start">
                    <Text fontSize="xs" color="foreground/60">outline</Text>
                    <Tabs.Root defaultValue="tab1" variant="outline" size="sm">
                      <Tabs.List>
                        <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
                        <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
                      </Tabs.List>
                    </Tabs.Root>
                  </VStack>
                </HStack>
              </VStack>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Tabs use Chakra v3 defaults for styling. Active tab is indicated by border/underline.
                Disabled state shown with reduced opacity and <Code fontSize="xs">cursor: not-allowed</Code>.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Breadcrumb Patterns */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Breadcrumb Patterns</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={4} align="center">
              {/* Basic breadcrumb */}
              <VStack gap={2} align="start">
                <Text fontSize="sm" fontWeight="medium">Standard Breadcrumb:</Text>
                <Breadcrumb.Root>
                  <Breadcrumb.List>
                    <Breadcrumb.Item>
                      <Breadcrumb.Link href="#" color="tertiary" _hover={{ color: "tertiary-hover" }}>
                        <LuHouse />
                        Home
                      </Breadcrumb.Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Separator>
                      <LuChevronRight />
                    </Breadcrumb.Separator>
                    <Breadcrumb.Item>
                      <Breadcrumb.Link href="#" color="tertiary" _hover={{ color: "tertiary-hover" }}>
                        Movies
                      </Breadcrumb.Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Separator>
                      <LuChevronRight />
                    </Breadcrumb.Separator>
                    <Breadcrumb.Item>
                      <Breadcrumb.Link href="#" color="tertiary" _hover={{ color: "tertiary-hover" }}>
                        Action
                      </Breadcrumb.Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Separator>
                      <LuChevronRight />
                    </Breadcrumb.Separator>
                    <Breadcrumb.Item>
                      <Breadcrumb.CurrentLink fontWeight="medium" color="foreground">
                        The Matrix
                      </Breadcrumb.CurrentLink>
                    </Breadcrumb.Item>
                  </Breadcrumb.List>
                </Breadcrumb.Root>
              </VStack>

              {/* Separator variations */}
              <VStack gap={2} align="start">
                <Text fontSize="sm" fontWeight="medium">Separator Styling:</Text>
                <Breadcrumb.Root>
                  <Breadcrumb.List>
                    <Breadcrumb.Item>
                      <Breadcrumb.Link href="#" color="tertiary">Browse</Breadcrumb.Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Separator color="border-strong-01">/</Breadcrumb.Separator>
                    <Breadcrumb.Item>
                      <Breadcrumb.Link href="#" color="tertiary">Discover</Breadcrumb.Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Separator color="border-strong-01">/</Breadcrumb.Separator>
                    <Breadcrumb.Item>
                      <Breadcrumb.CurrentLink fontWeight="medium" color="foreground">
                        Featured
                      </Breadcrumb.CurrentLink>
                    </Breadcrumb.Item>
                  </Breadcrumb.List>
                </Breadcrumb.Root>
              </VStack>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Breadcrumbs use <Code fontSize="xs">tertiary</Code> color for links, <Code fontSize="xs">foreground</Code> for current page.
                Separators use <Code fontSize="xs">border-strong-01</Code> or icons.
                Current page emphasized with medium font weight.
              </Text>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </Box>
  );
}
