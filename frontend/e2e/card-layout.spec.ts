import { test, expect } from "./fixtures";
import { moviePage } from "./catalogue";
import { scanPage } from "./axe";
import { target } from "./target";

test("unknown-year cards preserve metadata and rating alignment at supported widths", async ({
    page,
}, info) => {
    test.skip(
        target.name !== "local",
        "Controlled card geometry uses local catalogue fixtures",
    );
    const catalogue = moviePage(1, 2, null);
    if (!catalogue.results)
        throw new Error("Card catalogue must contain its fixtures");
    catalogue.results = catalogue.results.map((film, index) => ({
        ...film,
        title: index === 0 ? "Film without a year" : "Film with a year",
        release_date: index === 0 ? null : "1981-01-01",
        vote_average: 8.2,
        user_movie_data: {
            tmdb_id: film.tmdb_id,
            user_watched: true,
            user_on_watchlist: false,
            user_liked: false,
            user_rating: 7,
            has_entries: true,
            last_logged_on: null,
        },
    }));
    await page.route("**/api/movies/browse**", (route) =>
        route.fulfill({ json: catalogue }),
    );
    await page.goto("/browse");
    const unknown = page.getByRole("article", {
        name: "Film without a year",
        exact: true,
    });
    const known = page.getByRole("article", {
        name: "Film with a year",
        exact: true,
    });
    await expect(unknown).toBeVisible();
    await expect(known).toBeVisible();
    for (const width of [194, 138]) {
        // Exercise the component's width contract; the browse columns remain fixed at 194px.
        for (const card of [unknown, known])
            await card.evaluate((element, width) => {
                element.style.transition = "none";
                element.style.width = `${width}px`;
            }, width);

        const measurements = [];
        for (const [card, year] of [
            [unknown, "Year unknown"],
            [known, "1981"],
        ] as const) {
            const yearLabel = card.getByText(year, { exact: true });
            const stars = card.getByRole("img", {
                name: "Rated 3.5 out of 5 stars",
                exact: true,
            });
            await expect(yearLabel).toHaveText(year);
            await expect(
                card.getByRole("img", { name: "Watched", exact: true }),
            ).toBeVisible();
            const cardBox = await card.boundingBox();
            const yearBox = await yearLabel.boundingBox();
            const starsBox = await stars.boundingBox();
            if (!cardBox || !yearBox || !starsBox)
                throw new Error("Card, year and rating must have layout boxes");
            expect(cardBox.width).toBe(width);
            expect(cardBox.height).toBe(width * 1.5 + 128);
            expect(starsBox.y + starsBox.height).toBeLessThanOrEqual(
                cardBox.y + cardBox.height,
            );
            measurements.push({
                yearHeight: yearBox.height,
                ratingOffset: starsBox.y - cardBox.y,
            });
        }
        const [unknownLayout, knownLayout] = measurements;
        if (!unknownLayout || !knownLayout)
            throw new Error("Both card layouts must be measured");
        expect(unknownLayout.yearHeight).toBe(knownLayout.yearHeight);
        expect(unknownLayout.ratingOffset).toBeCloseTo(
            knownLayout.ratingOffset,
            1,
        );
    }
    await scanPage(page, info);
});
