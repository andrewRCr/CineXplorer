import {
    afterEach,
    assert,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { renderHook } from "@testing-library/react";
import { siteOrigin } from "@/config/baseUrls";
import logger from "@/services/logger";
import { useOAuthFlow } from "../useOAuthFlow";

const originalConfig = logger.getEnvironmentInfo().config;
let submittedForms: HTMLFormElement[] = [];

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    submittedForms = [];
    logger.updateConfig({
        enableConsole: false,
        enableBackendReporting: false,
    });
});

afterEach(() => {
    submittedForms.forEach((form) => form.remove());
    localStorage.clear();
    sessionStorage.clear();
    logger.clearLogs();
    logger.updateConfig(originalConfig);
});

describe("OAuth initialization contract", () => {
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
