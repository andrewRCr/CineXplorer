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
         * References foundation token - same on all breakpoints
         */
        "layout-navbar": {
            value: "{sizes.navbar-height}",
        },

        /**
         * Sidebar layout token
         * Responsive: hidden (0) on mobile, visible (280px) on desktop
         */
        "layout-sidebar": {
            value: {
                base: "0px", // Mobile: sidebar hidden (drawer used instead)
                lg: "{sizes.sidebar-width}", // Desktop: sidebar visible
            },
        },

        /**
         * Footer layout token
         * References foundation token - same on all breakpoints
         */
        "layout-footer": {
            value: "{sizes.footer-height}",
        },
    },
};
