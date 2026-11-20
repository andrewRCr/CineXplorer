import { expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRoute } from "@tests/helpers/test-renderer-with-routes";
import TermsOfService from "../TermsOfService";

function renderTerms() {
  renderWithRoute("/terms", <TermsOfService />, { initialRoute: "/terms" });
}

it("shows one terms title and a calendar date without editorial markers", () => {
  renderTerms();

  const title = screen.getByRole("heading", {
    level: 1,
    name: "CineXplorer Terms of Service",
  });
  expect(screen.getAllByRole("heading", { level: 1 })).toEqual([title]);
  expect(screen.getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)).toBeVisible();
  expect(screen.getByRole("main")).not.toHaveTextContent(
    /\[(?:[A-Z]+\d+|publication date)\]|\{\{/,
  );
});

it("gives numbered sections stable fragments", () => {
  renderTerms();

  expect(
    screen.getAllByRole("heading", { level: 2 }).map(({ id }) => id),
  ).toEqual([
    "1-the-service",
    "2-who-can-use-it",
    "3-your-account",
    "4-using-the-site-fairly",
    "5-what-you-add",
    "6-film-information-and-images",
    "7-availability",
    "8-no-warranties",
    "9-limitation-of-liability",
    "10-ending-your-use",
    "11-changes-to-these-terms",
    "12-governing-law",
    "13-contact",
  ]);
});

it("links to the privacy policy and the contact email", () => {
  renderTerms();

  expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  const email = "cinexplorer@andrewcreekmore.dev";
  const addresses = screen.getAllByRole("link", { name: email });
  expect(addresses).toHaveLength(2);
  for (const address of addresses) {
    expect(address).toHaveAttribute("href", `mailto:${email}`);
  }
});
