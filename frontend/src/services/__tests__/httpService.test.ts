import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw/http";
import { isCancel } from "axios";
import { apiBaseUrl } from "@/config/baseUrls";
import createHttpService from "../httpService";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { gate } from "@tests/helpers/web-locks";

beforeEach(() => {
    clearBrowserAuth();
    document.cookie = "csrftoken=service-csrf; path=/";
});
const service = createHttpService("/service-test-items");

describe("HTTP service responses", () => {
    it("returns the detail response as data", async () => {
        server.use(
            http.get(`${apiBaseUrl}/service-test-items/550`, () =>
                HttpResponse.json({ tmdb_id: 550, rating: 8 }),
            ),
        );
        expect(await service.get(550).request).toEqual({
            data: { tmdb_id: 550, rating: 8 },
        });
    });

    it("returns a page selected by the caller's query parameters", async () => {
        const page = {
            page: 2,
            total_pages: 3,
            total_results: 5,
            results: [{ tmdb_id: 550 }],
        };
        server.use(
            http.get(`${apiBaseUrl}/service-test-items`, ({ request }) => {
                const query = new URL(request.url).searchParams;
                return query.get("page") === "2" &&
                    query.get("collection") === "watchlist"
                    ? HttpResponse.json(page)
                    : HttpResponse.json(
                          { detail: "Wrong page" },
                          { status: 400 },
                      );
            }),
        );
        expect(
            await service.getPaginated({ page: 2, collection: "watchlist" })
                .request,
        ).toEqual({ data: page });
    });

    it.each(["detail", "page"] as const)(
        "cancels a pending $0 request",
        async (kind) => {
            const started = gate();
            const release = gate();
            server.use(
                http.get(
                    `${apiBaseUrl}/service-test-items${kind === "detail" ? "/550" : ""}`,
                    async () => {
                        started.release();
                        await release.wait;
                        return HttpResponse.json({ results: [] });
                    },
                ),
            );
            const { request, cancel } =
                kind === "detail" ? service.get(550) : service.getPaginated();
            const outcome = request.then(
                (value) => value,
                (error: unknown) => error,
            );
            try {
                await started.wait;
                cancel();
                release.release();
                expect(isCancel(await outcome)).toBe(true);
            } finally {
                release.release();
            }
        },
    );

    it.each(["create", "update"] as const)(
        "preserves body, status and headers on %s",
        async (operation) => {
            const endpoint =
                operation === "create"
                    ? `${apiBaseUrl}/service-test-items`
                    : `${apiBaseUrl}/service-test-items/550`;
            const status = operation === "create" ? 201 : 200;
            const resolver = async ({ request }: { request: Request }) => {
                const body: unknown = await request.json();
                return HttpResponse.json(
                    {
                        tmdb_id: 550,
                        ...(body && typeof body === "object" ? body : {}),
                    },
                    {
                        status,
                        headers: { "X-Correlation-ID": "service-response" },
                    },
                );
            };
            server.use(
                operation === "create"
                    ? http.post(endpoint, resolver)
                    : http.patch(endpoint, resolver),
            );
            const response =
                operation === "create"
                    ? await service.create({ rating: 8 })
                    : await service.update(550, { rating: 8 });
            expect(response.data).toEqual({ tmdb_id: 550, rating: 8 });
            expect(response.status).toBe(status);
            expect(response.headers["x-correlation-id"]).toBe(
                "service-response",
            );
        },
    );

    it("accepts a successful empty removal response", async () => {
        server.use(
            http.delete(
                `${apiBaseUrl}/service-test-items/550`,
                () => new HttpResponse(null, { status: 204 }),
            ),
        );
        const response = await service.remove(550);
        expect(response.status).toBe(204);
        expect(response.data).toBe("");
    });
});
