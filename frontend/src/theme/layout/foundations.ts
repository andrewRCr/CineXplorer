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
         * Navbar height - Fixed height for primary navigation bar
         * Calculation: 56px (top padding + content) + 36px (bottom padding) + 1px (border)
         */
        "navbar-height": { value: "93px" },

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
