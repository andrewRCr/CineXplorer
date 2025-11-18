"use client";

import * as React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import type { ThemeName } from "@/theme";
import { createThemeSystem, getTheme } from "@/theme";
import { ThemeContext, STORAGE_KEY, getInitialTheme } from "@/hooks/useThemeSelect";

/**
 * Theme Selection Provider
 *
 * Manages theme selection (github, ibm-carbon, etc.) with localStorage persistence.
 * Dynamically creates Chakra UI system when theme changes.
 *
 * Uses provider-based theme switching pattern (Crema article approach):
 * - When user selects a theme, we create a new Chakra system with those colors
 * - ChakraProvider re-renders with the new system
 * - No CSS selectors or data-theme attributes needed
 *
 * Separate from color mode (light/dark) which is managed by Chakra's color-mode system.
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
  const [themeName, setThemeNameState] = React.useState<ThemeName>(getInitialTheme);

  // Initialize system from saved theme (lazy initializer ensures persistence works)
  const [system, setSystem] = React.useState(() => {
    const initialThemeName = getInitialTheme();
    const initialTheme = getTheme(initialThemeName);
    return createThemeSystem(initialTheme);
  });

  // When theme changes, create new system and update localStorage
  const setTheme = React.useCallback((newThemeName: ThemeName) => {
    setThemeNameState(newThemeName);
    const theme = getTheme(newThemeName);
    const newSystem = createThemeSystem(theme);
    setSystem(newSystem);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newThemeName);
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({ theme: themeName, setTheme }),
    [themeName, setTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ChakraProvider value={system}>
        {children}
      </ChakraProvider>
    </ThemeContext.Provider>
  );
}
