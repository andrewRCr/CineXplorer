import { HttpResponse, http } from "msw";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { server } from "../mocks/server";

export const profile = {
    id: 7,
    username: "viewer",
    email: "viewer@example.com",
    first_name: "Movie",
    last_name: "Viewer",
    email_verified: true,
    full_name: "Movie Viewer",
};

export function token(exp = Math.floor(Date.now() / 1000) + 300): string {
    return `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ exp, user_id: profile.id, token_type: "access" }))}.signature`;
}

export function clearBrowserAuth(): void {
    localStorage.clear();
    sessionStorage.clear();
    for (const cookie of document.cookie.split(";")) {
        document.cookie = `${cookie.split("=")[0]?.trim()}=; Max-Age=0; path=/`;
    }
}

export function authHandlers(): void {
    server.use(
        http.get(`${siteOrigin}/_allauth/browser/v1/auth/session`, () =>
            HttpResponse.json({ status: 401 }, { status: 401 }),
        ),
        http.get(`${apiBaseUrl}/profile/`, () => HttpResponse.json(profile)),
        http.get(`${apiBaseUrl}/csrf/`, () => {
            document.cookie = "csrftoken=csrf-test-token; path=/";
            return HttpResponse.json({});
        }),
        http.post(`${apiBaseUrl}/logout/`, () =>
            HttpResponse.json({ message: "Logged out" }),
        ),
        http.post(`${apiBaseUrl}/auth/refresh`, () =>
            HttpResponse.json({}, { status: 401 }),
        ),
    );
}
