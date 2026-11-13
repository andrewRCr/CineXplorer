import { it, expect } from "vitest";
import { catalogWindow } from "../catalogWindow";

it.each([
    ["/browse", "browse"],
    ["/browse/", "browse"],
    ["/BROWSE", "browse"],
    ["/browse/now-playing", "now-playing"],
    ["/Browse/Now-Playing/", "now-playing"],
    ["/browse/upcoming", "upcoming"],
    ["/BROWSE/UPCOMING/", "upcoming"],
    ["/br%6Fwse", "browse"],
    ["/br%6Fwse/now-playing", "now-playing"],
    ["/browse/%75pcoming", "upcoming"],
    ["/br%6Fwse/upcoming", "upcoming"],
    ["/browse/sequential", null],
    ["/search", null],
    ["/", null],
    ["/movie/550", null],
    ["/elsewhere/browse", null],
])("names the catalog window at %s as %s", (path, expected) => {
    expect(catalogWindow(path)).toBe(expected);
});
