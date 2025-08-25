// constants/routes.ts

export const ROUTES = {
	HOME: "/",
	PROFILE: "/profile",
	SETTINGS: "/settings",
	NOW_PLAYING: "/now-playing",
	UPCOMING: "/upcoming",
	MOVIE_DETAIL: "/movie/:id",
	LOGIN: "/login",
	REGISTER: "/register",
	TEST_LOGIN: "/testlogin",
	// more to be added as needed
};

export const ROUTE_NAMES = {
	HOME: "Home",
	PROFILE: "Profile",
	SETTINGS: "Settings",
	NOW_PLAYING: "Now Playing",
	UPCOMING: "Upcoming",
	MOVIE_DETAIL: "Movie Detail",
	LOGIN: "Login",
	REGISTER: "Register",
	TEST_LOGIN: "Test Login",
	// more to be added as needed
};

// Paginated sources - for nav back from detail results
export const PAGINATED_SOURCES = {
	NOW_PLAYING: "now-playing",
	UPCOMING: "upcoming",
	// more to be added as needed (search, etc)
};
