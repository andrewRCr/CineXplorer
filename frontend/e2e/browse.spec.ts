import { test, expect } from "./fixtures";
import type { MoviePage } from "./catalogue";

test("browse loads another page as the user scrolls", async ({ page }) => {
    const firstResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
            url.pathname === "/api/movies/browse" &&
            !url.searchParams.has("tmdb_page_start")
        );
    });
    const nextResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
            url.pathname === "/api/movies/browse" &&
            url.searchParams.has("tmdb_page_start")
        );
    });
    let nextReceived = false;
    void nextResponse
        .then(() => {
            nextReceived = true;
        })
        .catch(() => undefined);
    await page.goto("/browse");
    const first: MoviePage = await (await firstResponse).json();
    const initial = first.results ?? [];
    const movie = initial[0];
    if (!movie) throw new Error("Browse returned no movies");
    await expect(page.getByText(/^\d[\d,]*\+? results$/)).toBeVisible();
    await expect(
        page.getByRole("link", { name: movie.title, exact: true }).first(),
    ).toBeVisible();
    await expect
        .poll(
            async () => {
                await page.mouse.wheel(0, 600);
                return nextReceived;
            },
            { timeout: 15000 },
        )
        .toBe(true);
    const next: MoviePage = await (await nextResponse).json();
    const previousTitles = new Set(initial.map((item) => item.title));
    const added = next.results?.find((item) => !previousTitles.has(item.title));
    if (!added)
        throw new Error("The next browse page added no new movie title");
    const card = page
        .getByRole("link", { name: added.title, exact: true })
        .first();
    await expect
        .poll(
            async () => {
                const box = await card.boundingBox();
                const height = await page.evaluate(() => window.innerHeight);
                if (box && box.y >= 0 && box.y < height) return true;
                await page.mouse.wheel(0, 400);
                return false;
            },
            { timeout: 15000 },
        )
        .toBe(true);
    await expect(card).toBeInViewport();
});
