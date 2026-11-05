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
            setAuthTokens(access, "refresh", storage);
            expect(getCurrentStorageType()).toBe(storage);
            expect(getAuthTokens()).toEqual({
                access_token: access,
                refresh_token: "refresh",
                storage,
            });
            expect(window[storage].getItem("isAuthenticated")).toBe("true");
        },
    );
    it("reads access cookies before browser storage", () => {
        setAuthTokens(token(), "refresh", "localStorage");
        document.cookie = "access_token=cookie-token; path=/";
        expect(getCurrentStorageType()).toBe("cookie");
        expect(getAuthTokens()).toEqual({
            access_token: "cookie-token",
            refresh_token: null,
            storage: "cookie",
        });
    });
    it("clears authentication from both browser storages", () => {
        setAuthTokens(token(), "refresh", "localStorage");
        setAuthTokens(token(), "refresh", "sessionStorage");
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
