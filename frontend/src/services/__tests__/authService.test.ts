import { beforeEach, expect, expectTypeOf, it } from "vitest";
import { HttpResponse, http } from "msw/http";
import { login, register, resetPassword } from "../authService";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import type { components } from "@/types/api";
import { clearBrowserAuth, token } from "@tests/helpers/auth";

import { setAuthTokens } from "@/utilities/tokenUtils";

beforeEach(clearBrowserAuth);
it.each([true, false])(
    "sends CSRF when resetting a password (cookie present: %s)",
    async (present) => {
        if (present) document.cookie = "csrftoken=django-csrf; path=/";
        server.use(
            http.get(`${apiBaseUrl}/csrf/`, () => {
                document.cookie = "csrftoken=django-csrf; path=/";
                return HttpResponse.json({});
            }),
            http.post(
                `${siteOrigin}/_allauth/browser/v1/auth/password/reset`,
                ({ request }) =>
                    request.headers.get("X-CSRFToken") === "django-csrf"
                        ? HttpResponse.json({ status: 401 }, { status: 401 })
                        : HttpResponse.json(
                              { detail: "CSRF required" },
                              { status: 403 },
                          ),
            ),
        );
        await expect(resetPassword("key", "new-password")).resolves.toEqual({
            success: true,
            autoLoggedIn: false,
        });
    },
);

it("returns the registration confirmation from a created account", async () => {
    const confirmation = {
        message:
            "Registration successful. Please check your email to verify your account.",
        user_id: 42,
        email: "new-viewer@example.com",
        email_sent: true,
    } satisfies components["schemas"]["RegisterResponseSchema"];
    document.cookie = "csrftoken=django-csrf; path=/";
    server.use(
        http.post(`${apiBaseUrl}/register/`, async ({ request }) => {
            expect(request.headers.get("X-CSRFToken")).toBe("django-csrf");
            expect(await request.json()).toEqual({
                username: "new-viewer",
                email: confirmation.email,
                password: "new-account-password",
                first_name: "New",
                last_name: "Viewer",
            });
            return HttpResponse.json(confirmation, { status: 201 });
        }),
    );

    const response = await register(
        "new-viewer",
        confirmation.email,
        "new-account-password",
        "New",
        "Viewer",
    );

    expectTypeOf(response).toEqualTypeOf<
        components["schemas"]["RegisterResponseSchema"]
    >();
    expect(response).toEqual(confirmation);
});

it.each([
    { expired: true, accepted: true },
    { expired: true, accepted: false },
    { expired: false, accepted: false },
])(
    "keeps explicit sign-in independent of old renewal (expired: $expired, accepted: $accepted)",
    async ({ expired, accepted }) => {
        document.cookie = "csrftoken=django-csrf; path=/";
        window.location.href = "http://localhost:3000";
        setAuthTokens(expired ? token(1) : token());
        const signedIn = {
            access_token: token(Math.floor(Date.now() / 1000) + 900),
            user_id: 42,
            username: "new-viewer",
            email_verified: true,
        } satisfies components["schemas"]["TokenResponseSchema"];
        let refreshes = 0;
        let signIns = 0;
        server.use(
            http.post(`${apiBaseUrl}/auth/refresh`, () => {
                refreshes++;
                return HttpResponse.json(
                    { detail: "Old session expired" },
                    { status: 401 },
                );
            }),
            http.post(`${apiBaseUrl}/token/`, ({ request }) => {
                signIns++;
                if (request.headers.get("X-CSRFToken") !== "django-csrf") {
                    return HttpResponse.json(
                        { detail: "CSRF required" },
                        { status: 403 },
                    );
                }
                return accepted
                    ? HttpResponse.json(signedIn)
                    : HttpResponse.json(
                          { detail: "Invalid credentials" },
                          { status: 401 },
                      );
            }),
        );
        if (accepted) {
            await expect(login("new-viewer", "password")).resolves.toEqual(
                signedIn,
            );
        } else {
            await expect(
                login("new-viewer", "wrong-password"),
            ).rejects.toMatchObject({
                response: {
                    status: 401,
                    data: { detail: "Invalid credentials" },
                },
            });
        }
        expect(signIns).toBe(1);
        expect(refreshes).toBe(0);
        expect(window.location.href).toBe("http://localhost:3000");
    },
);
