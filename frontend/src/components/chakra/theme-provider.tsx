"use client";

import * as React from "react";
import type { ThemeName } from "@/theme";
import { ThemeContext, STORAGE_KEY, getInitialTheme } from "@/hooks/useThemeSelect";

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
 * import { useThemeSelect } from "@/hooks/useThemeSelect"
 *
 * const { theme, setTheme } = useThemeSelect()
 * setTheme("ibm-carbon") // Switch to IBM Carbon theme
 * ```
 */
export function ThemeSelectProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = React.useState<ThemeName>(getInitialTheme);

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
