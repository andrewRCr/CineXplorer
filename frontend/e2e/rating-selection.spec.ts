import { test, expect } from "./tracking-fixture";
import { signIn } from "./tracking-input";
import { setTimeout as delay } from "node:timers/promises";
import { scanPage } from "./axe";

for (const touch of [false, true]) {
    test.describe(touch ? "touch rating" : "mouse rating", () => {
        test.use({
            viewport: { width: touch ? 390 : 1280, height: 900 },
            hasTouch: touch,
            isMobile: touch,
        });

        test("first pointer activation chooses the half and whole star and persists both", async ({
            page,
            tracking,
        }, info) => {
            test.setTimeout(150000);
            await signIn(
                page,
                touch ? "touch" : "mouse",
                tracking.username,
                tracking.password,
                info,
            );
            await page.goto(`/movie/${tracking.id}`);
            const panel = page.getByRole("region", {
                name: "Your film",
                exact: true,
            });
            const rate = panel.getByRole("button", {
                name: "Rate",
                exact: true,
            });
            await expect(panel).toBeVisible();
            await scanPage(page, info);
            if (touch) await rate.tap();
            const group = page.getByRole("radiogroup", {
                name: "Your rating",
                exact: true,
            });
            await expect(group).toBeVisible();
            if (touch) await scanPage(page, info);
            let saves = 0;
            page.on("request", (request) => {
                if (
                    new URL(request.url()).pathname ===
                        `/api/user-movie-data/${tracking.id}` &&
                    request.method() === "PATCH"
                )
                    saves++;
            });
            if (touch) {
                await group
                    .getByRole("radio", { name: "4 stars", exact: true })
                    .tap({ trial: true });
                const box = await group
                    .getByRole("radio", { name: "4 stars", exact: true })
                    .boundingBox();
                if (!box) throw new Error("Rating star must have a layout box");
                const session = await page.context().newCDPSession(page);
                await session.send("Input.dispatchTouchEvent", {
                    type: "touchStart",
                    touchPoints: [
                        { x: box.x + box.width / 4, y: box.y + box.height / 2 },
                    ],
                });
                await page.evaluate(() => new Promise(requestAnimationFrame));
                await session.send("Input.dispatchTouchEvent", {
                    type: "touchCancel",
                    touchPoints: [],
                });
                await session.detach();
                // Observe beyond the keyboard debounce before a later selection could hide a delayed save.
                await delay(600);
                await expect(
                    group.getByRole("radio", { checked: true }),
                ).toHaveCount(0);
                await expect(
                    page.getByRole("button", {
                        name: "Clear rating",
                        exact: true,
                    }),
                ).toHaveCount(0);
                expect(saves).toBe(0);
                await page.reload();
                await expect(
                    panel.getByText("Not rated", { exact: true }),
                ).toBeVisible();
                await rate.tap();
                await expect(
                    group.getByRole("radio", { checked: true }),
                ).toHaveCount(0);
            }
            for (const half of [true, false]) {
                const star = group.getByRole("radio", {
                    name: half ? "4 stars" : "3.5 stars",
                    exact: true,
                });
                const box = await star.boundingBox();
                if (!box) throw new Error("Rating star must have a layout box");
                const position = {
                    x: box.width * (half ? 0.25 : 0.75),
                    y: box.height / 2,
                };
                const save = page.waitForResponse(
                    (response) =>
                        new URL(response.url()).pathname ===
                            `/api/user-movie-data/${tracking.id}` &&
                        response.request().method() === "PATCH",
                );
                if (touch) await star.tap({ position });
                else await star.click({ position });
                expect((await save).ok()).toBe(true);
                expect(saves).toBe(half ? 1 : 2);
                await expect(
                    group.getByRole("radio", { checked: true }),
                ).toHaveAccessibleName(half ? "3.5 stars" : "4 stars");
                await scanPage(page, info);
                if (touch)
                    await page
                        .getByRole("dialog", {
                            name: "Your rating",
                            exact: true,
                        })
                        .getByRole("button", { name: "Done", exact: true })
                        .tap();
                await page.reload();
                if (touch) {
                    await expect(
                        panel.getByRole("img", {
                            name: `Rated ${half ? "3.5" : "4"} out of 5 stars`,
                            exact: true,
                        }),
                    ).toBeVisible();
                    await rate.tap();
                }
                await expect(
                    group.getByRole("radio", { checked: true }),
                ).toHaveAccessibleName(half ? "3.5 stars" : "4 stars");
                await scanPage(page, info);
            }
        });
    });
}
