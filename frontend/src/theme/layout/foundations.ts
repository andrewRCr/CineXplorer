/**
 * Layout Foundation Tokens
 *
 * Base layout size values used throughout the application.
 * These are the source of truth for all layout dimensions.
 *
 * Usage: Referenced by semantic tokens using Chakra's token reference syntax
 * Example: `{sizes.navbar-height}` in semantic token definitions
 */

export const layoutFoundations = {
    sizes: {
        /**
         * Navbar height (mobile) - Single row with extra bottom padding
         * Calculation: pt(2) ~8px + content ~48px + pb(2) ~8px = 64px + 1px border = 65px
         */
        "navbar-height-mobile": { value: "65px" },

        /**
         * Navbar height (desktop) - Two rows (logo/search + nav tabs)
         * Calculation: pt(2) ~8px + first row ~48px + second row ~36px + border 1px = 93px
         */
        "navbar-height-desktop": { value: "93px" },

        /**
         * Sidebar width - Fixed width for desktop sidebar navigation
         * Used for desktop layout, hidden on mobile (handled by semantic tokens)
         */
        "sidebar-width": { value: "280px" },

        /**
         * Footer height - Approximate height for footer component
         * Note: Footer height is fluid based on content, this is an estimate
         */
        "footer-height": { value: "64px" },
    },
};
