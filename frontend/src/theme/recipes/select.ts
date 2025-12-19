import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Select slot recipe implementing dropdown/select control patterns
 *
 * Slots:
 * - trigger: The button that opens the dropdown (button-like styling)
 * - content: The dropdown container (elevated surface)
 * - item: Individual option items (with selected/hover states)
 *
 * Pattern:
 * - Trigger uses button-like border hierarchy (border-strong-01 → border-strong-02)
 * - Keyboard-only focus ring (ring token)
 * - Content uses muted background for elevation
 * - Items use tertiary tokens for selection/hover states
 *
 * Note: Item selected state requires runtime conditionals in components
 * (recipe provides base styles, components apply bg/color based on isSelected logic)
 */
export const selectRecipe = defineSlotRecipe({
    className: "select",

    slots: ["trigger", "content", "item"],

    base: {
        /**
         * Trigger: Select control that opens dropdown
         * - Border hierarchy: border-strong-01 (default) → border-strong-02 (hover) → tertiary (focus)
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
            borderColor: "border-strong-01",
            bg: "background",
            color: "foreground",
            borderRadius: "md",
            transition: "all 0.2s",
            cursor: "pointer",
            _hover: {
                borderColor: "border-strong-02",
                bg: "tertiary/8",
                _disabled: {
                    borderColor: "border-strong-01",
                    bg: "background",
                },
            },
            _disabled: {
                opacity: 0.4,
                cursor: "not-allowed",
            },
            _focusVisible: {
                borderColor: "tertiary",
                outline: "none",
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
            boxShadow: "md",
        },

        /**
         * Item: Individual option in dropdown
         * - Base transparent background
         * - Selected state uses tertiary + on-tertiary
         * - Highlight/hover uses tertiary/12
         */
        item: {
            cursor: "pointer",
            transition: "all 0.15s",
            borderRadius: "sm",
            _hover: {
                bg: "tertiary/12",
            },
            _highlighted: {
                bg: "tertiary/12",
            },
            _checked: {
                bg: "tertiary",
                color: "on-tertiary",
                _hover: {
                    bg: "tertiary",
                    color: "on-tertiary",
                },
                _highlighted: {
                    bg: "tertiary",
                    color: "on-tertiary",
                },
            },
        },
    },
});
