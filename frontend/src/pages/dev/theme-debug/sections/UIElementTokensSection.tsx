import { Box, Text, VStack, HStack, Button } from "@chakra-ui/react";
import { useState } from "react";
import { TextLink, StyledInput } from "@/components/common";

/**
 * UI Element Tokens Section - Foundational Structural Tokens
 *
 * Demonstrates foundational UI tokens for accessibility and structure:
 * - Focus indicators (ring token for keyboard navigation - WCAG 2.4.7, 2.4.13)
 * - Separators/dividers (border token for visual grouping)
 */
export function UIElementTokensSection() {
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  return (
    <Box
      id="ui-elements"
      bg="layer-01"
      p={6}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border-strong-01"
    >
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        UI Element Tokens
      </Text>
      <VStack align="stretch" gap={6}>
        {/* Separator/Divider Examples - 5.7.a */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>
            Separators & Dividers
          </Text>
          <Text fontSize="sm" color="on-muted" mb={4}>
            Uses <code>border</code> token for subtle visual separation.
            Dividers are intentionally subtle by design (not part of
            border-strong hierarchy).
          </Text>

          {/* Horizontal Dividers */}
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Horizontal Dividers
              </Text>

              {/* Between list items */}
              <Box
                bg="background"
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor="border-subtle-00"
              >
                <Text fontSize="xs" color="on-muted" mb={2}>
                  Between list items (subtle separation):
                </Text>
                <VStack align="stretch" gap={0}>
                  <Box py={2}>
                    <Text>First item</Text>
                  </Box>
                  <Box height="1px" bg="border" />
                  <Box py={2}>
                    <Text>Second item</Text>
                  </Box>
                  <Box height="1px" bg="border" />
                  <Box py={2}>
                    <Text>Third item</Text>
                  </Box>
                </VStack>
              </Box>

              {/* Between sections */}
              <Box
                bg="background"
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor="border-subtle-00"
                mt={3}
              >
                <Text fontSize="xs" color="on-muted" mb={2}>
                  Between sections (visual grouping):
                </Text>
                <VStack align="stretch" gap={3}>
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Section 1
                    </Text>
                    <Text fontSize="sm" color="on-muted">
                      Content for first section
                    </Text>
                  </Box>
                  <Box height="1px" bg="border" />
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Section 2
                    </Text>
                    <Text fontSize="sm" color="on-muted">
                      Content for second section
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </Box>

            {/* Vertical Dividers */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Vertical Dividers
              </Text>

              {/* In toolbar/button groups */}
              <Box
                bg="background"
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor="border-subtle-00"
              >
                <Text fontSize="xs" color="on-muted" mb={2}>
                  In toolbar/button groups (logical separation):
                </Text>
                <HStack gap={0}>
                  <Button size="sm" variant="ghost" color="foreground" px={3}>
                    Cut
                  </Button>
                  <Button size="sm" variant="ghost" color="foreground" px={3}>
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" color="foreground" px={3}>
                    Paste
                  </Button>
                  <Box width="1px" height="24px" bg="border" mx={2} />
                  <Button size="sm" variant="ghost" color="foreground" px={3}>
                    Undo
                  </Button>
                  <Button size="sm" variant="ghost" color="foreground" px={3}>
                    Redo
                  </Button>
                </HStack>
              </Box>
            </Box>

            {/* Semantic Usage Note */}
            <Box
              bg="muted"
              p={3}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border-subtle-02"
            >
              <Text
                fontSize="sm"
                fontWeight="semibold"
                mb={1}
                color="foreground"
              >
                When to Use Dividers vs Spacing
              </Text>
              <VStack align="start" gap={1}>
                <Text fontSize="xs" color="on-muted">
                  <strong>Use dividers:</strong> When items are closely related
                  but need visual separation (list items, toolbar groups)
                </Text>
                <Text fontSize="xs" color="on-muted">
                  <strong>Use spacing alone:</strong> When items are distinct
                  sections with different purposes (cards, major sections)
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* Focus Ring - Enhanced 5.7.b */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3}>
            Focus Ring (Keyboard Navigation)
          </Text>
          <Text fontSize="sm" color="on-muted" mb={4}>
            The <code>ring</code> token provides accessible focus indicators for
            keyboard navigation (WCAG 2.4.7 Focus Visible, 2.4.13 Focus
            Contrast).
          </Text>

          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack align="stretch" gap={4}>
              {/* Prominent Tab Key Instruction */}
              <Box
                bg="tertiary/10"
                p={3}
                borderRadius="md"
                borderWidth="1px"
                borderColor="tertiary"
              >
                <Text fontSize="sm" fontWeight="bold" color="tertiary" mb={1}>
                  ⌨️ Press Tab to Test
                </Text>
                <Text fontSize="xs" color="foreground">
                  Focus rings only appear for keyboard navigation
                  (Tab/Shift+Tab), not mouse clicks. This is{" "}
                  <code>_focusVisible</code> behavior.
                </Text>
              </Box>

              {/* Button Example */}
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  mb={2}
                  color="on-muted"
                >
                  Button with focus ring:
                </Text>
                <Button
                  onFocus={() => setFocusedElement("button")}
                  onBlur={() => setFocusedElement(null)}
                  bg="primary"
                  color="on-primary"
                  _hover={{ bg: "primary-hover" }}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                  }}
                >
                  {focusedElement === "button"
                    ? "Focused! (ring visible)"
                    : "Tab to focus"}
                </Button>
              </Box>

              {/* Input Example */}
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  mb={2}
                  color="on-muted"
                >
                  Input field with focus ring:
                </Text>
                <StyledInput
                  placeholder="Tab to focus this input"
                  onFocus={() => setFocusedElement("input")}
                  onBlur={() => setFocusedElement(null)}
                />
              </Box>

              {/* Link Example */}
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  mb={2}
                  color="on-muted"
                >
                  Link with focus ring:
                </Text>
                <TextLink
                  to="/"
                  onFocus={() => setFocusedElement("link")}
                  onBlur={() => setFocusedElement(null)}
                >
                  {focusedElement === "link"
                    ? "Focused link (ring visible)"
                    : "Tab to focus this link"}
                </TextLink>
              </Box>

              {/* Usage Patterns */}
              <VStack align="stretch" gap={2}>
                <Box
                  bg="layer-01"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="border-subtle-02"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    mb={2}
                    color="foreground"
                  >
                    Text Inputs (Input, Textarea):
                  </Text>
                  <Box
                    as="pre"
                    fontSize="xs"
                    color="on-muted"
                    fontFamily="mono"
                    whiteSpace="pre-wrap"
                    overflowX="auto"
                  >
                    {`css={{
  "&:hover:not(:focus)": {
    borderColor: "var(--chakra-colors-border-strong-02)"
  },
  "&:focus": {
    borderColor: "var(--chakra-colors-tertiary)"
  }
}}`}
                  </Box>
                  <Text fontSize="xs" color="on-muted" mt={2}>
                    Border change is sufficient focus indicator. No outline ring
                    needed.
                  </Text>
                </Box>

                <Box
                  bg="layer-01"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="border-subtle-02"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    mb={2}
                    color="foreground"
                  >
                    Buttons & Links (keyboard-only ring):
                  </Text>
                  <Box
                    as="pre"
                    fontSize="xs"
                    color="on-muted"
                    fontFamily="mono"
                    whiteSpace="pre-wrap"
                    overflowX="auto"
                  >
                    {`_focusVisible={{
  outline: "2px solid",
  outlineColor: "ring",
  outlineOffset: "2px",
}}`}
                  </Box>
                  <Text fontSize="xs" color="on-muted" mt={2}>
                    Ring appears only for keyboard navigation (Tab key), not
                    mouse clicks.
                  </Text>
                </Box>
              </VStack>
            </VStack>
          </Box>

          {/* WCAG References */}
          <Box
            bg="muted"
            p={3}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-02"
            mt={3}
          >
            <Text fontSize="sm" fontWeight="semibold" mb={1} color="foreground">
              Accessibility Requirements
            </Text>
            <VStack align="start" gap={1}>
              <Text fontSize="xs" color="on-muted">
                <strong>WCAG 2.4.7 (Focus Visible):</strong> Focus indicators
                must be clearly visible for keyboard navigation
              </Text>
              <Text fontSize="xs" color="on-muted">
                <strong>WCAG 2.4.13 (Focus Appearance):</strong> Focus
                indicators must have ≥3:1 contrast ratio
              </Text>
              <Text fontSize="xs" color="on-muted">
                <strong>Pattern:</strong> Use <code>_focusVisible</code> (not{" "}
                <code>_focus</code>) to only show for keyboard navigation
              </Text>
              <Text fontSize="xs" color="on-muted">
                <strong>Token:</strong> Always use <code>ring</code> token (not
                custom colors) for consistency across themes
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Footer Note */}
        <Box p={3} borderTopWidth="1px" borderColor="border-subtle-02">
          <Text fontSize="xs" color="foreground/70" fontStyle="italic">
            Form field borders (<code>input</code> token) are demonstrated in
            the Form Controls section. Per-layer border visibility is covered in
            the Border Hierarchy section.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
