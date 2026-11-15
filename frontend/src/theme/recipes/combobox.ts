import { defineSlotRecipe } from "@chakra-ui/react";
import { comboboxAnatomy } from "@chakra-ui/react/anatomy";

export const comboboxRecipe = defineSlotRecipe({
    slots: comboboxAnatomy.keys(),
    base: {
        content: {
            bg: "popover",
            color: "foreground",
            borderColor: "border-subtle-02",
        },
        item: {
            _highlighted: { bg: "tertiary", color: "on-tertiary" },
        },
    },
});
