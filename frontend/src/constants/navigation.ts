import { ROUTES, ROUTE_NAMES } from "./routes";

export interface NavigationItem {
    label: string;
    value: string;
    path: string;
    isAction?: boolean; // For special buttons like Log
}

export interface NavigationSection {
    title: string;
    items: NavigationItem[];
}

export const USER_NAVIGATION_ITEMS: NavigationItem[] = [
    {
        label: "Log",
        value: "log",
        path: "/log", // placeholder path
        isAction: true,
    },
    {
        label: ROUTE_NAMES.PROFILE,
        value: "profile",
        path: ROUTES.PROFILE,
    },
    {
        label: "Watchlist",
        value: "watchlist",
        path: "/watchlist", // placeholder path
    },
    {
        label: "Library",
        value: "library",
        path: "/library", // placeholder path
    },
    {
        label: "Journal",
        value: "journal",
        path: "/journal", // placeholder path
    },
];

export const MOVIE_VIEW_NAVIGATION_ITEMS: NavigationItem[] = [
    {
        label: ROUTE_NAMES.FEATURED,
        value: "featured",
        path: ROUTES.FEATURED,
    },
    {
        label: ROUTE_NAMES.BROWSE,
        value: "browse",
        path: ROUTES.BROWSE,
    },
    {
        label: ROUTE_NAMES.NOW_PLAYING,
        value: "now-playing",
        path: ROUTES.NOW_PLAYING,
    },
    {
        label: ROUTE_NAMES.UPCOMING,
        value: "upcoming",
        path: ROUTES.UPCOMING,
    },
];

export const NAVIGATION_SECTIONS: NavigationSection[] = [
    {
        title: "User",
        items: USER_NAVIGATION_ITEMS,
    },
    {
        title: "Browse",
        items: MOVIE_VIEW_NAVIGATION_ITEMS,
    },
];
