export type CatalogWindow = "browse" | "now-playing" | "upcoming";

/** Match the catalog routes with React Router's case and trailing-slash rules. */
export function catalogWindow(pathname: string): CatalogWindow | null {
    const path = pathname.replace(/\/+$/, "").toLowerCase();
    if (path === "/browse") return "browse";
    if (path === "/browse/now-playing") return "now-playing";
    if (path === "/browse/upcoming") return "upcoming";
    return null;
}
