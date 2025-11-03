import { Box, Text, VStack, HStack, Button } from "@chakra-ui/react";
import { useThemeSelect } from "@/hooks/useThemeSelect";
import { type ThemeName } from "@/theme";
import { useColorMode } from "@/components/chakra/color-mode";
import { useEffect, useState } from "react";

/**
 * Theme System Debug Page
 *
 * Displays actual computed CSS values to debug theme system issues.
 */
export default function ThemeDebug() {
	const { theme, setTheme } = useThemeSelect();
	const { colorMode } = useColorMode();
	const [computedStyles, setComputedStyles] = useState<Record<string, string>>({});
	const [domInfo, setDomInfo] = useState<Record<string, string>>({});

	useEffect(() => {
		// Get computed styles for semantic tokens
		const testElement = document.createElement('div');
		testElement.style.cssText = `
			background: var(--background);
			color: var(--foreground);
		`;
		document.body.appendChild(testElement);
		const computed = window.getComputedStyle(testElement);

		setComputedStyles({
			'--background': computed.backgroundColor,
			'--foreground': computed.color,
			'--card': computed.getPropertyValue('background'), // Try different ways
			'raw-background': getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
			'raw-card': getComputedStyle(document.documentElement).getPropertyValue('--card').trim(),
		});

		document.body.removeChild(testElement);

		// Get DOM attributes
		setDomInfo({
			'data-theme': document.documentElement.getAttribute('data-theme') || 'NOT SET',
			'data-color-mode': document.documentElement.getAttribute('data-color-mode') || 'NOT SET',
			'class': document.documentElement.className || 'NO CLASS',
		});
	}, [theme, colorMode]);

	return (
		<Box p={8} bg="background" color="foreground" minH="100vh">
			<VStack align="stretch" gap={6} maxW="800px" mx="auto">
				<Text fontSize="3xl" fontWeight="bold">Theme System Debug</Text>

				{/* Current State */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>Current State</Text>
					<VStack align="stretch" gap={2}>
						<Text><strong>Selected Theme:</strong> {theme}</Text>
						<Text><strong>Color Mode:</strong> {colorMode}</Text>
					</VStack>
				</Box>

				{/* DOM Attributes */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>DOM Attributes</Text>
					<VStack align="stretch" gap={2} fontFamily="mono" fontSize="sm">
						{Object.entries(domInfo).map(([key, value]) => (
							<Text key={key}>
								<strong>{key}:</strong> {value}
							</Text>
						))}
					</VStack>
				</Box>

				{/* Computed CSS Values */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>Computed CSS Values</Text>
					<VStack align="stretch" gap={2} fontFamily="mono" fontSize="sm">
						{Object.entries(computedStyles).map(([key, value]) => (
							<Text key={key}>
								<strong>{key}:</strong> {value || 'EMPTY'}
							</Text>
						))}
					</VStack>
				</Box>

				{/* Visual Tests - Try Different Syntax */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>Syntax Tests</Text>
					<VStack align="stretch" gap={4}>
						<Box bg="background" p={4} borderWidth="1px" borderColor="border">
							<Text color="foreground">Method 1: bg="background"</Text>
						</Box>
						<Box background="background" p={4} borderWidth="1px" borderColor="border">
							<Text color="foreground">Method 2: background="background"</Text>
						</Box>
						<Box style={{ background: 'var(--background)' }} p={4} borderWidth="1px" borderColor="border">
							<Text color="foreground">Method 3: style var(--background)</Text>
						</Box>
						<Box bg="colors.background" p={4} borderWidth="1px" borderColor="border">
							<Text color="colors.foreground">Method 4: bg="colors.background"</Text>
						</Box>
						<Box bg="colorPalette.background" p={4} borderWidth="1px" borderColor="border">
							<Text color="colorPalette.foreground">Method 5: bg="colorPalette.background"</Text>
						</Box>
						<Box bg="semantic.background" p={4} borderWidth="1px" borderColor="border">
							<Text color="semantic.foreground">Method 6: bg="semantic.background"</Text>
						</Box>
					</VStack>
				</Box>

				{/* Chakra Default Tokens Test */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>Chakra Default Tokens Test</Text>
					<VStack align="stretch" gap={4}>
						<Box bg="bg" p={4} borderWidth="1px" borderColor="border">
							<Text color="fg">bg + fg (Chakra defaults)</Text>
						</Box>
						<Box bg="gray.500" p={4}>
							<Text color="white">gray.500 (raw color)</Text>
						</Box>
						<Box bg="red.500" p={4}>
							<Text color="white">red.500 (raw color)</Text>
						</Box>
					</VStack>
				</Box>

				{/* Opacity Modifier Tests */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>Opacity Modifier Tests</Text>
					<VStack align="stretch" gap={4}>
						{/* Test with semantic tokens */}
						<Box>
							<Text fontSize="sm" fontWeight="bold" mb={2}>Semantic Tokens with Opacity</Text>
							<HStack gap={2} wrap="wrap">
								<Box bg="primary/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">primary/100</Text>
								</Box>
								<Box bg="primary/80" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">primary/80</Text>
								</Box>
								<Box bg="primary/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">primary/60</Text>
								</Box>
								<Box bg="primary/40" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">primary/40</Text>
								</Box>
								<Box bg="primary/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">primary/20</Text>
								</Box>
							</HStack>
						</Box>

						<Box>
							<Text fontSize="sm" fontWeight="bold" mb={2}>Destructive Token with Opacity</Text>
							<HStack gap={2} wrap="wrap">
								<Box bg="destructive/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">destructive/100</Text>
								</Box>
								<Box bg="destructive/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">destructive/60</Text>
								</Box>
								<Box bg="destructive/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">destructive/20</Text>
								</Box>
							</HStack>
						</Box>

						<Box>
							<Text fontSize="sm" fontWeight="bold" mb={2}>Accent Token with Opacity</Text>
							<HStack gap={2} wrap="wrap">
								<Box bg="accent/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">accent/100</Text>
								</Box>
								<Box bg="accent/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">accent/60</Text>
								</Box>
								<Box bg="accent/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">accent/20</Text>
								</Box>
							</HStack>
						</Box>

						<Box>
							<Text fontSize="sm" fontWeight="bold" mb={2}>Muted Token with Opacity</Text>
							<HStack gap={2} wrap="wrap">
								<Box bg="muted/100" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">muted/100</Text>
								</Box>
								<Box bg="muted/60" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">muted/60</Text>
								</Box>
								<Box bg="muted/20" p={4} borderWidth="1px" borderColor="border" minW="150px">
									<Text color="foreground" fontSize="sm">muted/20</Text>
								</Box>
							</HStack>
						</Box>

						<Box>
							<Text fontSize="sm" fontWeight="bold" mb={2}>Text Colors with Opacity</Text>
							<Box bg="background" p={4} borderWidth="1px" borderColor="border">
								<VStack align="start" gap={2}>
									<Text color="foreground/100">foreground/100 - Full opacity</Text>
									<Text color="foreground/80">foreground/80 - 80% opacity</Text>
									<Text color="foreground/60">foreground/60 - 60% opacity</Text>
									<Text color="foreground/40">foreground/40 - 40% opacity</Text>
									<Text color="foreground/20">foreground/20 - 20% opacity</Text>
								</VStack>
							</Box>
						</Box>

						<Box>
							<Text fontSize="sm" fontWeight="bold" mb={2}>Border Colors with Opacity</Text>
							<HStack gap={2} wrap="wrap">
								<Box p={4} borderWidth="2px" borderColor="border/100" minW="150px">
									<Text fontSize="sm">border/100</Text>
								</Box>
								<Box p={4} borderWidth="2px" borderColor="border/60" minW="150px">
									<Text fontSize="sm">border/60</Text>
								</Box>
								<Box p={4} borderWidth="2px" borderColor="border/20" minW="150px">
									<Text fontSize="sm">border/20</Text>
								</Box>
							</HStack>
						</Box>
					</VStack>
				</Box>

				{/* Theme Switcher */}
				<Box bg="card" p={6} borderRadius="md" borderWidth="1px" borderColor="border">
					<Text fontSize="xl" fontWeight="bold" mb={4}>Quick Theme Switch</Text>
					<HStack wrap="wrap" gap={2}>
						{(['github', 'ibm-carbon', 'gitlab-pajamas', 'tangere-terminal'] as const).map((t) => (
							<Button
								key={t}
								onClick={() => setTheme(t as ThemeName)}
								size="sm"
								variant={theme === t ? "solid" : "outline"}
							>
								{t}
							</Button>
						))}
					</HStack>
				</Box>
			</VStack>
		</Box>
	);
}
