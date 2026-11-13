import { defineSlotRecipe } from "@chakra-ui/react";
import { selectAnatomy } from "@chakra-ui/react/anatomy";

/**
 * Select slot recipe implementing dropdown/select control patterns
 *
 * Slots come from Chakra's anatomy because configured slot lists merge with Chakra's by position.
 *
 * Pattern:
 * - Trigger uses button-like border hierarchy (border-strong-01 → border-strong-02)
 * - Border-only keyboard focus (tertiary border)
 * - Content uses muted background for elevation
 * - The highlighted option (keyboard or pointer) is a solid tertiary fill; the chosen option shows its
 *   check mark (`Select.ItemIndicator`)
 */
export const selectRecipe = defineSlotRecipe({
    className: "select",

    slots: selectAnatomy.keys(),

    base: {
        indicator: { color: "foreground", _disabled: { color: "on-muted" } },
        /**
         * Trigger: Select control that opens dropdown
         * - Border hierarchy: border-strong-01 (default) → border-strong-02 (hover, open) → tertiary (focus)
         * - Hover adds tertiary/8 background tint
         * - Border-only focus (matches StyledInput pattern, not outline rings like buttons)
         *
         * Note: Select.Trigger uses border-only focus (like text inputs) because it's
         * semantically a form control (choose a value) not an action button.
         * This matches StyledInput, Textarea, and aligns with ADR-015.
         */
        trigger: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: "1px",
            color: "foreground",
            borderRadius: "md",
            transition: "all 0.2s",
            cursor: "pointer",
            _disabled: {
                opacity: 0.4,
                cursor: "not-allowed",
            },
        },

        /**
         * Content: Dropdown container
         * - Uses muted background for elevation
         * - Subtle border for definition
         */
        content: {
            bg: "muted",
            borderWidth: "1px",
            borderColor: "border-subtle-02",
            color: "foreground",
            borderRadius: "md",
            boxShadow: "shadow-md",
        },

        /**
         * Item: Individual option in dropdown
         * - The highlight is the option's focus indicator: Select keeps focus on its list
         */
        item: {
            cursor: "pointer",
            transition: "all 0.15s",
            borderRadius: "sm",
            _highlighted: {
                bg: "tertiary",
                color: "on-tertiary",
            },
        },
    },

    variants: {
        variant: {
            /**
             * The default variant. Variant styles merge over base styles key by key, and Chakra's outline variant
             * sets the trigger's border and background, so the trigger's color states live here.
             */
            outline: {
                trigger: {
                    bg: "transparent",
                    borderColor: "border-strong-01",
                    _hover: {
                        borderColor: "border-strong-02",
                        bg: "tertiary/8",
                        _disabled: {
                            borderColor: "border-strong-01",
                            bg: "transparent",
                        },
                    },
                    _expanded: { borderColor: "border-strong-02" },
                    _focusVisible: {
                        borderColor: "tertiary",
                        outline: "none",
                    },
                },
            },
        },
    },
});
