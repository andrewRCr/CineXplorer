import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Switch slot recipe implementing toggle patterns
 *
 * Multi-part component with slots:
 * - root: Container element
 * - control: Track/background element
 * - thumb: Sliding indicator
 * - label: Text label
 *
 * Variants:
 * - solid: Standard switch with color fills (our main pattern)
 * - raised: Elevated appearance variant
 *
 * Pattern: No visible borders, relies on background color contrast
 * - Track (control): secondary → primary on checked
 * - Thumb: background (consistent across states)
 * - Focus state: 2px ring outline with 2px offset
 * - Note: Uses `secondary` for off state (not `muted`) for better visibility when disabled
 */
export const switchRecipe = defineSlotRecipe({
    className: "switch",

    slots: ["root", "control", "thumb", "label"],

    base: {
        root: {
            // Container styling (includes control + label)
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            cursor: "pointer",
            _disabled: {
                cursor: "not-allowed",
                opacity: 0.6, // Increased from 0.38 for better readability (matching radio appearance)
            },
        },
        control: {
            // Track/background element
            // Chakra provides base track styling, we customize colors
            transition: "background 0.2s",
        },
        thumb: {
            // Sliding indicator
            // Chakra provides base thumb styling, we customize colors
            transition: "transform 0.2s",
        },
        label: {
            // Text label
            userSelect: "none",
        },
    },

    variants: {
        variant: {
            /**
             * Solid variant (default): Standard color fills
             * - Track off: secondary background (better disabled visibility than muted)
             * - Track on: primary background
             * - Thumb: background (light surface)
             */
            solid: {
                control: {
                    bg: "secondary",
                    _checked: {
                        bg: "primary",
                    },
                    _focusVisible: {
                        outlineWidth: "2px",
                        outlineStyle: "solid",
                        outlineColor: "ring",
                        outlineOffset: "2px",
                    },
                },
                thumb: {
                    bg: "background",
                },
            },

            /**
             * Raised variant: Elevated appearance
             * - Similar colors but with shadow/elevation
             */
            raised: {
                control: {
                    bg: "secondary",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
                    _checked: {
                        bg: "primary",
                    },
                    _focusVisible: {
                        outlineWidth: "2px",
                        outlineStyle: "solid",
                        outlineColor: "ring",
                        outlineOffset: "2px",
                    },
                },
                thumb: {
                    bg: "background",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                },
            },
        },
    },

    defaultVariants: {
        variant: "solid",
    },
});
