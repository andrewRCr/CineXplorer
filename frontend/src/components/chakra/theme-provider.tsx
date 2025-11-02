"use client";

import * as React from "react";
import { defaultThemeName, themeRegistry, type ThemeName } from "@/theme";

interface ThemeContextValue {
	theme: ThemeName;
	setTheme: (theme: ThemeName) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "cinexplorer-theme";

/**
 * Theme Selection Provider
 *
 * Manages theme selection (github, ibm-carbon, etc.) with localStorage persistence.
 * Separate from color mode (light/dark) which is managed by next-themes.
 *
 * This provider manages the `data-theme` attribute on the document root,
 * enabling dynamic theme switching via Chakra UI conditions.
 *
 * Usage:
 * ```tsx
 * import { useThemeSelect } from "./chakra/theme-provider"
 *
 * const { theme, setTheme } = useThemeSelect()
 * setTheme("ibm-carbon") // Switch to IBM Carbon theme
 * ```
 */
export function ThemeSelectProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = React.useState<ThemeName>(() => {
		// Initialize from localStorage or use default
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(STORAGE_KEY) as ThemeName;
			if (saved && saved in themeRegistry) {
				return saved;
			}
		}
		return defaultThemeName;
	});

	// Update data-theme attribute when theme changes
	React.useEffect(() => {
		if (typeof window !== "undefined") {
			document.documentElement.setAttribute("data-theme", theme);
			localStorage.setItem(STORAGE_KEY, theme);
		}
	}, [theme]);

	const value = React.useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme selection state
 *
 * Returns current theme and setter function.
 * Must be used within ThemeSelectProvider.
 */
export function useThemeSelect(): ThemeContextValue {
	const context = React.useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useThemeSelect must be used within a ThemeSelectProvider");
	}
	return context;
}
