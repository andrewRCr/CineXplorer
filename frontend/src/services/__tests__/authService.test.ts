import { beforeEach, expect, it } from "vitest";
import { HttpResponse, http } from "msw/http";
import { resetPassword } from "../authService";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";

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
