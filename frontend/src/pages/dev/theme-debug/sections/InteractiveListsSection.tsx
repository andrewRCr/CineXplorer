import { Box, Text, VStack, HStack, Collapsible } from "@chakra-ui/react";
import { useState } from "react";

/**
 * Interactive Lists Section - List Items, Menus, Accordions
 */
export function InteractiveListsSection() {
  const [selectedItem, setSelectedItem] = useState<number | null>(1);
  const [accordionOpen, setAccordionOpen] = useState<number[]>([0]);

  const toggleAccordion = (index: number) => {
    setAccordionOpen(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <Box id="interactive-lists" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Interactive Lists</Text>
      <VStack align="stretch" gap={6}>

        {/* List Item States - 5.6.a */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>List Item States</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Demonstrates interaction tokens on <code>layer-01</code> surface
          </Text>
          <VStack align="stretch" gap={0} bg="layer-01" borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
            {/* Hover state */}
            <Box
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: "layer-hover-01" }}
              borderBottomWidth="1px"
              borderColor="border-subtle-02"
              transition="all 0.15s"
            >
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium">List Item (Hover)</Text>
                  <Text fontSize="xs" color="on-muted">Hover to see layer-hover-01 (8% overlay)</Text>
                </VStack>
                <Text fontSize="xs" color="foreground/60" fontFamily="mono">layer-hover-01</Text>
              </HStack>
            </Box>

            {/* Selected state */}
            <Box
              px={4}
              py={3}
              bg="layer-selected-01"
              cursor="pointer"
              borderBottomWidth="1px"
              borderColor="border-subtle-02"
            >
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium">List Item (Selected)</Text>
                  <Text fontSize="xs" color="on-muted">Selected state with 12% overlay</Text>
                </VStack>
                <Text fontSize="xs" color="foreground/60" fontFamily="mono">layer-selected-01</Text>
              </HStack>
            </Box>

            {/* Active state */}
            <Box
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: "layer-hover-01" }}
              _active={{ bg: "layer-active-01" }}
              borderBottomWidth="1px"
              borderColor="border-subtle-02"
              transition="all 0.15s"
            >
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium">List Item (Active)</Text>
                  <Text fontSize="xs" color="on-muted">Click to see layer-active-01 (12% overlay)</Text>
                </VStack>
                <Text fontSize="xs" color="foreground/60" fontFamily="mono">layer-active-01</Text>
              </HStack>
            </Box>

            {/* Disabled state */}
            <Box
              px={4}
              py={3}
              opacity={0.6}
              cursor="not-allowed"
            >
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium" color="on-muted">List Item (Disabled)</Text>
                  <Text fontSize="xs" color="on-muted">Uses opacity + on-muted color</Text>
                </VStack>
                <Text fontSize="xs" color="foreground/60" fontFamily="mono">opacity: 0.6</Text>
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* Layer-02 Variants */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>List Item States (Layer-02 Variant)</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Same patterns on <code>layer-02</code> surface using layer-hover-02 tokens
          </Text>
          <VStack align="stretch" gap={0} bg="layer-02" borderRadius="md" borderWidth="1px" borderColor="border-strong-02">
            <Box
              px={4}
              py={3}
              cursor="pointer"
              _hover={{ bg: "layer-hover-02" }}
              borderBottomWidth="1px"
              borderColor="border-subtle-02"
              transition="all 0.15s"
            >
              <HStack justify="space-between">
                <Text fontWeight="medium">Hover on layer-02</Text>
                <Text fontSize="xs" color="foreground/60" fontFamily="mono">layer-hover-02</Text>
              </HStack>
            </Box>
            <Box
              px={4}
              py={3}
              bg="layer-selected-02"
              cursor="pointer"
            >
              <HStack justify="space-between">
                <Text fontWeight="medium">Selected on layer-02</Text>
                <Text fontSize="xs" color="foreground/60" fontFamily="mono">layer-selected-02</Text>
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* Menu Item Examples - 5.6.b */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Menu Items in Popover</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Interactive menu on <code>popover</code> surface with hover states and focus indicators
          </Text>
          <Box>
            {/* Menu container */}
            <Box
              bg="popover"
              borderRadius="md"
              boxShadow="shadow-md"
              borderWidth="1px"
              borderColor="border-strong-02"
              minW="250px"
              maxW="300px"
              overflow="hidden"
            >
              {[
                { label: 'Open', icon: '📂', disabled: false },
                { label: 'Save', icon: '💾', disabled: false },
                { label: 'Save As...', icon: '📝', disabled: false },
                { label: 'Export', icon: '📤', disabled: true },
                { label: 'Share', icon: '🔗', disabled: false },
                { label: 'Delete', icon: '🗑️', disabled: false, destructive: true },
              ].map((item, i) => (
                <Box
                  key={item.label}
                  px={4}
                  py={2.5}
                  cursor={item.disabled ? "not-allowed" : "pointer"}
                  _hover={!item.disabled ? { bg: "layer-hover-02" } : {}}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "-2px",
                  }}
                  color={item.destructive ? "destructive" : item.disabled ? "on-muted" : "foreground"}
                  opacity={item.disabled ? 0.5 : 1}
                  fontSize="sm"
                  borderTopWidth={i > 0 ? "1px" : "0"}
                  borderColor="border-subtle-02"
                  transition="all 0.15s"
                  tabIndex={item.disabled ? -1 : 0}
                  role="menuitem"
                  aria-disabled={item.disabled}
                >
                  <HStack gap={3}>
                    <Text fontSize="lg">{item.icon}</Text>
                    <Text fontWeight="medium">{item.label}</Text>
                  </HStack>
                </Box>
              ))}
            </Box>
            <Text fontSize="xs" color="on-muted" mt={2} fontStyle="italic">
              Try tabbing through menu items to see focus states
            </Text>
          </Box>
        </Box>

        {/* Accordion Examples - 5.6.c */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Accordion Examples</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Collapsible content with interactive headers
          </Text>
          <VStack align="stretch" gap={2}>
            {[
              { title: 'What are semantic tokens?', content: 'Semantic tokens are design tokens that represent meaning (like "primary", "success") rather than specific values (like "blue-500"). They enable theme switching and consistent design patterns.' },
              { title: 'How does the layer system work?', content: 'The layer system provides 3 elevation levels (layer-01, layer-02, layer-03) that progressively lighten in dark mode and alternate in light mode per ADR-008.' },
              { title: 'What is ADR-008?', content: 'ADR-008 establishes the alternating pattern for light mode layers. Instead of progressive darkening (which becomes indistinguishable on white), layers alternate between white and gray to create visual nesting.' },
            ].map((item, i) => (
              <Collapsible.Root
                key={i}
                open={accordionOpen.includes(i)}
                onOpenChange={() => toggleAccordion(i)}
              >
                <Box
                  borderWidth="1px"
                  borderColor="border-strong-01"
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Collapsible.Trigger asChild>
                    <Box
                      as="button"
                      width="100%"
                      px={4}
                      py={3}
                      cursor="pointer"
                      bg="layer-01"
                      _hover={{ bg: "layer-hover-01" }}
                      _active={{ bg: "layer-active-01" }}
                      transition="all 0.15s"
                      textAlign="left"
                    >
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">{item.title}</Text>
                        <Text
                          fontSize="lg"
                          transform={accordionOpen.includes(i) ? "rotate(180deg)" : "rotate(0deg)"}
                          transition="transform 0.2s"
                        >
                          ▼
                        </Text>
                      </HStack>
                    </Box>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <Box
                      px={4}
                      py={3}
                      bg="background"
                      borderTopWidth="1px"
                      borderColor="border-subtle-02"
                    >
                      <Text fontSize="sm" color="on-muted">
                        {item.content}
                      </Text>
                    </Box>
                  </Collapsible.Content>
                </Box>
              </Collapsible.Root>
            ))}
          </VStack>
        </Box>

        {/* Interactive Selection Example */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>Selectable List (Click to Select)</Text>
          <Text fontSize="sm" color="on-muted" mb={3}>
            Demonstrates selected state management with proper hover handling
          </Text>
          <VStack align="stretch" gap={0} bg="layer-01" borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
            {[
              { id: 0, title: 'The Shawshank Redemption', year: '1994' },
              { id: 1, title: 'The Godfather', year: '1972' },
              { id: 2, title: 'The Dark Knight', year: '2008' },
              { id: 3, title: 'Pulp Fiction', year: '1994' },
            ].map((movie, i) => {
              const isSelected = selectedItem === movie.id;
              return (
                <Box
                  key={movie.id}
                  px={4}
                  py={3}
                  cursor="pointer"
                  bg={isSelected ? "layer-selected-01" : undefined}
                  _hover={isSelected ? {} : { bg: "layer-hover-01" }}
                  onClick={() => setSelectedItem(movie.id)}
                  borderBottomWidth={i < 3 ? "1px" : "0"}
                  borderColor="border-subtle-02"
                  transition="all 0.15s"
                >
                  <HStack justify="space-between">
                    <VStack align="start" gap={0}>
                      <Text fontWeight={isSelected ? "bold" : "medium"}>{movie.title}</Text>
                      <Text fontSize="xs" color="on-muted">{movie.year}</Text>
                    </VStack>
                    {isSelected && (
                      <Text fontSize="lg" color="tertiary">✓</Text>
                    )}
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
