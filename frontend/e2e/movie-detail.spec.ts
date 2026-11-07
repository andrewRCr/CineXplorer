import { scanPage } from "./axe";
import { test, expect } from "./fixtures";
import type { MoviePage } from "./catalogue";

test("movie detail returns to the same browse filters", async ({
    page,
}, info) => {
    const response = page.waitForResponse(
        (response) => new URL(response.url()).pathname === "/api/movies/browse",
    );
    await page.goto("/browse?minYear=1980&maxYear=1983");
    const movies: MoviePage = await (await response).json();
    const movie = movies.results?.[0];
    if (!movie) throw new Error("Filtered browse returned no movies");
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
    await scanPage(page, info);
    await page
        .getByRole("link", { name: movie.title, exact: true })
        .first()
        .click();
    await expect(
        page.getByRole("heading", { name: movie.title, exact: true }),
    ).toBeVisible();
    await scanPage(page, info);
    await page
        .getByRole("link", { name: "Back to Results", exact: true })
        .click();
    await expect(page).toHaveURL(
        (url) =>
            url.pathname === "/browse" &&
            url.searchParams.get("minYear") === "1980" &&
            url.searchParams.get("maxYear") === "1983",
    );
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
});
