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
         * Sidebar width - Fixed width for desktop sidebar navigation
         * Used for desktop layout, hidden on mobile (handled by semantic tokens)
         */
        "sidebar-width": { value: "280px" },

        /**
         * Footer height - Approximate height for footer component
         * Note: Footer height is fluid based on content, this is an estimate
         */
        "footer-height": { value: "64px" },

        /**
         * Sub-nav QuickBrowseBar height - The primary filter bar on collection pages
         * Present when browse controls are shown; collapses on scroll down, expands on scroll up.
         * Calculation: py(2) ~8px + controls ~32px + py(2) ~8px + border 1px = ~49px, rounded to 52px
         */
        "subnav-quick-bar-height": { value: "52px" },

        /**
         * Sub-nav AdvancedFiltersPanel height - Drawer toggled open from QuickBrowseBar
         * This is an estimate; actual height varies slightly based on content.
         * Used for top padding calculation when advanced panel drawer is open.
         */
        "subnav-advanced-drawer-height": { value: "200px" },
    },
};
