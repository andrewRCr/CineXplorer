"use client";

import { useEffect } from "react";
import {
  ColorModeProvider,
  type ColorModeProviderProps,
  useColorMode,
} from "./color-mode";
import { ThemeSelectProvider } from "./theme-provider";
import { useThemeSelect } from "@/hooks/useThemeSelect";
import { getTheme } from "@/theme";

const BG_STORAGE_KEY = "cinexplorer-bg";

/**
 * Syncs the current theme's background color to localStorage and document.
 * This prevents flash of wrong background color on page load.
 * The index.html script reads this value before React loads.
 */
function BackgroundSync() {
  const { theme } = useThemeSelect();
  const { colorMode } = useColorMode();

  useEffect(() => {
    const themeConfig = getTheme(theme);
    const bg =
      colorMode === "dark"
        ? themeConfig.darkUnified.background
        : themeConfig.lightUnified.background;

    // Store for next page load (read by index.html script)
    localStorage.setItem(BG_STORAGE_KEY, bg);

    // Apply immediately to prevent any flash during this session
    document.documentElement.style.setProperty("--app-bg", bg);
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [theme, colorMode]);

  return null;
}

export function Provider(props: ColorModeProviderProps) {
  return (
    <ThemeSelectProvider>
      <ColorModeProvider {...props}>
        <BackgroundSync />
        {props.children}
      </ColorModeProvider>
    </ThemeSelectProvider>
  );
}
