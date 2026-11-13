/**
 * Z-Index Semantic Tokens
 *
 * Defines stacking context for application layers.
 * Uses semantic naming to convey meaning rather than arbitrary numbers.
 *
 * Scale Philosophy:
 * - base (1): Default content layer
 * - debug (5): Theme and layout debug tools
 * - footer (6): Footer above content
 * - navbar (10): Primary navigation, always on top of content
 * - dropdown (9999): Overlays, modals, tooltips (must appear above everything)
 */

export const zIndexSemanticTokens = {
    zIndex: {
        /**
         * Base z-index for standard content
         * Used for: Cards, content sections, default elements
         */
        base: { value: 1 },

        /**
         * Theme debug tool z-index
         * Used for: ThemeDebug page sticky header
         */
        "theme-debug": { value: 5 },

        /**
         * Layout debug tool z-index
         * Used for: LayoutDebug page sticky header
         */
        "layout-debug": { value: 5 },

        /**
         * Footer z-index
         * Used for: Application footer
         * Appears above content but below navbar
         */
        footer: { value: 6 },

        /**
         * Navbar z-index
         * Used for: Primary navigation bar
         * Always visible above content
         */
        navbar: { value: 10 },

        /**
         * Dropdown z-index
         * Used for: Dropdowns, modals, tooltips, overlays
         * Must appear above all other application content
         */
        dropdown: { value: 9999 },
    },
};
