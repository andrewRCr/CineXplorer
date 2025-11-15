import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Checkbox slot recipe implementing form control patterns
 *
 * Multi-part component with slots:
 * - root: Container/label element
 * - control: The checkbox box itself (border, background)
 * - indicator: The checkmark icon inside
 * - label: Text label
 *
 * Variants:
 * - solid: Primary background when checked (our main pattern)
 * - outline: Border-only variant
 * - subtle: Subtle variant
 *
 * Pattern: 2px border differentiation from text inputs (1px)
 * - Default (unchecked): border-strong-01 (2px)
 * - Checked state: primary background + primary border
 * - Indicator (checkmark): on-primary (high contrast)
 * - Focus state: 2px ring outline with 2px offset
 */
export const checkboxRecipe = defineSlotRecipe({
    className: "checkbox",

    slots: ["root", "control", "indicator", "label"],

    base: {
        root: {
            // Container/label styling
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            cursor: "pointer",
            _disabled: {
                cursor: "not-allowed",
                opacity: 0.4,
            },
        },
        control: {
            // The checkbox box itself
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: "sm",
            transition: "all 0.2s",
        },
        indicator: {
            // Checkmark icon
            display: "inline-flex",
        },
        label: {
            // Text label
            userSelect: "none",
        },
    },

    variants: {
        variant: {
            /**
             * Solid variant (default): Primary background when checked
             * - 2px border (stronger than text inputs)
             * - Unchecked: border-strong-01
             * - Checked: primary bg + primary border
             * - Indicator: on-primary (high contrast)
             */
            solid: {
                control: {
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
                indicator: {
                    _checked: {
                        color: "on-primary",
                    },
                },
            },

            /**
             * Outline variant: Border-only, no background
             * - Similar to solid but no bg on checked
             */
            outline: {
                control: {
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
                indicator: {
                    _checked: {
                        color: "primary",
                    },
                },
            },

            /**
             * Subtle variant: Subtle background tint
             * - Less prominent than solid variant
             */
            subtle: {
                control: {
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
                indicator: {
                    _checked: {
                        color: "primary",
                    },
                },
            },
        },
    },

    defaultVariants: {
        variant: "solid",
    },
});
