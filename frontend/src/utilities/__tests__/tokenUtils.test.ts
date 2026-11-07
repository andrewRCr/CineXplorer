import { beforeEach, describe, expect, it } from "vitest";
import {
    areTokensExpired,
    clearAuthTokens,
    getAuthTokens,
    getCurrentStorageType,
    getTokenExpiration,
    getTokenFromCookie,
    setAuthTokens,
} from "../tokenUtils";
import { clearBrowserAuth, token } from "@tests/helpers/auth";

beforeEach(clearBrowserAuth);

describe("token cookies", () => {
    it("reads the named cookie and decodes its value", () => {
        document.cookie = "other=unrelated; path=/";
        document.cookie = "requested=a%2Bb; path=/";
        expect(getTokenFromCookie("requested")).toBe("a+b");
    });
    it("returns null for an absent cookie", () => {
        expect(getTokenFromCookie("absent")).toBeNull();
    });
});

describe("token expiration", () => {
    it("reads a JWT expiration", () => {
        expect(getTokenExpiration(token(1234567890))).toEqual(
            new Date(1234567890000),
        );
    });
    it.each(["malformed", "one.invalid.three"])(
        "rejects malformed token %s",
        (value) => {
            expect(getTokenExpiration(value)).toBeNull();
        },
    );
    it.each([
        ["current", 300, false],
        ["expired", -300, true],
    ] as const)("reports a %s token", (_name, offset, expired) => {
        setAuthTokens(token(Math.floor(Date.now() / 1000) + offset));
        expect(areTokensExpired()).toBe(expired);
    });
    it("reports missing tokens as expired", () => {
        expect(areTokensExpired()).toBe(true);
    });
});

describe("token storage", () => {
    it.each(["localStorage", "sessionStorage"] as const)(
        "stores and reads tokens in %s",
        (storage) => {
            const access = token();
            localStorage.setItem("refresh_token", "legacy-local");
            sessionStorage.setItem("refresh_token", "legacy-session");
            setAuthTokens(access, storage);
            expect(localStorage.getItem("refresh_token")).toBeNull();
            expect(sessionStorage.getItem("refresh_token")).toBeNull();
            expect(getCurrentStorageType()).toBe(storage);
            expect(getAuthTokens()).toEqual({
                access_token: access,
                storage,
            });
            expect(window[storage].getItem("isAuthenticated")).toBe("true");
        },
    );
    it.each(["localStorage", "sessionStorage"] as const)(
        "ignores an access cookie beside the token in %s",
        (storage) => {
            const access = token();
            setAuthTokens(access, storage);
            localStorage.setItem("refresh_token", "legacy-local");
            sessionStorage.setItem("refresh_token", "legacy-session");
            document.cookie = "access_token=cookie-token; path=/";
            expect(getCurrentStorageType()).toBe(storage);
            expect(getAuthTokens()).toEqual({ access_token: access, storage });
            expect(localStorage.getItem("refresh_token")).toBeNull();
            expect(sessionStorage.getItem("refresh_token")).toBeNull();
        },
    );
    it("does not treat an access cookie as a stored session", () => {
        document.cookie = "access_token=cookie-token; path=/";
        expect(getCurrentStorageType()).toBe("localStorage");
        expect(getAuthTokens().access_token).toBeNull();
        expect(areTokensExpired()).toBe(true);
    });
    it.each(["localStorage", "sessionStorage"] as const)(
        "removes legacy refresh copies while preserving the access session in %s",
        (storage) => {
            const expires = Math.floor(Date.now() / 1000) + 300;
            const access = token(expires);
            window[storage].setItem("access_token", access);
            window[storage].setItem("isAuthenticated", "true");
            window[storage].setItem("token_expiration", String(expires * 1000));
            localStorage.setItem("refresh_token", "legacy-local");
            sessionStorage.setItem("refresh_token", "legacy-session");

            expect(getAuthTokens()).toEqual({ access_token: access, storage });
            expect(localStorage.getItem("refresh_token")).toBeNull();
            expect(sessionStorage.getItem("refresh_token")).toBeNull();
            expect(window[storage].getItem("access_token")).toBe(access);
            expect(window[storage].getItem("isAuthenticated")).toBe("true");
            expect(window[storage].getItem("token_expiration")).toBe(
                String(expires * 1000),
            );
        },
    );
    it("removes legacy refresh copies when no access session exists", () => {
        localStorage.setItem("refresh_token", "legacy-local");
        sessionStorage.setItem("refresh_token", "legacy-session");
        localStorage.setItem("unrelated", "retained");
        expect(getAuthTokens()).toEqual({
            access_token: null,
            storage: "sessionStorage",
        });
        expect(localStorage.getItem("refresh_token")).toBeNull();
        expect(sessionStorage.getItem("refresh_token")).toBeNull();
        expect(localStorage.getItem("unrelated")).toBe("retained");
    });
    it("clears authentication from both browser storages", () => {
        setAuthTokens(token(), "localStorage");
        setAuthTokens(token(), "sessionStorage");
        localStorage.setItem("refresh_token", "legacy-local");
        sessionStorage.setItem("refresh_token", "legacy-session");
        clearAuthTokens();
        for (const storage of [localStorage, sessionStorage]) {
            for (const key of [
                "access_token",
                "refresh_token",
                "isAuthenticated",
                "token_expiration",
            ]) {
                expect(storage.getItem(key)).toBeNull();
            }
        }
    });
});
