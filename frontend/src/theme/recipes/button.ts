import { defineRecipe } from "@chakra-ui/react";

/**
 * Button recipe implementing all codified button patterns
 *
 * 5 finalized variants optimized for cross-theme consistency and semantic clarity:
 *
 * Variants:
 * - solid: Primary action button (12% hover for improved visibility)
 * - secondary: Form pair secondary action (primary text + grey border)
 * - outline: Standalone utility action (grey text + primary hover)
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
             * - Hover: primary-hover (12% foreground overlay)
             * - Active: primary-active (16% foreground overlay)
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
             * Secondary variant: Secondary action when paired with primary
             * - Neutral border (button-outline) with PRIMARY text color
             * - Hover uses primary/8 background + stronger grey border (NOT primary border)
             * - Active uses primary/12 background
             *
             * Use when button is PAIRED with a primary action (e.g., Save + Cancel forms)
             * For standalone utility buttons, use 'outline' variant instead
             *
             * Key difference from 'outline': Primary TEXT creates visual tie to primary button
             */
            secondary: {
                borderWidth: "1px",
                borderColor: "button-outline",
                color: "primary", // Primary text creates visual tie to primary button
                bg: "transparent",
                _hover: {
                    bg: "primary/8", // Same hover bg as neutral-outline-alt
                    borderColor: "border-strong-01", // Stronger grey border (NOT primary)
                    _disabled: {
                        bg: "transparent",
                        borderColor: "button-outline",
                    },
                },
                _active: {
                    bg: "primary/12",
                    borderColor: "border-strong-01",
                },
                _focusVisible: {
                    outline: "2px solid",
                    outlineColor: "ring",
                    outlineOffset: "2px",
                },
            },

            /**
             * Outline variant: Default outline button for standalone utility actions
             * - Neutral border and text (button-outline, on-button-outline)
             * - Hover adds primary background (primary/8) and border
             * - Active increases primary background opacity (primary/12)
             *
             * Use for: Standalone utility actions (Back, Cancel, OAuth, filters)
             * For form pairs: Use 'secondary' variant instead
             */
            outline: {
                borderWidth: "1px",
                borderColor: "button-outline",
                color: "on-button-outline",
                bg: "transparent",
                _hover: {
                    bg: "primary/8",
                    borderColor: "primary",
                    _disabled: {
                        bg: "transparent",
                        borderColor: "button-outline",
                    },
                },
                _active: {
                    bg: "primary/12",
                    borderColor: "primary",
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
             * - Hover: secondary-hover (12% foreground overlay)
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
