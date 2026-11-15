import { expect, it } from "vitest";
import { libraryColumnCount } from "../libraryGrid";

it("fills phone and desktop widths with fluid columns", () => {
    expect(libraryColumnCount(374)).toBe(2);
    expect(libraryColumnCount(1216)).toBe(7);
});
it("never makes a column under 150px when there is room for one", () => {
    for (let width = 150; width <= 2560; width++) {
        const columns = libraryColumnCount(width);
        expect((width - (columns - 1) * 16) / columns).toBeGreaterThanOrEqual(
            150,
        );
        expect((columns + 1) * 150 + columns * 16).toBeGreaterThan(width);
    }
    expect(libraryColumnCount(0)).toBe(1);
    expect(libraryColumnCount(149)).toBe(1);
});
