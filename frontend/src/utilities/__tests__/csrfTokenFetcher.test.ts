import { beforeEach, expect, it } from "vitest";
import { getCsrfToken } from "../csrfTokenFetcher";
import { clearBrowserAuth } from "@tests/helpers/auth";

beforeEach(clearBrowserAuth);
it("reads Django's csrftoken cookie", () => {
    document.cookie = "csrftoken=django-csrf; path=/";
    expect(getCsrfToken()).toBe("django-csrf");
});
