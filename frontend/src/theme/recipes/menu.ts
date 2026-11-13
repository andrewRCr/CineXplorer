import { defineSlotRecipe } from "@chakra-ui/react";
import { menuAnatomy } from "@chakra-ui/react/anatomy";

/**
 * Menu Recipe Override
 *
 * A menu keeps focus on its list and marks the item under the keyboard or pointer with `data-highlighted`,
 * so the highlight is the item's focus indicator. It is a solid `tertiary` fill with `on-tertiary` text, which
 * stands out from the menu surface in every theme; a chosen radio or checkbox item shows its check mark instead
 * of a fill.
 *
 * Slots come from Chakra's anatomy because configured slot lists merge with Chakra's by position.
 */
export const menuRecipe = defineSlotRecipe({
    slots: menuAnatomy.keys(),
    variants: {
        variant: {
            subtle: {
                item: {
                    _highlighted: {
                        bg: "tertiary",
                        color: "on-tertiary",
                    },
                },
            },
        },
    },
});
