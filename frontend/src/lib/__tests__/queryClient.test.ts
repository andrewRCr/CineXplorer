import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanceledError } from "axios";
import { http, HttpResponse } from "msw/http";
import { queryClient } from "@/lib/queryClient";
import apiClient from "@/services/apiClient";
import { apiBaseUrl } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";
import { toaster } from "@/components/core/chakra/toaster";

beforeEach(() => {
    clearBrowserAuth();
    vi.useFakeTimers();
});
afterEach(() => {
    queryClient.clear();
    toaster.remove();
    vi.useRealTimers();
});

describe("query retries", () => {
    it.each([
        ["network", 3],
        ["500", 3],
        ["404", 1],
        ["401", 1],
        ["cancelled", 1],
        ["other", 1],
    ] as const)("sends a %s read %i times", async (failure, expected) => {
        let requests = 0;
        server.use(
            http.get(`${apiBaseUrl}/retry-test`, () => {
                requests++;
                return failure === "network"
                    ? HttpResponse.error()
                    : HttpResponse.json(
                          {},
                          {
                              status:
                                  failure === "cancelled" || failure === "other"
                                      ? 200
                                      : Number(failure),
                          },
                      );
            }),
        );
        let settled = false;
        const result = queryClient
            .fetchQuery({
                queryKey: ["retry-test"],
                queryFn: async () => {
                    const response = await apiClient.get("/retry-test");
                    if (failure === "cancelled")
                        throw new CanceledError("Cancelled read");
                    if (failure === "other") throw new Error("Invalid result");
                    return response.data;
                },
            })
            .catch((error: unknown) => {
                settled = true;
                return error;
            });
        await vi.waitFor(() => expect(settled).toBe(true), {
            timeout: 6000,
            interval: 100,
        });
        expect(await result).toBeInstanceOf(Error);
        expect(requests).toBe(expected);
    });

    it("sends a failed save once", async () => {
        document.cookie = "csrftoken=test; path=/";
        let requests = 0;
        server.use(
            http.patch(`${apiBaseUrl}/retry-test`, () => {
                requests++;
                return HttpResponse.json({}, { status: 500 });
            }),
        );
        const mutation = queryClient.getMutationCache().build(queryClient, {
            mutationFn: () => apiClient.patch("/retry-test", {}),
        });
        let settled = false;
        const result = mutation.execute(undefined).catch((error: unknown) => {
            settled = true;
            return error;
        });
        await vi.waitFor(() => expect(settled).toBe(true), {
            timeout: 6000,
            interval: 100,
        });
        expect(await result).toBeInstanceOf(Error);
        expect(requests).toBe(1);
    });
});
