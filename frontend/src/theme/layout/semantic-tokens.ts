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
         * Responsive: 64px on mobile (single row), 93px on desktop (two rows)
         */
        "layout-navbar": {
            value: {
                base: "{sizes.navbar-height-mobile}",   // Mobile: 64px
                lg: "{sizes.navbar-height-desktop}",    // Desktop: 93px
            },
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

        /**
         * Sub-nav layout token (collapsible QuickBrowseBar)
         * References foundation token - same on all breakpoints
         * Used for top offset on pages with browse controls
         */
        "layout-subnav": {
            value: "{sizes.subnav-height}",
        },
    },
};
