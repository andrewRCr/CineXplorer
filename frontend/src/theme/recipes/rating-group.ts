import { defineSlotRecipe } from "@chakra-ui/react";
import { ratingGroupAnatomy } from "@chakra-ui/react/anatomy";

export const ratingGroupRecipe = defineSlotRecipe({
    slots: ratingGroupAnatomy.keys(),
    base: {
        itemIndicator: {
            "& [data-bg]": { color: "border-strong-01" },
            "&[data-highlighted]:not([data-half])": {
                "& [data-fg]": { color: "imdb-gold" },
            },
            "&[data-half]": { "& [data-fg]": { color: "imdb-gold" } },
        },
    },
});
