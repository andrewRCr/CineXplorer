import { defineSlotRecipe } from "@chakra-ui/react";
import { dialogAnatomy } from "@chakra-ui/react/anatomy";

/**
 * Dialog Recipe Override
 *
 * Draws the backdrop in the theme's `backdrop` role rather than Chakra's fixed `blackAlpha.500`.
 * Slots come from Chakra's anatomy because configured slot lists merge with Chakra's by position.
 */
export const dialogRecipe = defineSlotRecipe({
    slots: dialogAnatomy.keys(),
    base: {
        backdrop: { bg: "backdrop" },
    },
});
