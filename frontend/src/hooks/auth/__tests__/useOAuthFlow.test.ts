import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { useOAuthFlow } from "../useOAuthFlow";
import { apiBaseUrl } from "@/config/baseUrls";
import { server } from "@tests/mocks/server";
import { clearBrowserAuth } from "@tests/helpers/auth";

beforeEach(clearBrowserAuth);
afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});
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
