import { beforeEach, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import apiClient from "../apiClient";
import { apiBaseUrl } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth, token } from "@tests/helpers/auth";

beforeEach(clearBrowserAuth);
it.each(["post", "put", "patch", "delete"] as const)(
    "sends Django's CSRF cookie on %s",
    async (method) => {
        document.cookie = "csrftoken=django-csrf; path=/";
        server.use(
            http.all(`${apiBaseUrl}/protected`, ({ request }) =>
                request.headers.get("X-CSRFToken") === "django-csrf"
                    ? HttpResponse.json({ accepted: true })
                    : HttpResponse.json(
                          { detail: "CSRF required" },
                          { status: 403 },
                      ),
            ),
        );
        expect(
            (await apiClient.request({ method, url: "/protected" })).data,
        ).toEqual({ accepted: true });
    },
);
it("initializes a missing CSRF cookie before an unsafe request", async () => {
    let csrfRequests = 0;
    server.use(
        http.get(`${apiBaseUrl}/csrf/`, () => {
            csrfRequests++;
            document.cookie = "csrftoken=new-csrf; path=/";
            return HttpResponse.json({});
        }),
        http.post(`${apiBaseUrl}/protected`, ({ request }) =>
            request.headers.get("X-CSRFToken") === "new-csrf"
                ? HttpResponse.json({ accepted: true })
                : HttpResponse.json({}, { status: 403 }),
        ),
    );
    expect((await apiClient.post("/protected")).data).toEqual({
        accepted: true,
    });
    expect(csrfRequests).toBe(1);
});
it("makes no CSRF initialization request before a safe request", async () => {
    let csrfRequests = 0;
    server.use(
        http.get(`${apiBaseUrl}/csrf/`, () => {
            csrfRequests++;
            return HttpResponse.json({});
        }),
        http.get(`${apiBaseUrl}/protected`, () =>
            HttpResponse.json({ safe: true }),
        ),
    );
    expect((await apiClient.get("/protected")).data).toEqual({ safe: true });
    expect(csrfRequests).toBe(0);
});
it("sends CSRF on the refresh request after a 401", async () => {
    document.cookie = "csrftoken=django-csrf; path=/";
    setAuthTokens(token());
    const refreshed = token(Math.floor(Date.now() / 1000) + 600);
    server.use(
        http.get(`${apiBaseUrl}/protected`, ({ request }) =>
            request.headers.get("Authorization") === `Bearer ${refreshed}`
                ? HttpResponse.json({ accepted: true })
                : HttpResponse.json({}, { status: 401 }),
        ),
        http.post(`${apiBaseUrl}/auth/refresh`, ({ request }) =>
            request.headers.get("X-CSRFToken") === "django-csrf"
                ? HttpResponse.json({ access_token: refreshed })
                : HttpResponse.json({}, { status: 403 }),
        ),
    );
    expect((await apiClient.get("/protected")).data).toEqual({
        accepted: true,
    });
});
