import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Tooltip slot recipe implementing semantic token styling
 *
 * Uses popover/on-popover tokens per strategy-color-tokens.md.
 * Arrow included by default for visual clarity.
 *
 * Slots:
 * - content: Main tooltip body with background, text color, shadow
 * - arrow: Arrow container
 * - arrowTip: Arrow tip (inherits background from content)
 * - positioner: Positioning wrapper (no custom styles needed)
 * - trigger: Trigger element wrapper (no custom styles needed)
 */
export const tooltipRecipe = defineSlotRecipe({
  className: "tooltip",
  slots: ["content", "arrow", "arrowTip", "positioner", "trigger"],

  base: {
    content: {
      bg: "popover",
      color: "on-popover",
      px: "3",
      py: "1.5",
      borderRadius: "md",
      fontSize: "sm",
      fontWeight: "medium",
      boxShadow: "shadow-md",
      zIndex: "dropdown",
      // Smooth entrance animation (keyframes provided by Chakra UI v3 defaultConfig)
      _open: {
        animationName: "fade-in, scale-in",
        animationDuration: "100ms",
      },
      _closed: {
        animationName: "fade-out, scale-out",
        animationDuration: "100ms",
      },
    },
    arrow: {
      // Arrow inherits background from content via CSS variable
      "--arrow-background": "colors.popover",
    },
    arrowTip: {
      borderTopWidth: "1px",
      borderLeftWidth: "1px",
      borderColor: "transparent",
    },
    positioner: {},
    trigger: {},
  },
});
