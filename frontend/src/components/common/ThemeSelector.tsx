"use client";

import { useThemeSelect } from "@/hooks/useThemeSelect";
import { Button, Menu, Portal, ClientOnly, Skeleton } from "@chakra-ui/react";
import { themeRegistry, type ThemeName } from "@/theme";

/**
 * Theme metadata for display in selector
 */
interface ThemeOption {
  value: ThemeName;
  label: string;
}

/**
 * Theme options auto-discovered from theme registry.
 * Displays user-friendly labels while using technical theme names as values.
 */
const THEME_OPTIONS: ThemeOption[] = Object.entries(themeRegistry).map(
  ([value, theme]) => ({
    value: value as ThemeName,
    label: theme.label,
  }),
);

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
  // Find current theme option for display
  const currentTheme = THEME_OPTIONS.find((option) => option.value === theme);
  const displayLabel = currentTheme?.label || "Marquee"; // Fallback to default

  return (
    <ClientOnly fallback={<Skeleton height="10" width="32" />}>
      <Menu.Root positioning={{ placement: "top-start", gutter: 8 }}>
        <Menu.Trigger asChild>
          <Button variant="outline" size="sm">
            {displayLabel}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content
              bg="popover"
              borderColor="border-subtle-02"
              color="on-popover"
            >
              <Menu.RadioItemGroup
                value={theme}
                onValueChange={({ value }) => {
                  const selected = THEME_OPTIONS.find(
                    (option) => option.value === value,
                  );
                  if (selected) setTheme(selected.value);
                }}
              >
                {THEME_OPTIONS.map((option) => (
                  <Menu.RadioItem key={option.value} value={option.value}>
                    {option.label}
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </ClientOnly>
  );
}
