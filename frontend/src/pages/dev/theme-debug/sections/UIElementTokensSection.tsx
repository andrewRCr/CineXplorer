import { Box, Text, VStack, Button } from "@chakra-ui/react";
import { useState } from "react";

/**
 * UI Element Tokens Section - Foundational Structural Tokens
 *
 * Demonstrates foundational UI tokens for accessibility and structure:
 * - Focus indicators (ring token for keyboard navigation)
 * - Separators/dividers (planned)
 */
export function UIElementTokensSection() {
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  return (
    <Box id="ui-elements" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>UI Element Tokens</Text>
      <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
        <VStack align="stretch" gap={4}>
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
              Try Tab key to see focus ring (only visible for keyboard navigation, not mouse clicks)
            </Text>
          </Box>
        </VStack>
      </Box>
      <Text fontSize="xs" color="foreground/70" fontStyle="italic" px={2} mt={3}>
        Focus rings must meet WCAG contrast requirements for keyboard navigation accessibility.
        Form field borders (<code>input</code> token) are demonstrated in the Form Controls section.
      </Text>
    </Box>
  );
}
