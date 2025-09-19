import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
	theme: {
		tokens: {
			colors: {
				// Raw color palette
				white: { value: "#FFFFFF" },
				black: { value: "#000000" },
				// Gray color palette
				gray: {
					"200": { value: "#E2E8F0" },
					"300": { value: "#CBD5E0" },
					"400": { value: "#A0AEC0" },
					"500": { value: "#718096" },
					"700": { value: "#4A5568" },
				},
				// Red color palette
				red: {
					"500": { value: "#E53E3E" },
				},
				// Blue color palette
				blue: {
					"500": { value: "#3182CE" },
					"700": { value: "#2C5282" },
				},
				// Teal color palette
				teal: { value: "#38B2AC" },
				// Purple color palette
				purple: { value: "#805AD5" },
				// Custom colors
				nearBlack: { value: "#0d0e0e" },
				discordDark: { value: "#23272f" },
				chakraGray900: { value: "#1a202c" },
				tailwindZinc900: { value: "#18181b" },
				gradientGrayLeft: {
					value:
						"linear-gradient(90deg, #18181b 0%, #222227ff 25%, #18181b 50%)",
				},
				gradientGrayCentered: {
					value:
						"linear-gradient(90deg, #18181b 25%, #222227ff 50%, #18181b 75%)",
				},
				gradientNavy: {
					value:
						"linear-gradient(90deg, #071629ff 25%, #0c1e34ff 50%, #071629ff 75%)",
				},
				fed7d7: { value: "#fed7d7" },
				c6f6d5: { value: "#c6f6d5" },
				"48bb78": { value: "#48bb78" },
				"2f855a": { value: "#2f855a" },
				"63b3ed": { value: "#63b3ed" },
				"4299e1": { value: "#4299e1" },
				customGrayBorder: { value: "#718096" },
			},
			fonts: {
				heading: {
					value: `'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
				},
				body: {
					value: `'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
				},
				system: {
					value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
				},
				inter: {
					value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
				},
				sourcesans: {
					value: `'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
				},
			},
		},
		semanticTokens: {
			colors: {
				background: {
					main: { value: "{colors.discordDark}" },
					navBar: { value: "{colors.tailwindZinc900}" },
					footer: { value: "{colors.gradientGrayCentered}" },
					sidebar: { value: "{colors.discordDark}" },
					sidebarInterior: { value: "{colors.tailwindZinc900}" },
					subItem: { value: "{colors.chakraGray900}" },
					hover: { value: "{colors.chakraGray900}" },
					selected: { value: "{colors.chakraGray900}" },
					skeleton: { value: "{colors.tailwindZinc900}" },
				},
				border: {
					subtle: { value: "{colors.gray.500}" },
					separator: { value: "{colors.gray.700}" },
					sidebar: { value: "{colors.gray.700}" },
					input: { value: "{colors.white}" },
					error: { value: "{colors.fed7d7}" },
					success: { value: "{colors.c6f6d5}" },
				},
				text: {
					main: { value: "{colors.white}" },
					muted: { value: "{colors.gray.300}" },
					error: { value: "{colors.red.500}" },
					info: { value: "{colors.gray.500}" },
					secondary: { value: "{colors.gray.400}" },
					success: { value: "{colors.48bb78}" },
					successDark: { value: "{colors.2f855a}" },
				},
				accent: {
					primary: { value: "{colors.blue.500}" },
					secondary: { value: "{colors.blue.700}" },
					tertiary: { value: "{colors.white}" },
					highlight: { value: "{colors.63b3ed}" },
					link: { value: "{colors.4299e1}" },
					tagTeal: { value: "{colors.teal}" },
					tagPurple: { value: "{colors.purple}" },
				},
			},
		},
	},
});

export const system = createSystem(defaultConfig, {
	...config,
	globalCss: {
		body: {
			bg: "background.main",
			color: "text.main",
		},
	},
});
