import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { target } from "./target";

test("sign up and reach the email verification notice", async ({ page }) => {
    test.skip(
        target.name === "staging",
        "Staging uses an existing verified account",
    );
    const username = `smoke_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    await page.goto("/register");
    await page
        .getByLabel("Email Address", { exact: true })
        .fill(`${username}@example.com`);
    await page
        .getByLabel("CineXplorer Username", { exact: true })
        .fill(username);
    await page
        .getByLabel("Password", { exact: true })
        .fill(`Smoke-${randomUUID()}!`);
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page).toHaveURL(new URL("/login", target.baseURL).href);
    await expect(
        page.getByText(
            "Account created! Check your email to verify your account before logging in.",
            { exact: true },
        ),
    ).toBeVisible();
});
