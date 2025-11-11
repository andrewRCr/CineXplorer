import { Box, Text, VStack, HStack, Alert, Badge, Progress, Spinner, Button, Code } from "@chakra-ui/react";
import { Tooltip } from "@/components/chakra/tooltip";

/**
 * Feedback & Status Section
 *
 * Demonstrates feedback and status UI patterns: alerts, badges, progress indicators, and tooltips.
 * Per semantic token strategy: Uses status color pairs (success/on-success, warning/on-warning, etc.)
 * and popover tokens for tooltips.
 */
export function FeedbackStatusSection() {
  return (
    <Box id="feedback-status" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Feedback & Status</Text>
      <VStack align="stretch" gap={4}>
        {/* Alerts */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Alerts</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={3} align="center">
              {/* Success alert */}
              <Alert.Root status="success" bg="success/10" borderWidth="1px" borderColor="success" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title color="success">Success</Alert.Title>
                  <Alert.Description color="foreground">
                    Changes saved successfully
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              {/* Warning alert */}
              <Alert.Root status="warning" bg="warning/10" borderWidth="1px" borderColor="warning" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title color="warning">Warning</Alert.Title>
                  <Alert.Description color="foreground">
                    Please verify your email address
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              {/* Error alert */}
              <Alert.Root status="error" bg="destructive/10" borderWidth="1px" borderColor="destructive" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title color="destructive">Error</Alert.Title>
                  <Alert.Description color="foreground">
                    Failed to save changes
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              {/* Info alert */}
              <Alert.Root status="info" bg="info/10" borderWidth="1px" borderColor="info" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title color="info">Info</Alert.Title>
                  <Alert.Description color="foreground">
                    New features available
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Alerts use status color tokens with 10% opacity backgrounds for subtle tint.
                Title uses semantic color (<Code fontSize="xs">success</Code>, <Code fontSize="xs">warning</Code>, etc.),
                description uses <Code fontSize="xs">foreground</Code> for readability.
                Note: <Code fontSize="xs">on-*</Code> tokens are for FULL opacity backgrounds (like badges), not subtle tints.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Badge Status Variants */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Badge Status Variants</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={4} align="center">
              {/* Status badges */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">Status Badges:</Text>
                <HStack gap={3} wrap="wrap">
                  <Badge bg="success" color="on-success">Active</Badge>
                  <Badge bg="warning" color="on-warning">Pending</Badge>
                  <Badge bg="info" color="on-info">New</Badge>
                  <Badge bg="destructive" color="on-destructive">Deleted</Badge>
                </HStack>
              </VStack>

              {/* Neutral badge (per ADR-011 canonical naming) */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">Neutral Badge (non-semantic labels):</Text>
                <HStack gap={3} wrap="wrap" justify="center">
                  <Badge bg="badge" color="on-badge">Action</Badge>
                  <Badge bg="badge" color="on-badge">Sci-Fi</Badge>
                  <Badge bg="badge" color="on-badge">PG-13</Badge>
                  <Badge bg="badge" color="on-badge">2024</Badge>
                </HStack>
                <Text fontSize="xs" color="foreground/60" maxW="600px" textAlign="center">
                  Neutral <Code fontSize="xs">badge</Code> token for categorization (genres, ratings, non-semantic labels).
                  Distinct from status colors which convey semantic meaning.
                </Text>
              </VStack>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Per ADR-011: All foreground tokens use <Code fontSize="xs">on-*</Code> prefix for clarity
                (e.g., <Code fontSize="xs">on-success</Code>, <Code fontSize="xs">on-badge</Code>).
                Status badges use semantic colors, neutral badges use <Code fontSize="xs">badge</Code> token.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Progress Indicators */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Progress Indicators</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={4} align="center">
              {/* Determinate progress */}
              <VStack gap={2} align="center" w="full" maxW="400px">
                <Text fontSize="sm" fontWeight="medium">Determinate Progress (with percentage):</Text>
                <Progress.Root value={65} maxW="400px">
                  <HStack justify="space-between" mb={1}>
                    <Progress.Label fontSize="sm">Upload Progress</Progress.Label>
                    <Progress.ValueText fontSize="sm" />
                  </HStack>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>

              {/* Indeterminate progress */}
              <VStack gap={2} align="center" w="full" maxW="400px">
                <Text fontSize="sm" fontWeight="medium">Indeterminate Progress:</Text>
                <Progress.Root value={null} w="full">
                  <Progress.Label fontSize="sm" mb={1}>Loading...</Progress.Label>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>

              {/* Spinner (indeterminate) */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">Spinner (indeterminate):</Text>
                <HStack gap={4} justify="center">
                  <VStack gap={1}>
                    <Spinner size="sm" />
                    <Text fontSize="xs" color="foreground/60">sm</Text>
                  </VStack>
                  <VStack gap={1}>
                    <Spinner size="md" />
                    <Text fontSize="xs" color="foreground/60">md</Text>
                  </VStack>
                  <VStack gap={1}>
                    <Spinner size="lg" />
                    <Text fontSize="xs" color="foreground/60">lg</Text>
                  </VStack>
                </HStack>
              </VStack>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Progress indicators use Chakra v3 defaults. Determinate shows specific progress with percentage,
                indeterminate indicates ongoing activity without specific completion time.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Tooltips */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>Tooltips</Text>
          <Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
            <VStack gap={4} align="center">
              {/* Basic tooltip */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">Tooltip Positioning:</Text>
                <HStack gap={4} wrap="wrap" justify="center">
                  <Tooltip content="This is a tooltip (top)" positioning={{ placement: "top" }}>
                    <Button size="sm" variant="outline" borderColor="button-outline" color="on-button-outline">
                      Hover (top)
                    </Button>
                  </Tooltip>
                  <Tooltip content="This is a tooltip (bottom)" positioning={{ placement: "bottom" }}>
                    <Button size="sm" variant="outline" borderColor="button-outline" color="on-button-outline">
                      Hover (bottom)
                    </Button>
                  </Tooltip>
                  <Tooltip content="This is a tooltip (left)" positioning={{ placement: "left" }}>
                    <Button size="sm" variant="outline" borderColor="button-outline" color="on-button-outline">
                      Hover (left)
                    </Button>
                  </Tooltip>
                  <Tooltip content="This is a tooltip (right)" positioning={{ placement: "right" }}>
                    <Button size="sm" variant="outline" borderColor="button-outline" color="on-button-outline">
                      Hover (right)
                    </Button>
                  </Tooltip>
                </HStack>
              </VStack>

              {/* Tooltip with arrow */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">Tooltip with Arrow:</Text>
                <Tooltip showArrow content="Tooltip with arrow indicator">
                  <Button size="sm" variant="outline" borderColor="button-outline" color="on-button-outline">
                    Hover for arrow
                  </Button>
                </Tooltip>
              </VStack>

              <Text fontSize="xs" color="foreground/60" maxW="700px" textAlign="center" lineHeight="1.5">
                Tooltips use <Code fontSize="xs">popover</Code> / <Code fontSize="xs">on-popover</Code> tokens per ADR-011.
                Popover is a contextual surface token (typically maps to layer-02 or layer-03 depending on z-index context).
                Positioning supports top, bottom, left, right placements.
              </Text>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </Box>
  );
}
