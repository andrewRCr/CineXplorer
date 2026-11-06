import { act, renderHook } from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    assert,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { HttpResponse, http } from "msw";
import { useOAuthFlow } from "../useOAuthFlow";
import { apiBaseUrl, siteOrigin } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";

import logger from "@/services/logger";

const originalConfig = logger.getEnvironmentInfo().config;
let submittedForms: HTMLFormElement[] = [];

beforeEach(() => {
    clearBrowserAuth();
    submittedForms = [];
    logger.updateConfig({
        enableConsole: false,
        enableBackendReporting: false,
    });
});
afterEach(() => {
    vi.useRealTimers();
    submittedForms.forEach((form) => form.remove());
    clearBrowserAuth();
    logger.clearLogs();
    logger.updateConfig(originalConfig);
});

describe("OAuth form CSRF", () => {
    it.each([true, false])(
        "submits the OAuth form with CSRF (cookie present: %s)",
        async (present) => {
            if (present) document.cookie = "csrftoken=django-csrf; path=/";
            let csrfRequests = 0;
            let submitted: FormData | undefined;
            server.use(
                http.get(`${apiBaseUrl}/csrf/`, () => {
                    csrfRequests++;
                    document.cookie = "csrftoken=django-csrf; path=/";
                    return HttpResponse.json({});
                }),
            );
            vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(
                function (this: HTMLFormElement) {
                    submitted = new FormData(this);
                    submittedForms.push(this);
                },
            );
            const { result } = renderHook(() => useOAuthFlow());
            await act(async () => {
                await result.current.initializeOAuth("google");
            });
            expect(submitted?.get("csrfmiddlewaretoken")).toBe("django-csrf");
            expect(submitted?.get("provider")).toBe("google");
            expect(csrfRequests).toBe(present ? 0 : 1);
        },
    );
});

describe("OAuth initialization contract", () => {
    beforeEach(() => {
        document.cookie = "csrftoken=django-csrf; path=/";
    });

    it("submits the provider form before returning its completion promise", async () => {
        vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(
            function (this: HTMLFormElement) {
                submittedForms.push(this);
            },
        );
        const { result } = renderHook(() => useOAuthFlow());

        const completion = result.current.initializeOAuth("google");

        expect(submittedForms).toHaveLength(1);
        const [form] = submittedForms;
        assert.isDefined(form);
        expect(form.method).toBe("post");
        expect(form.action).toBe(
            `${siteOrigin}/_allauth/browser/v1/auth/provider/redirect`,
        );
        expect(new FormData(form).get("provider")).toBe("google");
        await expect(completion).resolves.toBeUndefined();
    });

    it("rejects the promise when the initialization error callback throws", async () => {
        vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(
            function (this: HTMLFormElement) {
                submittedForms.push(this);
                throw new Error("Form submission failed");
            },
        );
        const callbackError = new Error("Callback failed");
        const { result } = renderHook(() =>
            useOAuthFlow(() => {
                throw callbackError;
            }),
        );

        const completion = result.current.initializeOAuth("github");

        await expect(completion).rejects.toBe(callbackError);
    });
});

describe("OAuth navigation timing", () => {
    it("holds a fast return for the minimum display time", () => {
        vi.useFakeTimers();
        sessionStorage.setItem("oauth_in_progress", "google");
        sessionStorage.setItem("oauth_start_time", String(Date.now() - 100));
        const { result } = renderHook(() => useOAuthFlow());
        expect(result.current.canNavigate).toBe(false);
        act(() => {
            vi.advanceTimersByTime(499);
        });
        expect(result.current.canNavigate).toBe(false);
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.canNavigate).toBe(true);
    });

    it("allows navigation immediately after a slow return", () => {
        sessionStorage.setItem("oauth_in_progress", "github");
        sessionStorage.setItem("oauth_start_time", String(Date.now() - 3000));
        const { result } = renderHook(() => useOAuthFlow());
        expect(result.current.canNavigate).toBe(true);
    });

    it("allows navigation immediately when a return has no start time", () => {
        sessionStorage.setItem("oauth_in_progress", "google");
        const { result } = renderHook(() => useOAuthFlow());
        expect(result.current.canNavigate).toBe(true);
    });
});
