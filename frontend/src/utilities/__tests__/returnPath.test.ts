import { describe, expect, it } from "vitest";
import {
    loginPathFor,
    returnPathFrom,
    safeReturnPath,
    signInPathFor,
} from "../returnPath";

describe("safeReturnPath", () => {
    it.each(["/watchlist", "/watchlist?sort=added#top", "/movie/550", "/"])(
        "accepts the in-app path %s",
        (path) => {
            expect(safeReturnPath(path)).toBe(path);
        },
    );

    it.each([
        null,
        undefined,
        "",
        "watchlist",
        "https://evil.example/watchlist",
        "//evil.example",
        "/\\evil.example",
        "/\t/evil.example",
        "/.//evil.example",
        "/%2e//evil.example",
        "/a/..//evil.example",
        "javascript:alert(1)",
        "/login",
        "/LOGIN",
        "/login/",
        "/login?next=%2Fwatchlist",
        "/register",
        "/forgot-password",
    ])("refuses %j", (value) => {
        expect(safeReturnPath(value)).toBeNull();
    });
});

describe("returnPathFrom", () => {
    it("reads a safe next parameter", () => {
        expect(returnPathFrom("?next=%2Fwatchlist%3Fsort%3Dadded")).toBe(
            "/watchlist?sort=added",
        );
    });

    it.each(["", "?other=1", "?next=%2F%2Fevil.example", "?next=%2Flogin"])(
        "falls back to home for %j",
        (search) => {
            expect(returnPathFrom(search)).toBe("/");
        },
    );
});

describe("loginPathFor", () => {
    it("carries the page to return to", () => {
        expect(loginPathFor("/watchlist?sort=added")).toBe(
            "/login?next=%2Fwatchlist%3Fsort%3Dadded",
        );
    });

    it.each([null, "//evil.example", "/login"])(
        "leaves out a missing or unsafe page (%j)",
        (path) => {
            expect(loginPathFor(path)).toBe("/login");
        },
    );
});

describe("signInPathFor", () => {
    it.each([
        ["/browse", "?genres=27", "/login?next=%2Fbrowse%3Fgenres%3D27"],
        ["/login", "?next=%2Fwatchlist", "/login?next=%2Fwatchlist"],
        ["/LOGIN/", "?next=%2Fwatchlist", "/login?next=%2Fwatchlist"],
        ["/login", "", "/login"],
        ["/login", "?next=%2F%2Fevil.example", "/login"],
        ["/register", "", "/login"],
        ["/register", "?next=%2Fwatchlist", "/login"],
        ["/REGISTER/", "?x=1", "/login"],
        ["/forgot-password", "", "/login"],
        ["/forgot-password", "?next=%2Fwatchlist", "/login"],
        ["/FORGOT-PASSWORD/", "?x=1", "/login"],
    ])("links from %s%s to %s", (path, search, expected) => {
        expect(signInPathFor(path, search)).toBe(expected);
    });
});
