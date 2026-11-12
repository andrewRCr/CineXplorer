import { beforeEach, expect, it } from "vitest";
import { HttpResponse, http } from "msw/http";
import {
    register,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
} from "../authService";
import { invalidateAuthSession } from "../apiClient";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { clearBrowserAuth, token } from "@tests/helpers/auth";
import { server } from "@tests/mocks/server";

type AnonymousOperation = {
    name: string;
    url: string;
    invoke: () => Promise<unknown>;
    successBody: Record<string, unknown>;
    expected: unknown;
    successStatus: number;
    errorStatus: number;
};

const registration = {
    message: "Please check your email to verify your account.",
    user_id: 42,
    email: "viewer@example.com",
    email_sent: true,
};

const operations: AnonymousOperation[] = [
    {
        name: "registration",
        url: `${apiBaseUrl}/register/`,
        invoke: () => register("viewer", "viewer@example.com", "new-password"),
        successBody: registration,
        expected: registration,
        successStatus: 201,
        errorStatus: 409,
    },
    {
        name: "email verification",
        url: `${apiBaseUrl}/verify-email/`,
        invoke: () => verifyEmail("verification-key"),
        successBody: { message: "Email verified", email: "viewer@example.com" },
        expected: { message: "Email verified", email: "viewer@example.com" },
        successStatus: 200,
        errorStatus: 400,
    },
    {
        name: "resend verification",
        url: `${apiBaseUrl}/resend-verification/`,
        invoke: () => resendVerificationEmail("resend-token"),
        successBody: { message: "Verification email sent" },
        expected: { message: "Verification email sent" },
        successStatus: 200,
        errorStatus: 503,
    },
    {
        name: "password reset request",
        url: `${siteOrigin}/_allauth/browser/v1/auth/password/request`,
        invoke: () => requestPasswordReset("viewer@example.com"),
        successBody: { status: 200 },
        expected: undefined,
        successStatus: 200,
        errorStatus: 503,
    },
];

beforeEach(() => {
    invalidateAuthSession();
    clearBrowserAuth();
    document.cookie = "csrftoken=django-csrf; path=/";
    window.location.href = "http://localhost:3000/forgot-password";
});

const cases = operations.flatMap((operation) =>
    (["localStorage", "sessionStorage"] as const).flatMap((storage) =>
        [true, false].map((succeeds) => ({ ...operation, storage, succeeds })),
    ),
);

it.each(cases)(
    "keeps $name independent of expired credentials ($storage, succeeds: $succeeds)",
    async ({
        url,
        invoke,
        successBody,
        expected,
        successStatus,
        errorStatus,
        storage,
        succeeds,
    }) => {
        const expired = token(1);
        setAuthTokens(expired, storage);
        let refreshes = 0;
        const csrf: Array<string | null> = [];
        const failure = { detail: "Unable to complete the request" };
        server.use(
            http.post(`${apiBaseUrl}/auth/refresh`, () => {
                refreshes++;
                return HttpResponse.json(
                    { detail: "Session expired" },
                    { status: 401 },
                );
            }),
            http.post(url, ({ request }) => {
                csrf.push(request.headers.get("X-CSRFToken"));
                return HttpResponse.json(succeeds ? successBody : failure, {
                    status: succeeds ? successStatus : errorStatus,
                });
            }),
        );
        if (succeeds) {
            await expect(invoke()).resolves.toEqual(expected);
        } else {
            await expect(invoke()).rejects.toMatchObject({
                response: { status: errorStatus, data: failure },
            });
        }
        expect(csrf).toEqual(["django-csrf"]);
        expect(refreshes).toBe(0);
        expect(window[storage].getItem("access_token")).toBe(expired);
        expect(window.location.href).toBe(
            "http://localhost:3000/forgot-password",
        );
    },
);
