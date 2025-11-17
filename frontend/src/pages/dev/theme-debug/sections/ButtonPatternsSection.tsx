import { Box, Text, VStack, HStack, Button } from "@chakra-ui/react";

/**
 * Button Patterns Section - Finalized Button Variant Showcase
 *
 * Demonstrates 5 finalized button patterns with consistent appearance
 * and interaction states across all themes.
 *
 * Patterns (in visual hierarchy order):
 * - Solid: Primary action button (highest emphasis)
 * - Secondary: Form pair secondary action (primary text + grey border)
 * - Outline: Standalone utility action (grey text + primary hover)
 * - Subtle: Low-emphasis button with optional selection state
 * - Ghost: Minimal tertiary action button (lowest emphasis)
 *
 * Implementation: Uses Chakra UI v3 recipe system for centralized styling.
 */
export function ButtonPatternsSection() {
	return (
		<Box id="button-patterns" bg="layer-01" p={6} borderRadius="md" borderWidth="1px" borderColor="border-strong-01">
			<Text fontSize="xl" fontWeight="bold" mb={4}>
				Button Patterns (5 Finalized Variants)
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
								Bg: primary | Text: on-primary | Hover: primary-hover (12%) | Active: primary-active (16%)
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Secondary Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Secondary (Form Pair Secondary Action)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="secondary" px={4} py={2}>
									Default
								</Button>
								<Button variant="secondary" px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Border: button-outline | Text: primary | Hover: primary/8 bg + border-strong-01 | Use
								when paired with solid
							</Text>
						</VStack>
					</Box>
				</Box>

				{/* Outline Button */}
				<Box>
					<Text fontSize="lg" fontWeight="bold" mb={2}>
						Outline (Standalone Utility Action)
					</Text>
					<Box bg="background" p={4} borderRadius="md" borderWidth="1px" borderColor="border-subtle-00">
						<VStack align="stretch" gap={3}>
							<HStack gap={3} wrap="wrap">
								<Button variant="outline" px={4} py={2}>
									Default
								</Button>
								<Button variant="outline" px={4} py={2} disabled>
									Disabled
								</Button>
							</HStack>
							<Text fontSize="xs" color="foreground/60">
								Border: button-outline | Text: on-button-outline | Hover: primary/8 bg + primary border
								| Use standalone
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
								Unselected: button-subtle bg, secondary-hover (12%) on hover | Selected:
								button-subtle-selected bg, no hover change
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
						<strong>Implementation:</strong> Reduced from 7 experimental variants to 5 finalized patterns.
						Interaction state tokens for <em>solid surfaces</em> (solid/subtle variants) improved from Material Design 3 defaults (8%/12%) to (12%/16%) for
						better contrast (ADR-016). Outline/ghost/secondary variants use MD3 baseline (8%/12%). Secondary/Outline distinction based on usage context (paired vs standalone).
					</Text>
				</Box>
			</VStack>
		</Box>
	);
}
