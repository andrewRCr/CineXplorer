import {
  Box,
  Text,
  VStack,
  HStack,
  Alert,
  Badge,
  Progress,
  Spinner,
  Button,
  Code,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/core/chakra/tooltip";
import { toaster } from "@/components/core/chakra/toaster";

/**
 * Feedback & Status Section
 *
 * Demonstrates feedback and status UI patterns: alerts, badges, progress indicators, and tooltips.
 * Per semantic token strategy: Uses status color pairs (success/on-success, warning/on-warning, etc.)
 * and popover tokens for tooltips.
 */
export function FeedbackStatusSection() {
  return (
    <Box
      id="feedback-status"
      bg="layer-01"
      p={6}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border-strong-01"
    >
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Feedback & Status
      </Text>
      <VStack align="stretch" gap={4}>
        {/* Alerts - all use alert recipe (theme/recipes/alert.ts) */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Alerts
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={3} align="center">
              {/* Success alert */}
              <Alert.Root status="success" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Success</Alert.Title>
                  <Alert.Description>
                    Changes saved successfully
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
              {/* Warning alert */}
              <Alert.Root status="warning" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Warning</Alert.Title>
                  <Alert.Description>
                    Please verify your email address
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              {/* Error alert - maps "error" status to "destructive" recipe variant */}
              <Alert.Root status="error" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Error</Alert.Title>
                  <Alert.Description>Failed to save changes</Alert.Description>
                </Alert.Content>
              </Alert.Root>

              {/* Info alert */}
              <Alert.Root status="info" maxW="600px">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Info</Alert.Title>
                  <Alert.Description>New features available</Alert.Description>
                </Alert.Content>
              </Alert.Root>

              <Text
                fontSize="xs"
                color="foreground/60"
                maxW="700px"
                textAlign="center"
                lineHeight="1.5"
              >
                Alerts now use slot recipe (theme/recipes/alert.ts) registered
                in baseConfig. Recipe provides: 10% opacity backgrounds,
                semantic borders, title emphasis (semantic color), description
                readability (foreground). Status prop automatically applies
                variant styles.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Toasts - floating notifications using toaster composition */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Toasts
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={4} align="center">
              {/* Toast trigger buttons */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  Status Types (click to trigger):
                </Text>
                <HStack gap={3} wrap="wrap" justify="center">
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="button-outline"
                    color="on-button-outline"
                    onClick={() =>
                      toaster.success({
                        title: "Success",
                        description: "Changes saved successfully",
                      })
                    }
                  >
                    Success
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="button-outline"
                    color="on-button-outline"
                    onClick={() =>
                      toaster.warning({
                        title: "Warning",
                        description: "Please verify your email address",
                      })
                    }
                  >
                    Warning
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="button-outline"
                    color="on-button-outline"
                    onClick={() =>
                      toaster.error({
                        title: "Error",
                        description: "Failed to save changes",
                        closable: true,
                      })
                    }
                  >
                    Error
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="button-outline"
                    color="on-button-outline"
                    onClick={() =>
                      toaster.info({
                        title: "Info",
                        description: "New features available",
                      })
                    }
                  >
                    Info
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="button-outline"
                    color="on-button-outline"
                    onClick={() =>
                      toaster.loading({
                        title: "Loading",
                        description: "Please wait...",
                        closable: true, // Loading toasts persist until dismissed
                      })
                    }
                  >
                    Loading
                  </Button>
                </HStack>
              </VStack>

              {/* Toast with action */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  With Action (e.g., Undo):
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  borderColor="button-outline"
                  color="on-button-outline"
                  onClick={() =>
                    toaster.success({
                      title: "Removed from watchlist",
                      action: {
                        label: "Undo",
                        onClick: () => toaster.info({ title: "Action undone" }),
                      },
                    })
                  }
                >
                  Trigger with Undo
                </Button>
              </VStack>

              <Text
                fontSize="xs"
                color="foreground/60"
                maxW="700px"
                textAlign="center"
                lineHeight="1.5"
              >
                Toasts use solid layer-03 background with colored left accent
                border (unlike Alerts which use 10% opacity). Composition:{" "}
                <Code fontSize="xs">components/core/chakra/toaster.tsx</Code>.
                Action triggers use <Code fontSize="xs">tertiary</Code> tokens
                for undo/retry actions.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Badge Status Variants */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Badge Status Variants
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={4} align="center">
              {/* Status badges - Uses badge recipe (theme/recipes/badge.ts) */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  Status Badges:
                </Text>
                <HStack gap={3} wrap="wrap">
                  <Badge variant="success">Active</Badge>
                  <Badge variant="warning">Pending</Badge>
                  <Badge variant="info">New</Badge>
                  <Badge variant="error">Deleted</Badge>
                </HStack>
              </VStack>

              {/* Neutral badges - Uses badge recipe (theme/recipes/badge.ts) */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  Neutral Badges (genres, non-semantic):
                </Text>
                <HStack gap={3} wrap="wrap" justify="center">
                  <Badge variant="neutral">Action</Badge>
                  <Badge variant="neutral">Sci-Fi</Badge>
                  <Badge variant="neutral">PG-13</Badge>
                  <Badge variant="neutral">2024</Badge>
                </HStack>
              </VStack>

              <Text
                fontSize="xs"
                color="foreground/60"
                maxW="700px"
                textAlign="center"
                lineHeight="1.5"
              >
                Badges now use badge recipe (theme/recipes/badge.ts) registered
                in baseConfig. Recipe provides 5 variants: success, warning,
                error, info, neutral. All use canonical{" "}
                <Code fontSize="xs">on-*</Code> naming (ADR-011).
              </Text>

              <Text
                fontSize="xs"
                color="foreground/60"
                maxW="700px"
                textAlign="center"
                lineHeight="1.5"
                mt={2}
              >
                TMDB ratings use outlined chips with a colored dot and neutral
                text. Scores below 10 votes keep the filled neutral badge.
                Personal ratings use earned half stars in{" "}
                <Code fontSize="xs">imdb-gold</Code>.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Progress Indicators */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Progress Indicators
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={4} align="center">
              {/* Determinate progress */}
              <VStack gap={2} align="center" w="full" maxW="400px">
                <Text fontSize="sm" fontWeight="medium">
                  Determinate Progress (with percentage):
                </Text>
                <Progress.Root value={65} maxW="400px">
                  <HStack justify="space-between" mb={1}>
                    <Progress.Label fontSize="sm">
                      Upload Progress
                    </Progress.Label>
                    <Progress.ValueText fontSize="sm" />
                  </HStack>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>

              {/* Indeterminate progress */}
              <VStack gap={2} align="center" w="full" maxW="400px">
                <Text fontSize="sm" fontWeight="medium">
                  Indeterminate Progress:
                </Text>
                <Progress.Root value={null} w="full">
                  <Progress.Label fontSize="sm" mb={1}>
                    Loading...
                  </Progress.Label>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>

              {/* Spinner (indeterminate) */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  Spinner (indeterminate):
                </Text>
                <HStack gap={4} justify="center">
                  <VStack gap={1}>
                    <Spinner size="sm" />
                    <Text fontSize="xs" color="foreground/60">
                      sm
                    </Text>
                  </VStack>
                  <VStack gap={1}>
                    <Spinner size="md" />
                    <Text fontSize="xs" color="foreground/60">
                      md
                    </Text>
                  </VStack>
                  <VStack gap={1}>
                    <Spinner size="lg" />
                    <Text fontSize="xs" color="foreground/60">
                      lg
                    </Text>
                  </VStack>
                </HStack>
              </VStack>

              <Text
                fontSize="xs"
                color="foreground/60"
                maxW="700px"
                textAlign="center"
                lineHeight="1.5"
              >
                Progress indicators use Chakra v3 defaults. Determinate shows
                specific progress with percentage, indeterminate indicates
                ongoing activity without specific completion time.
              </Text>
            </VStack>
          </Box>
        </Box>

        {/* Tooltips */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Tooltips
          </Text>
          <Box
            bg="background"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border-subtle-00"
          >
            <VStack gap={4} align="center">
              {/* Basic tooltip */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  Tooltip Positioning:
                </Text>
                <HStack gap={4} wrap="wrap" justify="center">
                  <Tooltip
                    content="This is a tooltip (top)"
                    positioning={{ placement: "top" }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="button-outline"
                      color="on-button-outline"
                    >
                      Hover (top)
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content="This is a tooltip (bottom)"
                    positioning={{ placement: "bottom" }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="button-outline"
                      color="on-button-outline"
                    >
                      Hover (bottom)
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content="This is a tooltip (left)"
                    positioning={{ placement: "left" }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="button-outline"
                      color="on-button-outline"
                    >
                      Hover (left)
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content="This is a tooltip (right)"
                    positioning={{ placement: "right" }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="button-outline"
                      color="on-button-outline"
                    >
                      Hover (right)
                    </Button>
                  </Tooltip>
                </HStack>
              </VStack>

              {/* Arrow toggle demo */}
              <VStack gap={2} align="center">
                <Text fontSize="sm" fontWeight="medium">
                  Arrow Toggle (default: shown):
                </Text>
                <HStack gap={4}>
                  <Tooltip content="Arrow shown (default)">
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="button-outline"
                      color="on-button-outline"
                    >
                      With arrow
                    </Button>
                  </Tooltip>
                  <Tooltip showArrow={false} content="Arrow hidden">
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="button-outline"
                      color="on-button-outline"
                    >
                      No arrow
                    </Button>
                  </Tooltip>
                </HStack>
              </VStack>

              <Text
                fontSize="xs"
                color="foreground/60"
                maxW="700px"
                textAlign="center"
                lineHeight="1.5"
              >
                Tooltips use <Code fontSize="xs">popover</Code> /{" "}
                <Code fontSize="xs">on-popover</Code> tokens. Arrow shown by
                default (set{" "}
                <Code fontSize="xs">showArrow=&#123;false&#125;</Code> to hide).
                Styling via tooltip recipe in theme.
              </Text>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </Box>
  );
}
