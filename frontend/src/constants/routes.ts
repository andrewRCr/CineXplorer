// constants/routes.ts

export const ROUTES = {
	HOME: "/", // Redirects to Popular movies
	PROFILE: "/profile",
	WATCHLIST: "/watchlist",
	LIBRARY: "/library",
	JOURNAL: "/journal",
	LOG: "/log",
	SETTINGS: "/settings",
	MOVIES: "/movies",
	NOW_PLAYING: "/movies/now-playing",
	UPCOMING: "/movies/upcoming",
	POPULAR: "/movies/popular",
	TOP_RATED: "/movies/top-rated",
	SEARCH_RESULTS: "/search",
	MOVIE_DETAIL: "/movie/:id",
	LOGIN: "/login",
	REGISTER: "/register",
	VERIFY_EMAIL: "/verify-email/:token",
	TEST_LOGIN: "/testlogin",
	// more to be added as needed
};

export const ROUTE_NAMES = {
	HOME: "Home", // Now serves Popular content
	PROFILE: "Profile",
	WATCHLIST: "Watchlist",
	LIBRARY: "Library",
	JOURNAL: "Journal",
	LOG: "Log",
	SETTINGS: "Settings",
	NOW_PLAYING: "Now Playing",
	UPCOMING: "Upcoming",
	POPULAR: "Popular",
	TOP_RATED: "Top Rated",
	SEARCH_RESULTS: "Search Results",
	MOVIE_DETAIL: "Movie Detail",
	LOGIN: "Login",
	REGISTER: "Register",
	VERIFY_EMAIL: "Verify Email",
	TEST_LOGIN: "Test Login",
	// more to be added as needed
};

// Paginated sources - for nav back from detail results
export const PAGINATED_SOURCES = {
	NOW_PLAYING: "now-playing",
	UPCOMING: "upcoming",
	POPULAR: "popular",
	TOP_RATED: "top-rated",
	SEARCH: "search",
	// more to be added as needed (search, etc)
};
