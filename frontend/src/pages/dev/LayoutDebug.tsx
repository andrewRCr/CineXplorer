import { Box, Text, VStack, HStack, Grid, useToken, useBreakpointValue } from "@chakra-ui/react";
import { useState, useEffect } from "react";

/**
 * Layout System Debug Page
 *
 * Visual testing and validation for layout tokens and responsive patterns.
 */
export default function LayoutDebug() {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [computedTokens, setComputedTokens] = useState({
    navbarHeight: '',
    sidebarWidth: '',
    footerHeight: '',
  });

  // Get z-index values
  const [zBase, zSidebar, zFooter, zNavbar, zDropdown] = useToken("zIndex", [
    "base",
    "sidebar",
    "footer",
    "navbar",
    "dropdown",
  ]);

  // Current breakpoint (for display only, not behavior)
  const currentBreakpoint = useBreakpointValue(
    {
      base: "base (mobile)",
      md: "md (tablet)",
      lg: "lg (desktop)",
      xl: "xl (wide)",
    },
    { ssr: false }
  ) ?? "base (mobile)";

  // Track viewport dimensions and compute CSS variable values
  useEffect(() => {
    const updateDimensions = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);

      // Read computed CSS variable values from document root
      const rootStyles = getComputedStyle(document.documentElement);
      setComputedTokens({
        navbarHeight: rootStyles.getPropertyValue('--chakra-sizes-layout-navbar').trim(),
        sidebarWidth: rootStyles.getPropertyValue('--chakra-sizes-layout-sidebar').trim(),
        footerHeight: rootStyles.getPropertyValue('--chakra-sizes-layout-footer').trim(),
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return (
    <Box
      bg="background"
      color="foreground"
      minH="100vh"
    >
      {/* Sticky Header - elevated layer */}
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
          <Text fontSize="xl" fontWeight="bold">
            Layout System Debug
          </Text>
          <Text fontSize="sm" color="foreground/80">
            Breakpoint: {currentBreakpoint} · {viewportWidth}×{viewportHeight}px
          </Text>
        </HStack>
      </Box>

      {/* Content */}
      <VStack align="stretch" gap={6} maxW="1200px" mx="auto" p={8}>
        {/* Layout Token Values */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Layout Foundation Tokens</Text>
          <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
            <Box bg="layer-02" p={4} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">layout.navbar</Text>
              <Text fontSize="2xl" fontWeight="bold">{computedTokens.navbarHeight || 'Loading...'}</Text>
              <Text fontSize="xs" color="foreground/60">NavBar height (includes border)</Text>
            </Box>
            <Box bg="layer-02" p={4} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">layout.sidebar</Text>
              <Text fontSize="2xl" fontWeight="bold">{computedTokens.sidebarWidth || 'Loading...'}</Text>
              <Text fontSize="xs" color="foreground/60">Sidebar width (desktop only)</Text>
            </Box>
            <Box bg="layer-02" p={4} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">layout.footer</Text>
              <Text fontSize="2xl" fontWeight="bold">{computedTokens.footerHeight || 'Loading...'}</Text>
              <Text fontSize="xs" color="foreground/60">Footer height (approximate)</Text>
            </Box>
          </Grid>
        </Box>

        {/* Z-Index Scale */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Z-Index Hierarchy</Text>
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between" p={3} bg="layer-02" borderRadius="sm">
              <Text fontWeight="medium">dropdown</Text>
              <Text fontFamily="mono" color="tertiary">{zDropdown}</Text>
            </HStack>
            <HStack justify="space-between" p={3} bg="layer-02" borderRadius="sm">
              <Text fontWeight="medium">navbar</Text>
              <Text fontFamily="mono" color="tertiary">{zNavbar}</Text>
            </HStack>
            <HStack justify="space-between" p={3} bg="layer-02" borderRadius="sm">
              <Text fontWeight="medium">footer</Text>
              <Text fontFamily="mono" color="tertiary">{zFooter}</Text>
            </HStack>
            <HStack justify="space-between" p={3} bg="layer-02" borderRadius="sm">
              <Text fontWeight="medium">sidebar, theme-debug, layout-debug</Text>
              <Text fontFamily="mono" color="tertiary">{zSidebar}</Text>
            </HStack>
            <HStack justify="space-between" p={3} bg="layer-02" borderRadius="sm">
              <Text fontWeight="medium">base</Text>
              <Text fontFamily="mono" color="tertiary">{zBase}</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Responsive Layout Visualization */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Layout Structure</Text>
          <Text fontSize="sm" color="foreground/60" mb={4}>
            Visual representation of layout hierarchy with responsive sidebar
          </Text>
          <Box
            position="relative"
            borderWidth="2px"
            borderColor="tertiary"
            borderRadius="md"
            p={4}
            bg="background"
          >
            {/* NavBar */}
            <Box
              bg="primary/20"
              borderWidth="1px"
              borderColor="primary"
              p={2}
              mb={2}
              borderRadius="sm"
            >
              <Text fontSize="xs" fontWeight="bold">NavBar ({computedTokens.navbarHeight})</Text>
            </Box>

            {/* Main Layout */}
            <HStack align="start" gap={2}>
              {/* Sidebar - responsive */}
              <Box
                bg="tertiary/20"
                borderWidth="1px"
                borderColor="tertiary"
                p={2}
                borderRadius="sm"
                width={{ base: "0", lg: computedTokens.sidebarWidth }}
                display={{ base: "none", lg: "block" }}
                flexShrink={0}
              >
                <Text fontSize="xs" fontWeight="bold" mb={2}>Sidebar ({computedTokens.sidebarWidth})</Text>
                <VStack align="stretch" gap={1}>
                  <Text fontSize="2xs" color="foreground/60">• Featured</Text>
                  <Text fontSize="2xs" color="foreground/60">• Now Playing</Text>
                  <Text fontSize="2xs" color="foreground/60">• Upcoming</Text>
                  <Text fontSize="2xs" color="foreground/60">• Top Rated</Text>
                  <Text fontSize="2xs" color="foreground/60" mt={2}>Desktop only</Text>
                  <Text fontSize="2xs" color="foreground/60">Mobile uses drawer</Text>
                </VStack>
              </Box>

              {/* Content Area */}
              <Box
                flex="1"
                bg="layer-02"
                borderWidth="1px"
                borderColor="border"
                p={4}
                borderRadius="sm"
                minH="200px"
              >
                <Text fontSize="xs" fontWeight="bold" mb={2}>Content Area (flex: 1)</Text>
                <Text fontSize="xs" color="foreground/60" mb={2}>
                  Expands to fill available space
                </Text>
                <Text fontSize="xs" color="foreground/60">
                  • Mobile (base): Full width, no sidebar
                </Text>
                <Text fontSize="xs" color="foreground/60">
                  • Desktop (lg+): Width = container - {computedTokens.sidebarWidth} - gap
                </Text>
              </Box>
            </HStack>

            {/* Footer */}
            <Box
              bg="primary/20"
              borderWidth="1px"
              borderColor="primary"
              p={2}
              mt={2}
              borderRadius="sm"
            >
              <Text fontSize="xs" fontWeight="bold">Footer (~{computedTokens.footerHeight})</Text>
            </Box>
          </Box>
        </Box>

        {/* Sticky Positioning Test */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Sticky Positioning Test</Text>
          <Text fontSize="sm" color="foreground/60" mb={4}>
            Scroll this section to verify sticky header remains flush with navbar (no jump)
          </Text>
          <Box
            maxH="400px"
            overflowY="auto"
            borderWidth="1px"
            borderColor="border"
            borderRadius="sm"
            position="relative"
          >
            {/* Sticky element inside scroll container */}
            <Box
              position="sticky"
              top={0}
              bg="tertiary"
              color="on-tertiary"
              p={3}
              fontWeight="bold"
              zIndex={1}
            >
              Sticky Header (stays at top while scrolling)
            </Box>

            {/* Scrollable content */}
            <VStack align="stretch" gap={2} p={4}>
              {Array.from({ length: 30 }, (_, i) => (
                <Box key={i} bg="layer-02" p={3} borderRadius="sm">
                  <Text>Content item {i + 1}</Text>
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>

        {/* Breakpoint Thresholds */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Chakra Breakpoint Thresholds</Text>
          <Text fontSize="sm" color="foreground/60" mb={4}>
            Viewport width breakpoints used by Chakra's responsive system
          </Text>
          <Grid templateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={3}>
            <Box bg="layer-02" p={3} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">base</Text>
              <Text fontSize="xl" fontWeight="bold">0px</Text>
              <Text fontSize="xs" color="foreground/60">Mobile first</Text>
            </Box>
            <Box bg="layer-02" p={3} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">md</Text>
              <Text fontSize="xl" fontWeight="bold">768px</Text>
              <Text fontSize="xs" color="foreground/60">Tablet</Text>
            </Box>
            <Box bg="layer-02" p={3} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">lg</Text>
              <Text fontSize="xl" fontWeight="bold">1024px</Text>
              <Text fontSize="xs" color="foreground/60">Desktop</Text>
            </Box>
            <Box bg="layer-02" p={3} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" color="foreground/60">xl</Text>
              <Text fontSize="xl" fontWeight="bold">1280px</Text>
              <Text fontSize="xs" color="foreground/60">Wide</Text>
            </Box>
          </Grid>
        </Box>

        {/* Responsive Patterns */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>CSS Display Prop Patterns</Text>
          <Text fontSize="sm" color="foreground/60" mb={4}>
            Flash-free responsive patterns (migrated from useBreakpointValue)
          </Text>
          <VStack align="stretch" gap={4}>
            {/* Show/Hide Pattern */}
            <Box bg="layer-02" p={4} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" mb={2}>Show/Hide Pattern</Text>
              <Text fontSize="xs" color="foreground/60" mb={2}>Hide element on mobile, show on desktop:</Text>
              <Box fontFamily="mono" fontSize="xs" bg="background" p={2} borderRadius="sm">
                <Text color="tertiary">{'<Box display={{ base: "none", lg: "block" }}>'}</Text>
                <Text ml={2}>  Desktop Content</Text>
                <Text color="tertiary">{'</Box>'}</Text>
              </Box>
            </Box>

            {/* Alternate Content Pattern */}
            <Box bg="layer-02" p={4} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" mb={2}>Alternate Content Pattern</Text>
              <Text fontSize="xs" color="foreground/60" mb={2}>Show different content per breakpoint:</Text>
              <Box fontFamily="mono" fontSize="xs" bg="background" p={2} borderRadius="sm">
                <Text color="tertiary">{'<HStack display={{ base: "flex", lg: "none" }}>'}</Text>
                <Text ml={2}>  Mobile Layout</Text>
                <Text color="tertiary">{'</HStack>'}</Text>
                <Text color="tertiary" mt={1}>{'<HStack display={{ base: "none", lg: "flex" }}>'}</Text>
                <Text ml={2}>  Desktop Layout</Text>
                <Text color="tertiary">{'</HStack>'}</Text>
              </Box>
            </Box>

            {/* Responsive Props */}
            <Box bg="layer-02" p={4} borderRadius="sm">
              <Text fontSize="sm" fontWeight="bold" mb={2}>Responsive Props Pattern</Text>
              <Text fontSize="xs" color="foreground/60" mb={2}>Responsive values without hooks:</Text>
              <Box fontFamily="mono" fontSize="xs" bg="background" p={2} borderRadius="sm">
                <Text color="tertiary">{'<Box'}</Text>
                <Text ml={2}>{'  width={{ base: "100%", lg: "280px" }}'}</Text>
                <Text ml={2}>{'  pb={{ base: 2, lg: 0 }}'}</Text>
                <Text color="tertiary">{'>'}</Text>
              </Box>
            </Box>
          </VStack>
        </Box>

        {/* CSS Variable Reference */}
        <Box bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xl" fontWeight="bold" mb={4}>CSS Variable Reference</Text>
          <Text fontSize="sm" color="foreground/60" mb={4}>
            How to access layout tokens in component styles
          </Text>
          <VStack align="stretch" gap={3}>
            <Box bg="layer-02" p={4} borderRadius="sm" fontFamily="mono" fontSize="sm">
              <Text color="foreground/60" mb={1}>Chakra prop:</Text>
              <Text>height="layout.navbar"</Text>
            </Box>
            <Box bg="layer-02" p={4} borderRadius="sm" fontFamily="mono" fontSize="sm">
              <Text color="foreground/60" mb={1}>CSS variable:</Text>
              <Text>var(--chakra-sizes-layout-navbar)</Text>
            </Box>
            <Box bg="layer-02" p={4} borderRadius="sm" fontFamily="mono" fontSize="sm">
              <Text color="foreground/60" mb={1}>useToken hook:</Text>
              <Text>const [height] = useToken('sizes', ['layout.navbar'])</Text>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
