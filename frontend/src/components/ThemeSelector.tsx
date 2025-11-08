"use client";

import * as React from "react";
import { useThemeSelect } from "@/hooks/useThemeSelect";
import { Button, Menu, Portal, ClientOnly, Skeleton } from "@chakra-ui/react";
import { themeRegistry, type ThemeName } from "@/theme";

/**
 * Theme metadata for display in selector
 */
interface ThemeOption {
  value: ThemeName;
  label: string;
  description: string;
}

/**
 * Theme options auto-discovered from theme registry.
 * Displays user-friendly labels while using technical theme names as values.
 */
const THEME_OPTIONS: ThemeOption[] = Object.entries(themeRegistry).map(([value, theme]) => ({
  value: value as ThemeName,
  label: theme.name,
  description: theme.label,
}));

/**
 * ThemeSelector Component
 *
 * Dropdown menu for selecting between available themes.
 * Auto-discovers themes from registry - adding new themes requires no component changes.
 *
 * Features:
 * - next-themes integration for state management and persistence
 * - SSR-safe rendering (prevents hydration mismatch)
 * - Auto-populated from theme registry
 * - Displays current theme in button
 *
 * Usage:
 * ```tsx
 * <ThemeSelector />
 * ```
 */
export function ThemeSelector() {
  const { theme, setTheme } = useThemeSelect();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch - theme value only available after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Show skeleton during SSR and initial client render
  if (!mounted) {
    return <Skeleton height="10" width="32" />;
  }

  // Find current theme option for display
  const currentTheme = THEME_OPTIONS.find((option) => option.value === theme);
  const displayLabel = currentTheme?.label || "IBM Carbon"; // Fallback to default

  return (
    <ClientOnly fallback={<Skeleton height="10" width="32" />}>
      <Menu.Root positioning={{ placement: "top-start", gutter: 8 }}>
        <Menu.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            borderWidth="1px"
            borderColor="border"
          >
            {displayLabel}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              {THEME_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  value={option.value}
                  onClick={() => setTheme(option.value)}
                  bg={theme === option.value ? "tertiary" : undefined}
                  color={theme === option.value ? "on-tertiary" : undefined}
                  _hover={{
                    bg: theme === option.value ? "tertiary" : "tertiary/8",
                    opacity: theme === option.value ? 0.92 : 1,
                  }}
                >
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </ClientOnly>
  );
}
