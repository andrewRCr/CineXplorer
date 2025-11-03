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
