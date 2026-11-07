import { createElement } from "react";
import { act, render, screen } from "@tests/helpers/test-renderer";
import {
    Toaster,
    toaster,
    priorityToaster,
} from "@/components/core/chakra/toaster";
import {
    requestPasswordReset,
    resendVerificationEmail,
} from "@/services/authService";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import { HttpResponse, http } from "msw/http";
import apiClient, { refreshAccessToken } from "../apiClient";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { setAuthTokens } from "@/utilities/tokenUtils";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth, token } from "@tests/helpers/auth";

import { gate, installWebLocks } from "@tests/helpers/web-locks";

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

const queueToken = (exp: number) =>
    `e30.${btoa(JSON.stringify({ user_id: 42, exp }))}.signature`;
const oldToken = queueToken(1);
const newToken = queueToken(4102444800);

const createGate = () => {
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { wait, release: () => release() };
};

const withinDeadline = async <T>(promise: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(
                    () => reject(new Error("Refresh left a request pending")),
                    2000,
                );
            }),
        ]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
};

describe("concurrent token refresh", () => {
    let client: AxiosInstance;

    beforeEach(async () => {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = "access_token=; Max-Age=0; Path=/";
        document.cookie = "csrftoken=django-csrf; path=/";
        window.location.href = "http://localhost:3000";
        vi.resetModules();
        client = (await import("../apiClient")).default;
        localStorage.setItem("access_token", oldToken);
    });

    const startRequests = async (refreshResponse: () => Response) => {
        const gate = createGate();
        const requests: string[] = [];
        let refreshes = 0;
        server.use(
            http.get(
                `${apiBaseUrl}/refresh-queue/:name`,
                ({ request, params }) => {
                    const name = String(params.name);
                    requests.push(name);
                    return request.headers.get("Authorization") ===
                        `Bearer ${newToken}`
                        ? HttpResponse.json({ name })
                        : HttpResponse.json(
                              { detail: "Unauthorized" },
                              { status: 401 },
                          );
                },
            ),
            http.post(`${apiBaseUrl}/auth/refresh`, async () => {
                refreshes++;
                await gate.wait;
                return refreshResponse();
            }),
        );

        // Attach rejection handlers before either request can reject.
        const outcomes = Promise.allSettled([
            client.get("/refresh-queue/first"),
            client.get("/refresh-queue/second"),
        ]);
        try {
            await waitFor(() => expect(requests).toHaveLength(2));
            // Let both completed 401 responses reach their interceptors before release.
            await new Promise((resolve) => setTimeout(resolve, 20));
        } finally {
            gate.release();
        }
        return { results: await withinDeadline(outcomes), requests, refreshes };
    };

    it.each(["rejected refresh", "missing token", "invalid token"])(
        "settles both callers after a %s",
        async (scenario) => {
            const { results, requests, refreshes } = await startRequests(() =>
                scenario === "rejected refresh"
                    ? HttpResponse.json(
                          { detail: "Session expired" },
                          { status: 401 },
                      )
                    : scenario === "missing token"
                      ? HttpResponse.json({})
                      : HttpResponse.json({ access_token: 42 }),
            );

            expect(results.map((result) => result.status)).toEqual([
                "rejected",
                "rejected",
            ]);
            expect(refreshes).toBe(1);
            expect(requests.sort()).toEqual(["first", "second"]);
            expect(localStorage.getItem("access_token")).toBeNull();
            expect(window.location.href).toBe("/login?session_expired=true");
        },
    );

    it("resumes both callers after one successful refresh", async () => {
        const { results, requests, refreshes } = await startRequests(() =>
            HttpResponse.json({ access_token: newToken }),
        );

        expect(results.map((result) => result.status)).toEqual([
            "fulfilled",
            "fulfilled",
        ]);
        for (const result of results) {
            if (result.status === "fulfilled")
                expect(result.value.data).toHaveProperty("name");
        }
        expect(refreshes).toBe(1);
        expect(requests.sort()).toEqual(["first", "first", "second", "second"]);
        expect(localStorage.getItem("access_token")).toBe(newToken);
        expect(window.location.href).toBe("http://localhost:3000");
    });
});

it("keeps renewed authentication when the retried request is still refused", async () => {
    document.cookie = "csrftoken=django-csrf; path=/";
    window.location.href = "http://localhost:3000";
    setAuthTokens(token(1));
    const refreshed = token();
    let refreshes = 0;
    let requests = 0;
    server.use(
        http.get(`${apiBaseUrl}/retry-refused`, () => {
            requests++;
            return HttpResponse.json({}, { status: 401 });
        }),
        http.post(`${apiBaseUrl}/auth/refresh`, () => {
            refreshes++;
            return HttpResponse.json({ access_token: refreshed });
        }),
    );
    await expect(apiClient.get("/retry-refused")).rejects.toMatchObject({
        response: { status: 401 },
    });
    expect(requests).toBe(2);
    expect(refreshes).toBe(1);
    expect(localStorage.getItem("access_token")).toBe(refreshed);
    expect(window.location.href).toBe("http://localhost:3000");
});

it.each(["later", "same", "earlier", "expired"] as const)(
    "uses another tab's token only when newer and current: %s",
    async (scenario) => {
        installWebLocks();
        document.cookie = "csrftoken=django-csrf; path=/";
        const now = Math.floor(Date.now() / 1000);
        const original = token(scenario === "expired" ? 1 : now + 600);
        const candidate =
            token(
                scenario === "expired"
                    ? 2
                    : now +
                          (scenario === "later"
                              ? 900
                              : scenario === "same"
                                ? 600
                                : 300),
            ) + "other-signature";
        const renewed = token(now + 1200);
        setAuthTokens(original);
        const entered = gate();
        const release = gate();
        const otherTab = navigator.locks.request(
            "cinexplorer-auth-refresh",
            async () => {
                entered.release();
                await release.wait;
            },
        );
        await entered.wait;
        let refreshes = 0;
        server.use(
            http.post(`${apiBaseUrl}/auth/refresh`, () => {
                refreshes++;
                return HttpResponse.json({ access_token: renewed });
            }),
        );
        const pending = refreshAccessToken();
        setAuthTokens(candidate);
        expect(refreshes).toBe(0);
        release.release();
        await otherTab;
        expect(await pending).toBe(scenario === "later" ? candidate : renewed);
        expect(refreshes).toBe(scenario === "later" ? 0 : 1);
    },
);

describe("email failures and the global server-error toast", () => {
    beforeEach(() => {
        act(() => {
            toaster.remove();
            priorityToaster.remove();
        });
        document.cookie = "csrftoken=django-csrf; path=/";
    });
    afterEach(() => {
        act(() => {
            toaster.remove();
            priorityToaster.remove();
        });
    });
    it.each([
        ["reset", 503, false],
        ["resend", 503, false],
        ["reset", 500, true],
        ["resend", 500, true],
        ["other", 503, true],
    ] as const)(
        "%s %s shows a global error: %s",
        async (endpoint, status, showsToast) => {
            const url =
                endpoint === "reset"
                    ? `${siteOrigin}/_allauth/browser/v1/auth/password/request`
                    : `${apiBaseUrl}/${endpoint === "resend" ? "resend-verification/" : "other"}`;
            server.use(
                http.post(url, () =>
                    HttpResponse.json(
                        { detail: "Mail unavailable" },
                        { status },
                    ),
                ),
            );
            render(createElement(Toaster));
            await act(async () => {
                const request =
                    endpoint === "reset"
                        ? requestPasswordReset("viewer@example.com")
                        : endpoint === "resend"
                          ? resendVerificationEmail("x".repeat(64))
                          : apiClient.post("/other");
                await expect(request).rejects.toThrow();
            });
            if (showsToast)
                expect(await screen.findByText("Server error")).toBeVisible();
            else
                expect(
                    screen.queryByText("Server error"),
                ).not.toBeInTheDocument();
        },
    );
});
