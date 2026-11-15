import { RatingGroup } from "@chakra-ui/react";
import { FaStar } from "react-icons/fa";
import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { resolveTokenColor, styleSystem } from "@tests/helpers/theme-styles";

it("fills whole and half rating stars with the personal-rating gold", () => {
  render(
    <RatingGroup.Root allowHalf count={5} value={3.5}>
      <RatingGroup.Label>Rating</RatingGroup.Label>
      <RatingGroup.Control>
        {[1, 2, 3, 4, 5].map((index) => (
          <RatingGroup.Item key={index} index={index}>
            <RatingGroup.ItemIndicator
              icon={<FaStar data-testid={`star-${index}`} />}
            />
          </RatingGroup.Item>
        ))}
      </RatingGroup.Control>
    </RatingGroup.Root>,
    { system: styleSystem },
  );
  for (const [index, name] of [
    [1, "1 stars"],
    [4, "3.5 stars"],
  ] as const) {
    const item = screen.getByRole("radio", { name });
    const foreground = screen
      .getAllByTestId(`star-${index}`)
      .find((icon) => icon.hasAttribute("data-fg"));
    if (!foreground) throw new Error("Rating indicator is missing");
    expect(getComputedStyle(foreground).color).toBe(
      resolveTokenColor(item, "color", "var(--chakra-colors-imdb-gold)"),
    );
  }
});
