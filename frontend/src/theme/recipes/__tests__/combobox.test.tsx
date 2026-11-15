import { Combobox, createListCollection } from "@chakra-ui/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { expectResolvedColor, styleSystem } from "@tests/helpers/theme-styles";

const collection = createListCollection({ items: ["One", "Two"] });
it("highlights a combobox item with tertiary and on-tertiary", async () => {
  const user = userEvent.setup();
  render(
    <Combobox.Root collection={collection}>
      <Combobox.Label>Film</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input />
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content>
          {collection.items.map((item) => (
            <Combobox.Item item={item} key={item}>
              {item}
              <Combobox.ItemIndicator />
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>,
    { system: styleSystem },
  );
  await user.click(screen.getByRole("combobox", { name: "Film" }));
  await user.keyboard("{ArrowDown}");
  const highlighted = screen.getByRole("option", { name: "One" });
  expect(highlighted).toHaveAttribute("data-highlighted");
  expectResolvedColor(
    highlighted,
    "background-color",
    "var(--chakra-colors-tertiary)",
  );
  expectResolvedColor(highlighted, "color", "var(--chakra-colors-on-tertiary)");
});
