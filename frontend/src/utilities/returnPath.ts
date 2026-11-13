/**
 * The page to return to after signing in, carried as `next` on the sign-in URL.
 *
 * `next` arrives in a URL anyone can link to, so only a path on this site is accepted, and never a
 * sign-in page, which would send a signed-in visitor straight back to itself.
 */
import { ROUTES } from "@/constants/routes";
import { matchRoutes } from "react-router";

const signInRoutes = [
    ROUTES.LOGIN,
    ROUTES.REGISTER,
    ROUTES.FORGOT_PASSWORD,
].map((path) => ({ path }));

function signInRoute(pathname: string): string | undefined {
    return matchRoutes(signInRoutes, { pathname })?.[0]?.route.path;
}

/** The value as a path on this site, or null when it is missing, leaves the site or is a sign-in page. */
export function safeReturnPath(
    value: string | null | undefined,
): string | null {
    if (!value?.startsWith("/")) return null;
    let url: URL;
    try {
        // The URL parser drops tabs and newlines and reads "\" as "/", as browsers do, so a value
        // such as "/\evil.example" resolves to the other site here and is refused.
        url = new URL(value, window.location.origin);
    } catch {
        return null;
    }
    if (url.origin !== window.location.origin) return null;
    // Dot segments can turn "/.//evil.example" into "//evil.example", which a browser reads as
    // another site.
    if (url.pathname.startsWith("//")) return null;
    if (signInRoute(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
}

/** The page to go to after signing in, read from a sign-in URL's query string. */
export function returnPathFrom(search: string): string {
    return (
        safeReturnPath(new URLSearchParams(search).get("next")) ?? ROUTES.HOME
    );
}

/** The sign-in URL that returns to the given page afterwards. */
export function loginPathFor(returnTo: string | null): string {
    const path = safeReturnPath(returnTo);
    return path
        ? `${ROUTES.LOGIN}?next=${encodeURIComponent(path)}`
        : ROUTES.LOGIN;
}

/** The bar's sign-in link, preserving an accepted return target on sign-in pages. */
export function signInPathFor(pathname: string, search: string): string {
    const path = signInRoute(pathname);
    if (path === ROUTES.LOGIN)
        return loginPathFor(new URLSearchParams(search).get("next"));
    if (path) return ROUTES.LOGIN;
    return loginPathFor(`${pathname}${search}`);
}
