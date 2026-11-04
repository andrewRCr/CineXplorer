import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useApiRequest } from "@/hooks/useApiRequest";

function response() {
    let resolve: (value: { data: string }) => void = () => {};
    let reject: (reason: Error) => void = () => {};
    const request = new Promise<{ data: string }>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { request, resolve, reject, cancel: () => {} };
}

describe("Request lifecycle", () => {
    it("retains data while loading a new request and clears the previous error", async () => {
        const first = response();
        const second = response();
        const firstFetcher = () => first;
        const secondFetcher = () => second;
        const { result, rerender } = renderHook(
            ({ fetcher }) => useApiRequest(fetcher),
            { initialProps: { fetcher: firstFetcher } },
        );
        await act(async () => {
            first.resolve({ data: "previous" });
        });
        expect(result.current.data).toBe("previous");
        act(() => {
            result.current.setError("old error");
        });
        rerender({ fetcher: secondFetcher });
        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBe("previous");
        expect(result.current.error).toBe("");
        await act(async () => {
            second.reject(new Error("new failure"));
        });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("new failure");
        expect(result.current.data).toBe("previous");
    });

    it("ignores an obsolete completion even after returning to the original fetcher", async () => {
        const obsolete = response();
        const intermediate = response();
        const current = response();
        let firstVisit = true;
        const firstFetcher = () => {
            const request = firstVisit ? obsolete : current;
            firstVisit = false;
            return request;
        };
        const secondFetcher = () => intermediate;
        const { result, rerender } = renderHook(
            ({ fetcher }) => useApiRequest(fetcher),
            { initialProps: { fetcher: firstFetcher } },
        );
        rerender({ fetcher: secondFetcher });
        rerender({ fetcher: firstFetcher });
        await act(async () => {
            obsolete.resolve({ data: "obsolete" });
        });
        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
        await act(async () => {
            current.resolve({ data: "current" });
        });
        expect(result.current.data).toBe("current");
        expect(result.current.isLoading).toBe(false);
    });
    it("preserves an explicitly set error when a pending request succeeds", async () => {
        const pending = response();
        const fetcher = () => pending;
        const { result } = renderHook(() => useApiRequest(fetcher));
        act(() => {
            result.current.setData("local");
            result.current.setError((previous) => previous + "manual");
        });
        expect(result.current.data).toBe("local");
        await act(async () => {
            pending.resolve({ data: "server" });
        });
        expect(result.current.data).toBe("server");
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe("manual");
    });
});
