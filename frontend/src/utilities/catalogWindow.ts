import { matchRoutes } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

export type CatalogWindow = "browse" | "now-playing" | "upcoming";

const windows: { path: string; window: CatalogWindow }[] = [
    { path: ROUTES.BROWSE, window: "browse" },
    { path: ROUTES.NOW_PLAYING, window: "now-playing" },
    { path: ROUTES.UPCOMING, window: "upcoming" },
];

/** Use the router's decoding, case and trailing-slash rules to identify a catalog window. */
export function catalogWindow(pathname: string): CatalogWindow | null {
    return matchRoutes(windows, { pathname })?.[0]?.route.window ?? null;
}
