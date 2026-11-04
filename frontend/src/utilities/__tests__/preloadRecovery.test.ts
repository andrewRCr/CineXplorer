import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPreloadRecovery } from "@/utilities/preloadRecovery";

const buildA = "https://example.com/assets/index-build-a.js";
const currentUrl = "https://example.com/movie/42?from=watchlist#details";

function preloadError(): Event {
    return new Event("vite:preloadError", { cancelable: true });
}

describe("preload error recovery", () => {
    let unregister: (() => void) | undefined;
    let navigations: string[];
    let markersBeforeNavigation: number[];
    let previousUrl: string;

    beforeEach(() => {
        window.sessionStorage.clear();
        unregister = undefined;
        navigations = [];
        markersBeforeNavigation = [];
        previousUrl = window.location.href;
        window.location.href = currentUrl;
        // Navigation is a browser boundary; jsdom cannot reload a document.
        vi.mocked(window.location.reload).mockImplementation(() => {
            markersBeforeNavigation.push(window.sessionStorage.length);
            navigations.push(window.location.href);
        });
    });

    afterEach(() => {
        unregister?.();
        vi.restoreAllMocks();
        window.location.href = previousUrl;
        window.sessionStorage.clear();
    });

    it("marks the build before reloading the current URL on its first preload failure", () => {
        unregister = registerPreloadRecovery(buildA);
        const event = preloadError();

        window.dispatchEvent(event);

        expect(navigations).toEqual([currentUrl]);
        expect(markersBeforeNavigation).toEqual([1]);
        expect(event.defaultPrevented).toBe(true);
    });

    it("leaves repeated failures uncanceled without another navigation", () => {
        unregister = registerPreloadRecovery(buildA);
        window.dispatchEvent(preloadError());
        const repeated = preloadError();

        window.dispatchEvent(repeated);

        expect(navigations).toEqual([currentUrl]);
        expect(repeated.defaultPrevented).toBe(false);
    });

    it("retains the guard across document reloads and keeps attempts separate per build", () => {
        unregister = registerPreloadRecovery(buildA);
        const first = preloadError();
        window.dispatchEvent(first);
        unregister();

        unregister = registerPreloadRecovery(buildA);
        const sameBuildAfterReload = preloadError();
        window.dispatchEvent(sameBuildAfterReload);
        unregister();

        unregister = registerPreloadRecovery(
            "https://example.com/assets/index-build-b.js",
        );
        const nextBuild = preloadError();
        window.dispatchEvent(nextBuild);
        unregister();

        unregister = registerPreloadRecovery(buildA);
        const returningBuild = preloadError();
        window.dispatchEvent(returningBuild);

        expect(navigations).toEqual([currentUrl, currentUrl]);
        expect(markersBeforeNavigation).toEqual([1, 2]);
        expect([
            first.defaultPrevented,
            sameBuildAfterReload.defaultPrevented,
            nextBuild.defaultPrevented,
            returningBuild.defaultPrevented,
        ]).toEqual([true, false, true, false]);
    });

    it.each(["access", "getItem", "setItem"] as const)(
        "leaves the original error available when session storage fails during %s",
        (operation) => {
            const denied = () => {
                throw new DOMException("Storage unavailable", "SecurityError");
            };
            if (operation === "access") {
                vi.spyOn(window, "sessionStorage", "get").mockImplementation(
                    denied,
                );
            } else {
                vi.spyOn(Storage.prototype, operation).mockImplementation(
                    denied,
                );
            }
            const uncaughtMessages: string[] = [];
            const captureError = (event: ErrorEvent) => {
                uncaughtMessages.push(event.message);
                event.preventDefault();
            };
            window.addEventListener("error", captureError);
            try {
                unregister = registerPreloadRecovery(buildA);
                const event = preloadError();

                window.dispatchEvent(event);

                expect(navigations).toEqual([]);
                expect(event.defaultPrevented).toBe(false);
                expect(uncaughtMessages).toEqual([]);
            } finally {
                window.removeEventListener("error", captureError);
            }
        },
    );
});
