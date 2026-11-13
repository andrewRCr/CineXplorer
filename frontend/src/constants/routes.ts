// constants/routes.ts

export const ROUTES = {
    HOME: "/", // Featured content (canonical URL)
    FEATURED: "/featured", // Alias that redirects to HOME
    PROFILE: "/profile",
    WATCHLIST: "/watchlist",
    SETTINGS: "/settings",
    BROWSE: "/browse",
    BROWSE_SEQUENTIAL: "/browse/sequential", // Reference implementation for sequential pagination
    NOW_PLAYING: "/browse/now-playing",
    UPCOMING: "/browse/upcoming",
    SEARCH_RESULTS: "/search",
    MOVIE_DETAIL: "/movie/:id",
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
    TEST_LOGIN: "/testlogin",
    TYPOGRAPHY_TEST: "/dev/typography-debug",
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
