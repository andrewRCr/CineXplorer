import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
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
        const reads = vi.spyOn(Storage.prototype, "getItem");
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
            // Two request interceptors and two 401 interceptors read the real token.
            // The fourth read completes synchronously before the second request queues.
            await waitFor(() => {
                expect(
                    reads.mock.calls.filter(([key]) => key === "access_token"),
                ).toHaveLength(4);
            });
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
