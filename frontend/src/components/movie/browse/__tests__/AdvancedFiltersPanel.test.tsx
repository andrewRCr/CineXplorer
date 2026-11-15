import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import AdvancedFiltersPanel from "../AdvancedFiltersPanel";

it("connects the Language label to its selector", () => {
  render(
    <AdvancedFiltersPanel
      browseParams={DEFAULT_BROWSE_PARAMS}
      onBrowseParamsChange={() => undefined}
    />,
  );
  expect(screen.getByRole("combobox", { name: "Language" })).toBeVisible();
});
