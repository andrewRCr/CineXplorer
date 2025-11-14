import { defineRecipe } from "@chakra-ui/react";

/**
 * Button recipe implementing all codified button patterns
 *
 * Variants:
 * - solid: Primary action button (primary background)
 * - primary-outline: Secondary action with primary color scheme
 * - neutral-outline: Secondary action with neutral color scheme
 * - subtle: Low-emphasis button with optional selection state
 * - ghost: Minimal button for tertiary actions
 */
export const buttonRecipe = defineRecipe({
    className: "button",

    base: {
        // Foundation styles shared by all variants
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "medium",
        borderRadius: "md",
        transition: "all 0.2s",
        cursor: "pointer",
        userSelect: "none",
        _disabled: {
            opacity: 0.4,
            cursor: "not-allowed",
        },
    },

    variants: {
        variant: {
            /**
             * Solid variant: Primary action button
             * - Primary background with on-primary text
             * - Hover darkens to primary-hover
             * - Active further darkens to primary-active
             * - Focus ring with ring color
             */
            solid: {
                bg: "primary",
                color: "on-primary",
                _hover: {
                    bg: "primary-hover",
                    _disabled: {
                        bg: "primary",
                    },
                },
                _active: {
                    bg: "primary-active",
                },
                _focusVisible: {
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                },
            },

            /**
             * Primary outline variant: Secondary action with primary emphasis
             * - Primary color border and text
             * - Hover adds subtle primary background (8% opacity)
             * - Active increases background opacity to 12%
             */
            "primary-outline": {
                borderWidth: "1px",
                borderColor: "button-outline-primary",
                color: "on-button-outline-primary",
                bg: "transparent",
                _hover: {
                    bg: "primary/8",
                    _disabled: {
                        bg: "transparent",
                    },
                },
                _active: {
                    bg: "primary/12",
                },
                _focusVisible: {
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                },
            },

            /**
             * Neutral outline variant: Secondary action with neutral emphasis
             * - Neutral border and text
             * - Hover adds tertiary background and border (8% opacity)
             * - Active increases background opacity to 12%
             *
             * NOTE: Currently uses tertiary tokens for hover/active.
             * Future: Will change to primary tokens (planned design system update).
             */
            "neutral-outline": {
                borderWidth: "1px",
                borderColor: "button-outline",
                color: "on-button-outline",
                bg: "transparent",
                _hover: {
                    bg: "tertiary/8",
                    borderColor: "tertiary",
                    _disabled: {
                        bg: "transparent",
                        borderColor: "button-outline",
                    },
                },
                _active: {
                    bg: "tertiary/12",
                    borderColor: "tertiary",
                },
                _focusVisible: {
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                },
            },

            /**
             * Subtle variant: Low-emphasis button with optional selection state
             * - Uses button-subtle background (layer-appropriate)
             * - Hover darkens to secondary-hover (when not selected)
             * - Selected state uses button-subtle-selected tokens
             * - Compound variants handle selection state
             */
            subtle: {
                bg: "button-subtle",
                color: "on-button-subtle",
                _hover: {
                    bg: "secondary-hover",
                    _disabled: {
                        bg: "button-subtle",
                    },
                },
                _focusVisible: {
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                },
            },

            /**
             * Ghost variant: Minimal button for tertiary actions
             * - No background, only tertiary text
             * - Hover adds subtle background (8% opacity) and darkens text
             * - Active darkens text further
             */
            ghost: {
                bg: "transparent",
                color: "tertiary",
                _hover: {
                    bg: "tertiary/8",
                    color: "tertiary-hover",
                    _disabled: {
                        bg: "transparent",
                        color: "tertiary",
                    },
                },
                _active: {
                    color: "tertiary-active",
                },
                _focusVisible: {
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                },
            },
        },

        /**
         * Selected state for subtle button variant
         * Used with compound variants to control selection styling
         */
        selected: {
            true: {},
            false: {},
        },
    },

    /**
     * Compound variants for context-specific styling
     *
     * Selected subtle button:
     * - Uses button-subtle-selected background
     * - Uses on-button-subtle-selected text color
     * - No hover state change (maintains selected appearance)
     */
    compoundVariants: [
        {
            variant: "subtle",
            selected: true,
            css: {
                bg: "button-subtle-selected",
                color: "on-button-subtle-selected",
                _hover: {
                    bg: "button-subtle-selected",
                    color: "on-button-subtle-selected",
                    _disabled: {
                        bg: "button-subtle-selected",
                    },
                },
            },
        },
    ],

    defaultVariants: {
        variant: "solid",
        selected: false,
    },
});
