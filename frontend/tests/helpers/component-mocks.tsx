/**
 * Shared component mocks for testing
 *
 * Components that require specific context providers or have complex dependencies
 * can be mocked here for consistent test behavior across the test suite.
 *
 * **Important:** Due to Vitest's hoisting of `vi.mock()` calls, these helpers cannot be
 * imported and used directly with `vi.mock()`. Instead, use inline factory functions.
 *
 * **Use inline mocks for vi.mock():**
 * ```ts
 * vi.mock('@/components/ThemeSelector', () => ({
 *   ThemeSelector: () => <div data-testid="theme-selector">Theme Selector</div>
 * }));
 * ```
 *
 * **These helpers are available for:**
 * - Manual mocks (vi.doMock)
 * - Reference implementations (copy-paste into test files)
 * - Documentation of standard mock patterns
 */
import React from 'react';

/**
 * Mock for ThemeSelector component
 * Required because ThemeSelector uses useThemeSelect hook which needs ThemeSelectProvider context
 */
export const mockThemeSelector = () => ({
  ThemeSelector: () => <div data-testid="theme-selector">Theme Selector</div>
});

/**
 * Mock for ColorModeButton component
 * Simplifies testing of components that include theme controls
 */
export const mockColorModeButton = () => ({
  ColorModeButton: () => <button data-testid="color-mode-button">Color Mode</button>
});
