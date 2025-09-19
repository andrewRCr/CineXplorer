/**
 * @deprecated MIGRATION IN PROGRESS - DO NOT REMOVE YET
 * 
 * This file is being gradually replaced by the Chakra UI theme system in 
 * `frontend/src/theme/index.ts`. 
 * 
 * MIGRATION STATUS:
 * ✅ COMPLETED: All filter components, pagination, navbar, footer, theme provider
 * ❌ TODO: ~30 components including NavBarUserMenu, Sidebar, MovieCard, Login/Register, etc.
 * 
 * This file will be removed once all components are migrated to use semantic tokens
 * like `bg="background.main"` instead of `bg={COLORS.background.main}`.
 * 
 * See WARP.md for full list of remaining components to migrate.
 */

// app-global theme/color constants

const palette = {
	discordDark: "#23272f",
	chakraGray900: "#1a202c",
	tailwindZinc900: "#18181b",
	gradientGrayLeft:
		"linear-gradient(90deg, #18181b 0%, #222227ff 25%, #18181b 50%)",

	gradientGrayCentered:
		"linear-gradient(90deg, #18181b 25%, #222227ff 50%, #18181b 75%)",
	gradientNavy:
		"linear-gradient(90deg, #071629ff 25%, #0c1e34ff 50%, #071629ff 75%)",
};

export const COLORS = {
	background: {
		main: palette.discordDark,
		navBar: palette.gradientGrayCentered,
		footer: palette.gradientGrayCentered,
		sidebar: palette.discordDark,
		subItem: palette.chakraGray900,
		skeleton: palette.tailwindZinc900,
	},
	border: {
		main: "red.300",
		subtle: "gray.200",
		separator: "gray.700",
		sidebar: "gray.700",
		input: "white",
		error: "#fed7d7", // Chakra red.200 equivalent
		success: "#c6f6d5", // Chakra green.200 equivalent
	},
	text: {
		main: "white",
		muted: "gray.300",
		error: "red.500",
		info: "gray.500",
		secondary: "gray.400",
		success: "#48bb78", // Chakra green.600 equivalent
		successDark: "#2f855a", // Chakra green.700 equivalent
	},
	accent: {
		primary: "blue.500",
		secondary: "blue.700",
		tertiary: "white",
		highlight: "#63b3ed", // Sidebar link hover
		link: "#4299e1", // Chakra blue.400 equivalent for consistent theming
		tagTeal: "teal",
		tagPurple: "purple",
	},
};
