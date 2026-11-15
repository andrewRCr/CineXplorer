import { test, expect } from "./tracking-fixture";
import { color, controls, signIn, tabTo } from "./tracking-input";

for (const mode of ["mouse", "keyboard", "touch"] as const) {
    test.describe(mode, () => {
        test.use({
            viewport: { width: mode === "touch" ? 390 : 1280, height: 900 },
            hasTouch: mode === "touch",
            isMobile: mode === "touch",
            timezoneId: "America/Chicago",
        });

        test("logs two viewings, updates the watchlist and preserves each review", async ({
            page,
            tracking,
        }, info) => {
            test.setTimeout(150000);
            const input = controls(page, mode);
            await signIn(
                page,
                mode,
                tracking.username,
                tracking.password,
                info,
            );
            const banner = page.getByRole("banner");
            const openMenu = banner.getByRole("button", {
                name: "Open menu",
                exact: true,
            });
            const navigate = async (name: string) => {
                if (mode === "touch") {
                    await input.activate(openMenu);
                    await input.activate(
                        page
                            .getByRole("dialog", { name: "Menu", exact: true })
                            .getByRole("link", { name, exact: true }),
                    );
                } else
                    await input.activate(
                        banner.getByRole("link", { name, exact: true }),
                    );
            };
            await navigate("Films");
            const title = page
                .getByRole("link", { name: tracking.title, exact: true })
                .first();
            await expect(title).toBeVisible();
            const actionGroup = page.getByRole("group", {
                name: `Your actions for ${tracking.title}`,
            });
            const touchTrigger = page.getByRole("button", {
                name: `Actions for ${tracking.title}`,
            });
            const cardAction = async (name: string) => {
                if (mode === "touch") {
                    await input.activate(touchTrigger);
                    const menu = page.getByRole("menu");
                    await input.activate(
                        menu.getByRole(
                            name === "Review or log"
                                ? "menuitem"
                                : "menuitemcheckbox",
                            { name, exact: true },
                        ),
                    );
                } else {
                    if (mode === "mouse")
                        await page
                            .getByRole("img", {
                                name: tracking.title,
                                exact: true,
                            })
                            .hover();
                    await input.activate(
                        actionGroup.getByRole("button", { name, exact: true }),
                    );
                }
            };
            const card = title.locator(
                "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' group ')]",
            );
            const box = await card.boundingBox();
            expect(box?.width).toBe(194);
            expect(box?.height).toBe(194 * 1.5 + 128);
            if (mode === "mouse") {
                await page
                    .getByRole("img", { name: tracking.title, exact: true })
                    .hover();
                const surface = await color(actionGroup, "popover");
                expect(surface).not.toBe("rgba(0, 0, 0, 0)");
                await expect(actionGroup).toHaveCSS(
                    "background-color",
                    surface,
                );
                for (const button of await actionGroup
                    .getByRole("button")
                    .all()) {
                    await expect(button).toHaveCSS(
                        "background-color",
                        "rgba(0, 0, 0, 0)",
                    );
                    await button.hover();
                    await expect(button).toHaveCSS(
                        "color",
                        await color(button, "tertiary"),
                    );
                }
                const tooltip = page.getByRole("tooltip", {
                    name: "Review or log",
                    exact: true,
                });
                await expect(tooltip).toBeVisible();
                const tooltipBox = await tooltip.boundingBox();
                const buttonBox = await actionGroup
                    .getByRole("button", { name: "Review or log" })
                    .boundingBox();
                expect(tooltipBox).not.toBeNull();
                expect(buttonBox).not.toBeNull();
                if (!tooltipBox || !buttonBox)
                    throw new Error(
                        "Tooltip and control must have layout boxes",
                    );
                expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(
                    buttonBox.y,
                );
            }
            await cardAction("Watchlist");
            if (mode !== "touch")
                await expect(
                    actionGroup.getByRole("button", { name: "Watchlist" }),
                ).toHaveAttribute("aria-pressed", "true");
            const fillLog = async (
                rating: number,
                review: string,
                rewatch: boolean,
            ) => {
                const dialog = page.getByRole("dialog", {
                    name: "Review or log",
                    exact: true,
                });
                await expect(dialog).toBeVisible();
                await expect(
                    dialog.getByRole("textbox", {
                        name: "Review",
                        exact: true,
                    }),
                ).toBeEnabled();
                await expect(
                    dialog.getByRole("checkbox", { name: "Rewatch" }),
                ).toBeChecked({ checked: rewatch });
                const date = await page.evaluate(() => {
                    const today = new Date();
                    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                });
                await expect(dialog.getByLabel("Date watched")).toHaveValue(
                    date,
                );
                const stars = dialog.getByRole("radiogroup", {
                    name: "Rating",
                    exact: true,
                });
                if (mode === "keyboard") {
                    // Tab enters the radio group at its currently selected star (the first item when unrated).
                    const radio = stars.locator('[role="radio"][tabindex="0"]');
                    await tabTo(page, radio);
                    for (let step = 0; step < (rating === 7 ? 7 : 3); step++)
                        await page.keyboard.press("ArrowRight");
                } else {
                    const star = stars.getByRole("radio", {
                        name: rating === 7 ? "4 stars" : "5 stars",
                        exact: true,
                    });
                    const bounds = await star.boundingBox();
                    if (!bounds)
                        throw new Error("Rating star has no layout box");
                    const position = {
                        x: bounds.width * (rating === 7 ? 0.25 : 0.75),
                        y: bounds.height / 2,
                    };
                    if (mode === "touch") await star.tap({ position });
                    else await star.click({ position });
                }
                await expect(
                    stars.getByRole("radio", { checked: true }),
                ).toHaveAccessibleName(rating === 7 ? "3.5 stars" : "5 stars");
                await input.type(
                    dialog.getByRole("textbox", {
                        name: "Review",
                        exact: true,
                    }),
                    review,
                );
                await input.activate(
                    dialog.getByRole("button", { name: "Save", exact: true }),
                );
                await expect(dialog).toBeHidden();
            };
            await cardAction("Review or log");
            await fillLog(7, "First browser viewing", false);
            const logged = page.getByRole("status", {
                name: "Logged",
                exact: true,
            });
            await expect(
                logged.getByText("Also removed from your watchlist.", {
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                logged.getByRole("button", { name: "Undo", exact: true }),
            ).toBeVisible();
            if (mode === "touch") await expect(touchTrigger).toBeFocused();
            else
                await expect(
                    actionGroup.getByRole("button", { name: "Review or log" }),
                ).toBeFocused();
            await expect(
                page.getByRole("img", {
                    name: "Rated 3.5 out of 5 stars",
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole("img", { name: "Watched", exact: true }),
            ).toBeVisible();
            const checkWatchlist = async (present: boolean) => {
                await navigate("Watchlist");
                await expect(
                    page.getByRole("heading", {
                        name: "My Watchlist",
                        exact: true,
                    }),
                ).toBeVisible();
                if (present)
                    await expect(
                        page.getByText(tracking.title, { exact: true }),
                    ).toBeVisible();
                else
                    await expect(
                        page.getByText("No movies on watchlist", {
                            exact: true,
                        }),
                    ).toBeVisible();
            };
            await checkWatchlist(false);
            await navigate("Films");
            await input.activate(title);
            const log = page.getByRole("region", {
                name: "Your log",
                exact: true,
            });
            await expect(
                log.getByText("First browser viewing", { exact: true }),
            ).toBeVisible();
            await expect(log.getByRole("listitem")).toHaveCount(1);
            const panel = page.getByRole("region", {
                name: "Your film",
                exact: true,
            });
            await input.activate(
                panel.getByRole("button", { name: "Watchlist", exact: true }),
            );
            await expect(
                panel.getByRole("button", { name: "Watchlist", exact: true }),
            ).toHaveAttribute("aria-pressed", "true");
            await checkWatchlist(true);
            await navigate("Films");
            await input.activate(title);
            if (mode === "touch") {
                await input.activate(openMenu);
                await input.activate(
                    page
                        .getByRole("dialog", { name: "Menu", exact: true })
                        .getByRole("button", {
                            name: "Log a film",
                            exact: true,
                        }),
                );
            } else
                await input.activate(
                    banner.getByRole("button", { name: "Log", exact: true }),
                );
            await fillLog(10, "Second browser viewing", true);
            if (mode === "touch") await expect(openMenu).toBeFocused();
            else
                await expect(
                    banner.getByRole("button", { name: "Log", exact: true }),
                ).toBeFocused();
            const rows = log.getByRole("listitem");
            await expect(rows).toHaveCount(2);
            await expect(
                rows
                    .nth(0)
                    .getByText("Second browser viewing", { exact: true }),
            ).toBeVisible();
            await expect(
                rows.nth(0).getByRole("img", {
                    name: "Rated 5 out of 5 stars",
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                rows.nth(0).getByRole("img", { name: "Rewatch", exact: true }),
            ).toBeVisible();
            await expect(
                rows.nth(1).getByText("First browser viewing", { exact: true }),
            ).toBeVisible();
            await expect(
                rows.nth(1).getByRole("img", {
                    name: "Rated 3.5 out of 5 stars",
                    exact: true,
                }),
            ).toBeVisible();
            await checkWatchlist(false);
            await navigate("Films");
            await expect(
                page.getByRole("img", {
                    name: "Rated 5 out of 5 stars",
                    exact: true,
                }),
            ).toBeVisible();
            await page.reload();
            await expect(
                page.getByRole("img", {
                    name: "Rated 5 out of 5 stars",
                    exact: true,
                }),
            ).toBeVisible();
        });
    });
}
