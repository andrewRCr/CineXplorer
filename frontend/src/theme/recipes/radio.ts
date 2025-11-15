import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Radio (RadioGroup) slot recipe implementing form control patterns
 *
 * Multi-part component with slots:
 * - root: Container element
 * - item: Individual radio item container
 * - itemControl: The radio circle itself (border, background)
 * - indicator: The dot inside the circle
 * - label: Group label
 * - itemText: Individual item text
 *
 * Variants:
 * - solid: Primary background when selected (our main pattern)
 * - outline: Border-only variant
 * - subtle: Subtle variant
 *
 * Pattern: 2px border differentiation from text inputs (1px)
 * - Default (unselected): border-strong-01 (2px)
 * - Selected state: primary background + primary border
 * - Indicator (dot): on-primary (high contrast)
 * - Focus state: 2px ring outline with 2px offset
 */
export const radioRecipe = defineSlotRecipe({
    className: "radioGroup",

    slots: ["root", "item", "itemControl", "itemIndicator", "label", "itemText"],

    base: {
        root: {
            // Group container
            display: "flex",
            flexDirection: "column",
            gap: "2",
        },
        item: {
            // Individual radio item
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            cursor: "pointer",
            _disabled: {
                cursor: "not-allowed",
                opacity: 0.4,
            },
        },
        itemControl: {
            // The radio circle itself
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: "full",
            transition: "all 0.2s",
        },
        itemIndicator: {
            // Dot inside the circle
            borderRadius: "full",
            // Size the dot (typically 50% of control size for centered dot)
            width: "50%",
            height: "50%",
        },
        label: {
            // Group label
            fontWeight: "medium",
        },
        itemText: {
            // Individual item text
            userSelect: "none",
        },
    },

    variants: {
        variant: {
            /**
             * Solid variant (default): Primary background when selected
             * - 2px border (stronger than text inputs)
             * - Unselected: border-strong-01
             * - Selected: primary bg + primary border
             * - Indicator: on-primary (high contrast)
             */
            solid: {
                itemControl: {
                    borderWidth: "2px",
                    borderColor: "border-strong-01",
                    _hover: {
                        borderColor: "border-strong-02",
                        bg: "tertiary/8",
                    },
                    _checked: {
                        bg: "primary",
                        borderColor: "primary",
                        _hover: {
                            bg: "primary-hover",
                            borderColor: "primary-hover",
                        },
                    },
                    _focusVisible: {
                        outline: "2px solid",
                        outlineColor: "ring",
                        outlineOffset: "2px",
                    },
                },
                itemIndicator: {
                    _checked: {
                        bg: "on-primary",
                    },
                },
            },

            /**
             * Outline variant: Border-only, no background
             * - Similar to solid but no bg on selected
             */
            outline: {
                itemControl: {
                    borderWidth: "2px",
                    borderColor: "border-strong-01",
                    _checked: {
                        borderColor: "primary",
                    },
                    _focusVisible: {
                        outline: "2px solid",
                        outlineColor: "ring",
                        outlineOffset: "2px",
                    },
                },
                itemIndicator: {
                    _checked: {
                        bg: "primary",
                    },
                },
            },

            /**
             * Subtle variant: Subtle background tint
             * - Less prominent than solid variant
             */
            subtle: {
                itemControl: {
                    borderWidth: "2px",
                    borderColor: "border-strong-01",
                    _checked: {
                        bg: "primary/10",
                        borderColor: "primary",
                    },
                    _focusVisible: {
                        outline: "2px solid",
                        outlineColor: "ring",
                        outlineOffset: "2px",
                    },
                },
                itemIndicator: {
                    _checked: {
                        bg: "primary",
                    },
                },
            },
        },
    },

    defaultVariants: {
        variant: "solid",
    },
});
