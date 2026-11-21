import { expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithRoute } from "@tests/helpers/test-renderer-with-routes";
import PrivacyPolicy from "../PrivacyPolicy";

function renderPolicy() {
  renderWithRoute("/privacy", <PrivacyPolicy />, { initialRoute: "/privacy" });
}

it("shows one policy title and a calendar date without editorial markers", () => {
  renderPolicy();

  const title = screen.getByRole("heading", {
    level: 1,
    name: "CineXplorer Privacy Policy",
  });
  expect(screen.getAllByRole("heading", { level: 1 })).toEqual([title]);
  expect(screen.getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)).toBeVisible();
  expect(screen.getByRole("main")).not.toHaveTextContent(
    /\[(?:[A-Z]+\d+|publication date)\]|\{\{/,
  );
});

it("anchors each section and links to three of them from the policy", () => {
  renderPolicy();

  const headings = [2, 3].flatMap((level) =>
    screen.getAllByRole("heading", { level }),
  );
  expect(headings.map((heading) => heading.id)).toEqual([
    "the-short-version",
    "what-we-collect",
    "cookies-and-browser-storage",
    "who-else-handles-your-data",
    "how-long-we-keep-things",
    "your-choices",
    "security",
    "children",
    "where-your-data-is-processed",
    "changes-to-this-policy",
    "contact",
    "your-account",
    "signing-in-with-google",
    "signing-in-with-github",
    "your-movie-lists",
    "when-you-use-the-site",
    "email",
  ]);
  for (const section of [
    "Who else handles your data",
    "Your choices",
    "Security",
  ]) {
    const heading = screen.getByRole("heading", { name: section });
    expect(screen.getByRole("link", { name: section })).toHaveAttribute(
      "href",
      `/privacy#${heading.id}`,
    );
  }
});

it("links to Google's policy and makes each contact address an email link", () => {
  renderPolicy();

  expect(
    screen.getByRole("link", { name: "Google API Services User Data Policy" }),
  ).toHaveAttribute(
    "href",
    "https://developers.google.com/terms/api-services-user-data-policy",
  );
  const email = "cinexplorer@andrewcreekmore.dev";
  const addresses = screen.getAllByRole("link", { name: email });
  expect(addresses).toHaveLength(7);
  for (const address of addresses) {
    expect(address).toHaveAttribute("href", `mailto:${email}`);
  }
});

it("describes the four cookies in a focusable table region", () => {
  renderPolicy();

  const region = screen.getByRole("region", { name: "Cookie table" });
  expect(region).toHaveAttribute("tabindex", "0");
  const table = within(region).getByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
  expect(within(table).getAllByRole("row")).toHaveLength(5);
  for (const cookie of [
    "sessionid",
    "csrftoken",
    "refresh_token",
    "messages",
  ]) {
    expect(within(table).getByRole("cell", { name: cookie })).toBeVisible();
  }
});
