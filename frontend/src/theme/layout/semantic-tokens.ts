/**
 * Layout Semantic Tokens
 *
 * Responsive layout tokens that adapt based on viewport size.
 * Uses Chakra UI v3 token reference syntax to reference foundation values.
 *
 * Token Reference Syntax: {sizes.token-name}
 * Mode-aware Syntax: { base: value, _dark: value }
 * Breakpoint Syntax: { base: mobileValue, lg: desktopValue }
 */

export const layoutSemanticTokens = {
    sizes: {
        /**
         * Layout tokens for major structural components
         * These use the 'layout.' namespace for clarity
         */

        /**
         * Navbar layout token
         * One row, including its bottom border, at every breakpoint.
         */
        "layout-navbar": { value: "65px" },

        /**
         * Footer layout token
         * References foundation token - same on all breakpoints
         */
        "layout-footer": {
            value: "{sizes.footer-height}",
        },

        /**
         * Sub-nav layout token (QuickBrowseBar height)
         * References foundation token - same on all breakpoints
         * Used for top offset on pages with browse controls
         *
         * When advanced drawer is open, add subnav-advanced-drawer-height:
         * calc(var(--chakra-sizes-layout-subnav) + var(--chakra-sizes-subnav-advanced-drawer-height))
         */
        "layout-subnav": {
            value: "{sizes.subnav-quick-bar-height}",
        },
    },
};
