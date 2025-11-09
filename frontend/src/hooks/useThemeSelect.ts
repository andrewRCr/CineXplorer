"use client";

import * as React from "react";
import { defaultThemeName, themeRegistry, type ThemeName } from "@/theme";

interface ThemeContextValue {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
}

export const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export const STORAGE_KEY = "cinexplorer-theme";

/**
 * Hook to access theme selection state
 *
 * Returns current theme and setter function.
 * Must be used within ThemeSelectProvider.
 *
 * Usage:
 * ```tsx
 * import { useThemeSelect } from "@/hooks/useThemeSelect"
 *
 * const { theme, setTheme } = useThemeSelect()
 * setTheme("ibm-carbon") // Switch to IBM Carbon theme
 * ```
 */
export function useThemeSelect(): ThemeContextValue {
    const context = React.useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useThemeSelect must be used within a ThemeSelectProvider");
    }
    return context;
}

/**
 * Initialize theme from localStorage or use default
 */
export function getInitialTheme(): ThemeName {
    if (typeof window !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemeName;
        if (saved && saved in themeRegistry) {
            return saved;
        }
    }
    return defaultThemeName;
}
