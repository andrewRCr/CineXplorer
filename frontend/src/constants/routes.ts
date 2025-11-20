// constants/routes.ts

export const ROUTES = {
    HOME: "/", // Featured content (canonical URL)
    FEATURED: "/featured", // Alias that redirects to HOME
    PROFILE: "/profile",
    WATCHLIST: "/watchlist",
    LIBRARY: "/library",
    JOURNAL: "/journal",
    LOG: "/log",
    SETTINGS: "/settings",
    BROWSE: "/browse",
    NOW_PLAYING: "/browse/now-playing",
    UPCOMING: "/browse/upcoming",
    SEARCH_RESULTS: "/search",
    MOVIE_DETAIL: "/movie/:id",
    LOGIN: "/login",
    REGISTER: "/register",
    VERIFY_EMAIL: "/verify-email/:token",
    TEST_LOGIN: "/testlogin",
    TYPOGRAPHY_TEST: "/dev/typography-debug",
    // more to be added as needed
};

export const ROUTE_NAMES = {
    HOME: "Home",
    FEATURED: "Featured",
    PROFILE: "Profile",
    WATCHLIST: "Watchlist",
    LIBRARY: "Library",
    JOURNAL: "Journal",
    LOG: "Log",
    SETTINGS: "Settings",
    BROWSE: "Browse",
    NOW_PLAYING: "Now Playing",
    UPCOMING: "Upcoming",
    SEARCH_RESULTS: "Search Results",
    MOVIE_DETAIL: "Movie Detail",
    LOGIN: "Login",
    REGISTER: "Register",
    VERIFY_EMAIL: "Verify Email",
    TEST_LOGIN: "Test Login",
    TYPOGRAPHY_TEST: "Typography Debug",
    // more to be added as needed
};

// Paginated sources - for nav back from detail results
export const PAGINATED_SOURCES = {
    FEATURED: "featured",
    BROWSE: "browse",
    NOW_PLAYING: "now-playing",
    UPCOMING: "upcoming",
    SEARCH: "search",
    // more to be added as needed
};
