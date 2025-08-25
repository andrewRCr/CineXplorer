// app-global theme/color constants

const palette = {
	discordDark: "#23272f",
	chakraGray900: "#1a202c",
	tailwindZinc900: "#18181b",
	gradientGray:
		"linear-gradient(90deg, #18181b 25%, #222227ff 50%, #18181b 75%)",
	gradientNavy:
		"linear-gradient(90deg, #071629ff 25%, #0c1e34ff 50%, #071629ff 75%)",
};

export const COLORS = {
	background: {
		main: palette.discordDark,
		navBar: palette.gradientGray,
		footer: palette.gradientGray,
		sidebar: palette.discordDark,
	},
	border: {
		main: "gray.700",
		separator: "gray.700",
		sidebar: "gray.700",
	},
	text: {
		main: "white",
		muted: "gray.300",
		error: "red.500",
		info: "gray.500",
		secondary: "gray.400",
	},
	accent: {
		primary: "blue.500",
		secondary: "green",
		highlight: "#63b3ed", // Sidebar link hover
		tagTeal: "teal",
		tagPurple: "purple",
	},
};
