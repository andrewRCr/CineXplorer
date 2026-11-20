import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { describe, expect, it } from "vitest";
import { server } from "@tests/mocks/server";
import SequentialMovieGrid from "../../SequentialMovieGrid";
import {
  browsePage,
  browseUrl,
  holdBrowsePage,
  renderBrowseGrid,
  serveBrowse,
} from "./grid-test-utils";

const renderGrid = () =>
  renderBrowseGrid("/browse/sequential", <SequentialMovieGrid />);

// These short responses each consume six upstream pages: 1–6, 7–12, 13–18.
const totalResults = 360;
const firstPage = browsePage(1, 2, totalResults, 7);
const secondPage = browsePage(3, 15, totalResults, 13);
const lastPage = browsePage(18, 3, totalResults);

const buttons = (direction: "Next" | "Previous") =>
  screen.getAllByRole("button", { name: `${direction} page` });

function button(direction: "Next" | "Previous") {
  const [control] = buttons(direction);
  if (!control)
    throw new Error(`Missing ${direction.toLowerCase()} page button`);
  return control;
}

describe("SequentialMovieGrid", () => {
  it("shows initial skeletons, then the first page's movies and range", async () => {
    const pending = holdBrowsePage(firstPage);
    serveBrowse(() => pending.response);
    renderGrid();

    try {
      expect(screen.getByText("Loading results...")).toBeVisible();
      expect(screen.getAllByTestId(/^skeleton-loader-/)).toHaveLength(20);
    } finally {
      pending.release();
    }

    expect(
      await screen.findByRole("article", { name: "Movie 1" }),
    ).toBeVisible();
    expect(screen.getByRole("article", { name: "Movie 2" })).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryAllByTestId(/^skeleton-loader-/)).toHaveLength(0);
    expect(screen.getByText("Showing 1-2 of 360 results")).toBeVisible();
    for (const previous of buttons("Previous")) expect(previous).toBeDisabled();
  });

  it("uses the next cursor, shows a different-sized page, and revisits both pages from cache", async () => {
    const pages = new Map([
      [null, firstPage],
      ["7", secondPage],
      ["13", lastPage],
    ]);
    const cursors = serveBrowse((cursor) => pages.get(cursor));
    const user = userEvent.setup();
    renderGrid();
    await screen.findByRole("article", { name: "Movie 1" });

    await user.click(button("Next"));
    expect(
      await screen.findByRole("article", { name: "Movie 17" }),
    ).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(15);
    expect(screen.getByText("Showing 3-17 of 360 results")).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "Movie 1" }),
    ).not.toBeInTheDocument();

    await user.click(button("Previous"));
    expect(screen.getByRole("article", { name: "Movie 1" })).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "Movie 17" }),
    ).not.toBeInTheDocument();

    await user.click(button("Next"));
    expect(screen.getByRole("article", { name: "Movie 17" })).toBeVisible();
    expect(cursors).toEqual([null, "7"]);
  });

  it("disables both navigation directions while waiting for a later page", async () => {
    const pending = holdBrowsePage(lastPage);
    serveBrowse((cursor) => {
      if (cursor === null) return firstPage;
      if (cursor === "7") return secondPage;
      if (cursor === "13") return pending.response;
      return undefined;
    });
    const user = userEvent.setup();
    renderGrid();
    await screen.findByRole("article", { name: "Movie 1" });
    await user.click(button("Next"));
    await screen.findByRole("article", { name: "Movie 3" });

    try {
      await user.click(button("Next"));
      for (const control of [...buttons("Previous"), ...buttons("Next")]) {
        expect(control).toBeDisabled();
      }
      expect(screen.getByRole("article", { name: "Movie 3" })).toBeVisible();
    } finally {
      pending.release();
    }

    expect(
      await screen.findByRole("article", { name: "Movie 18" }),
    ).toBeVisible();
    expect(button("Previous")).toBeEnabled();
    expect(button("Next")).toBeDisabled();
  });

  it("shows empty results guidance", async () => {
    serveBrowse(() => browsePage(1, 0));
    renderGrid();

    expect(
      await screen.findByText("No movies found matching your filters."),
    ).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("shows a network error and displays movies after a retry", async () => {
    serveBrowse(() => firstPage);
    server.use(http.get(browseUrl, () => HttpResponse.error(), { once: true }));
    const user = userEvent.setup();
    renderGrid();

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByText(/network error/i)).toBeVisible();
    await user.click(retry);
    expect(
      await screen.findByRole("article", { name: "Movie 1" }),
    ).toBeVisible();
    expect(retry).not.toBeInTheDocument();
  });

  it("displays large result totals as 10,000+", async () => {
    serveBrowse(() => browsePage(1, 2, 12_000, 7));
    renderGrid();

    expect(
      await screen.findByText("Showing 1-2 of 10,000+ results"),
    ).toBeVisible();
  });
});
