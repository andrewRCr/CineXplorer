import { expect, it } from "vitest";
import { posterRowLayout } from "@/components/movie/sections/posterRowLayout";

it.each([
    [138, 1, 138],
    [280, 1, 280],
    [300, 2, 142],
    [344, 2, 164],
    [960, 5, 179.2],
    [1216, 6, 189.333333],
    [1376, 7, 182.857143],
])("fills a %spx row with %s complete cards", (width, count, cardWidth) => {
    const layout = posterRowLayout(width);
    expect(layout.count).toBe(count);
    expect(layout.cardWidth).toBeCloseTo(cardWidth);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(138);
    expect(layout.count * layout.stride - 16).toBeCloseTo(width);
});
