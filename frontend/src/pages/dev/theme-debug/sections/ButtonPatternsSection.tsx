import { Box, Text, VStack, HStack, Button } from "@chakra-ui/react";

/**
 * Button Patterns Section - Comprehensive Button Variant Showcase
 *
 * Demonstrates all codified button patterns across themes and modes.
 * Validates consistent appearance and interaction states for all button types.
 *
 * Patterns:
 * - Solid: Primary action button (highest emphasis)
 * - Primary Outline: Secondary action with primary color emphasis
 * - Neutral Outline: Secondary action with neutral color emphasis
 * - Subtle: Low-emphasis button with optional selection state
 * - Ghost: Minimal tertiary action button (lowest emphasis)
 *
 * Implementation: Uses Chakra UI v3 recipe system for centralized styling.
 */
export function ButtonPatternsSection() {
	return (
		<Box id="button-patterns" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
			<Text fontSize="xl" fontWeight="bold" mb={4}>
				Button Patterns
			</Text>
			<VStack align="stretch" gap={4}>
				{/* Solid Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Solid (Primary Action)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="solid" px={4} py={2}>
									Default
								</Button>
								<Button variant="solid" px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Default: primary bg, on-primary text | Hover: primary-hover bg | Active: primary-active bg
								| Focus: ring outline
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Primary Outline Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Primary Outline (Secondary with Primary Emphasis)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="primary-outline" px={4} py={2}>
									Default
								</Button>
								<Button variant="primary-outline" px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Border: button-outline-primary | Color: on-button-outline-primary | Hover: primary/8 bg |
								Active: primary/12 bg
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Neutral Outline Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Neutral Outline (Secondary with Neutral Emphasis)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="neutral-outline" px={4} py={2}>
									Default
								</Button>
								<Button variant="neutral-outline" px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Border: button-outline | Color: on-button-outline | Hover: tertiary/8 bg + tertiary border
								| Active: tertiary/12 bg
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Subtle Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Subtle (Low-Emphasis with Selection Support)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="subtle" selected={false} px={4} py={2}>
									Unselected
								</Button>
								<Button variant="subtle" selected={true} px={4} py={2}>
									Selected
								</Button>
								<Button variant="subtle" selected={false} px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Unselected: button-subtle bg, secondary-hover on hover | Selected: button-subtle-selected
								bg, no hover change
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Ghost Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Ghost (Minimal Tertiary Action)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="ghost" px={4} py={2}>
									Default
								</Button>
								<Button variant="ghost" px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Color: tertiary | Hover: tertiary/8 bg + tertiary-hover text | Active: tertiary-active
								text
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Implementation Note */}
				<Box bg="layer-02" p={3} borderRadius="md" borderWidth="1px" borderColor="border-subtle-01">
					<Text fontSize="xs" color="foreground/70">
						<strong>Implementation:</strong> Button patterns use Chakra UI v3 recipe system for centralized
						styling. All variants reference semantic tokens and adapt automatically across theme switches.
					</Text>
				</Box>
			</VStack>
		</Box>
	);
}
