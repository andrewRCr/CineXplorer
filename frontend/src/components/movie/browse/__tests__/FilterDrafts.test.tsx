import { describe, expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import RatingSelector from "../RatingSelector";
import YearSelector from "../YearSelector";
import ExpandableSearchInput from "@/components/common/ExpandableSearchInput";

const ignoreChange = () => {};

describe("Filter draft transitions", () => {
  it("discards an old draft after external values change away and back", async () => {
    const user = userEvent.setup();
    const props = {
      minRating: "4",
      maxRating: "",
      onMinRatingChange: ignoreChange,
      onMaxRatingChange: ignoreChange,
    };
    const view = render(<RatingSelector {...props} />);
    const input = screen.getByPlaceholderText("0.0");
    await user.clear(input);
    await user.type(input, "6");
    view.rerender(<RatingSelector {...props} minRating="5" />);
    expect(input).toHaveValue(5);
    view.rerender(<RatingSelector {...props} />);
    expect(input).toHaveValue(4);
  });

  it("preserves the other field's unfinished draft and focus", async () => {
    const user = userEvent.setup();
    const props = {
      minRating: "4",
      maxRating: "",
      onMinRatingChange: ignoreChange,
      onMaxRatingChange: ignoreChange,
    };
    const view = render(<RatingSelector {...props} />);
    const max = screen.getByPlaceholderText("10");
    await user.type(max, "8");
    view.rerender(<RatingSelector {...props} minRating="5" />);
    expect(max).toHaveValue(8);
    expect(max).toHaveFocus();
  });

  it("resets a year draft when different external years clamp to the same value", async () => {
    const user = userEvent.setup();
    const props = {
      minYear: "2100",
      maxYear: "",
      onMinYearChange: ignoreChange,
      onMaxYearChange: ignoreChange,
    };
    const view = render(<YearSelector {...props} />);
    const min = screen.getByPlaceholderText("1900");
    await user.clear(min);
    await user.type(min, "2000");
    view.rerender(<YearSelector {...props} minYear="2200" />);
    expect(min).toHaveValue(new Date().getFullYear());
    expect(min).toHaveFocus();
  });

  it("collapses search on source changes without losing its draft or reopening on return", async () => {
    const user = userEvent.setup();
    const props = {
      query: "",
      onQueryChange: ignoreChange,
      pageSource: "popular",
    };
    const view = render(<ExpandableSearchInput {...props} />);
    await user.click(screen.getByRole("button", { name: "Open search" }));
    await user.type(screen.getByPlaceholderText("Search results..."), "draft");
    view.rerender(<ExpandableSearchInput {...props} pageSource="top-rated" />);
    expect(
      screen.getByRole("button", { name: "Open search" }),
    ).toBeInTheDocument();
    view.rerender(<ExpandableSearchInput {...props} />);
    expect(
      screen.getByRole("button", { name: "Open search" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open search" }));
    expect(screen.getByRole("textbox")).toHaveValue("draft");
  });
});
