import { scanPage } from "./axe";
import { movieDetail, moviePage } from "./catalogue";
import type { components } from "@/types/api";
import { test, expect } from "./fixtures";
import { submitLogin } from "./login";
import { target } from "./target";

const FIRST_FILM = 2000000001;
const SECOND_FILM = 2000000002;
const firstTitle = "Library fixture one";
const secondTitle = "Library fixture two";

test("save from Explore and log from Watchlist across the Library", async ({
    page,
}, info) => {
    test.skip(
        target.name === "staging",
        "This journey changes the local development account's films",
    );
    await page.route("**/api/movies/browse?*", async (route) => {
        const response = moviePage(FIRST_FILM, 2, null);
        response.results = response.results?.map((movie) => ({
            ...movie,
            title: movie.tmdb_id === FIRST_FILM ? firstTitle : secondTitle,
            release_date: "2020-01-01",
        }));
        await route.fulfill({ json: response });
    });
    await page.route(`**/api/movies/${FIRST_FILM}`, async (route) => {
        const authorization = route.request().headers().authorization;
        const response = await page.request.get(
            `/api/user-movie-data/${FIRST_FILM}`,
            {
                headers: authorization ? { authorization } : {},
            },
        );
        expect(response.status()).toBe(200);
        const record: components["schemas"]["UserMovieDataSchema"] =
            await response.json();
        await route.fulfill({
            json: {
                ...movieDetail(FIRST_FILM),
                title: firstTitle,
                release_date: "2020-01-01",
                user_movie_data: record,
            },
        });
    });
    await page.goto("/login?next=%2Fbrowse");
    await page
        .getByLabel("Username or Email Address", { exact: true })
        .fill(target.username);
    await scanPage(page, info);
    await page.getByLabel("Password", { exact: true }).fill(target.password);
    await submitLogin(page, info, () =>
        page.getByRole("button", { name: "Login", exact: true }).click(),
    );
    const banner = page.getByRole("banner");
    await expect(
        banner.getByRole("button", { name: target.username, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new URL("/browse", target.baseURL).href);
    const access = await page.evaluate(
        () =>
            localStorage.getItem("access_token") ??
            sessionStorage.getItem("access_token"),
    );
    expect(access).toBeTruthy();
    const csrf = (await page.context().cookies()).find(
        (cookie) => cookie.name === "csrftoken",
    );
    const headers = {
        Authorization: `Bearer ${access}`,
        "X-CSRFToken": csrf?.value ?? "",
        Origin: new URL(target.baseURL).origin,
        Referer: new URL("/browse", target.baseURL).href,
    };
    for (const id of [FIRST_FILM, SECOND_FILM]) {
        const response = await page.request.delete(
            `/api/user-movie-data/${id}`,
            { headers },
        );
        expect([200, 204, 404]).toContain(response.status());
    }
    const timeZone = await page.evaluate(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    const watched = await page.request.patch(
        `/api/user-movie-data/${SECOND_FILM}`,
        {
            headers,
            data: {
                user_watched: true,
                user_on_watchlist: true,
                time_zone: timeZone,
            },
        },
    );
    expect([200, 201]).toContain(watched.status());
    await expect(
        page.getByRole("link", { name: firstTitle, exact: true }).first(),
    ).toBeVisible();
    const firstCard = page.getByRole("article", {
        name: firstTitle,
        exact: true,
    });
    await firstCard.getByRole("img", { name: firstTitle, exact: true }).hover();
    await firstCard
        .getByRole("button", { name: "Watchlist", exact: true })
        .click();
    await expect(
        firstCard.getByRole("button", { name: "Watchlist", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await scanPage(page, info);
    await banner.getByRole("link", { name: "Watchlist", exact: true }).click();
    await expect(page).toHaveURL(new URL("/watchlist", target.baseURL).href);
    await expect(
        page.getByRole("heading", { level: 1, name: "Watchlist", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: firstTitle, exact: true }).first(),
    ).toBeVisible();
    await scanPage(page, info);
    await banner.getByRole("link", { name: "Library", exact: true }).click();
    await expect(page).toHaveURL(new URL("/library", target.baseURL).href);
    await expect(
        page.getByRole("heading", { level: 1, name: "Library", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: secondTitle, exact: true }).first(),
    ).toBeVisible();
    // The footer must contribute to the measured row height, even when empty.
    const filmRows = page
        .getByRole("grid", { name: "Films", exact: true })
        .getByRole("row");
    await expect(filmRows.first()).toBeVisible();
    for (const row of await filmRows.all()) {
        const rowBox = await row.boundingBox();
        if (!rowBox) throw new Error("Missing film row bounds");
        const cells = row.getByRole("gridcell");
        await expect(cells.first()).toBeVisible();
        for (const cell of await cells.all()) {
            const cellBox = await cell.boundingBox();
            if (!cellBox) throw new Error("Missing film cell bounds");
            expect(cellBox.y + cellBox.height).toBeLessThanOrEqual(
                rowBox.y + rowBox.height + 1,
            );
            // Include descendants that overflow an otherwise correctly sized cell.
            const content = await cell.evaluate((element) => ({
                height: element.clientHeight,
                scrollHeight: element.scrollHeight,
            }));
            expect(content.scrollHeight).toBeLessThanOrEqual(
                content.height + 1,
            );
        }
    }
    await scanPage(page, info);
    const historyResponse = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname ===
                "/api/user-movie-data/history" &&
            response.request().method() === "GET",
        { timeout: 5000 },
    );
    await page
        .getByRole("navigation", { name: "Library", exact: true })
        .getByRole("link", { name: "History", exact: true })
        .click();
    expect((await historyResponse).status()).toBe(200);
    await expect(page).toHaveURL(
        new URL("/library/history", target.baseURL).href,
    );
    await expect(
        page.getByRole("region", { name: "History", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("status", { name: "Loading history" }),
    ).toBeHidden();
    const history = page.getByRole("region", { name: "History", exact: true });
    const watchedGroup = history
        .getByRole("group", { name: /^Marked \d+ films watched:/ })
        .first();
    if (await watchedGroup.count()) {
        await watchedGroup.getByRole("button", { name: /^Show all / }).click();
        await expect(
            watchedGroup.getByRole("article", {
                name: `Marked watched: ${secondTitle}`,
                exact: true,
            }),
        ).toBeVisible();
    } else {
        await expect(
            history.getByRole("article", {
                name: `Marked watched: ${secondTitle}`,
                exact: true,
            }),
        ).toBeVisible();
    }
    await scanPage(page, info);
    await banner.getByRole("link", { name: "Watchlist", exact: true }).click();
    await expect(page).toHaveURL(new URL("/watchlist", target.baseURL).href);
    const firstFilm = page
        .getByRole("grid", { name: "Films", exact: true })
        .getByRole("gridcell")
        .filter({
            has: page.getByRole("link", { name: firstTitle, exact: true }),
        });
    await expect(firstFilm).toHaveCount(1);
    await firstFilm.getByRole("img", { name: firstTitle, exact: true }).hover();
    await firstFilm
        .getByRole("button", { name: "Review or log", exact: true })
        .click();
    const dialog = page.getByRole("dialog", {
        name: "Review or log",
        exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(
        dialog.getByRole("switch", { name: "Watched on", exact: true }),
    ).toBeChecked();
    const today = await page.evaluate(() => {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    });
    await expect(
        dialog.getByLabel("Date watched", { exact: true }),
    ).toHaveValue(today);
    const rating = dialog.getByRole("radiogroup", {
        name: "Rating",
        exact: true,
    });
    const star = rating.getByRole("radio", { name: "4 stars", exact: true });
    const starBox = await star.boundingBox();
    if (!starBox) throw new Error("Missing rating bounds");
    await star.click({
        position: { x: starBox.width * 0.75, y: starBox.height / 2 },
    });
    await expect(
        rating.getByRole("radio", { checked: true }),
    ).toHaveAccessibleName("4 stars");
    const review = "Library browser viewing";
    await dialog
        .getByRole("textbox", { name: "Review", exact: true })
        .fill(review);
    await scanPage(page, info);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
        page.getByRole("link", { name: firstTitle, exact: true }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("link", { name: secondTitle, exact: true }).first(),
    ).toBeVisible();
    await banner.getByRole("link", { name: "Library", exact: true }).click();
    await page
        .getByRole("link", { name: firstTitle, exact: true })
        .first()
        .click();
    const filmLog = page.getByRole("region", { name: "Your log", exact: true });
    await expect(filmLog.getByText(review, { exact: true })).toBeVisible();
    await scanPage(page, info);
    await page
        .getByRole("link", { name: "Back to Library", exact: true })
        .click();
    await expect(
        page.getByRole("link", { name: firstTitle, exact: true }).first(),
    ).toBeVisible();
    await page
        .getByRole("navigation", { name: "Library", exact: true })
        .getByRole("link", { name: "History", exact: true })
        .click();
    await expect(
        history.getByRole("link", { name: firstTitle, exact: true }).first(),
    ).toBeVisible();
    await expect(history.getByText(review, { exact: true })).toBeVisible();
});
