import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Toast slot recipe implementing semantic status feedback patterns
 *
 * Multi-part component with slots:
 * - root: Container with layer background, border, and shadow
 * - indicator: Status icon with semantic color
 * - title: Emphasized text with semantic color
 * - description: Body text with foreground color for readability
 * - actionTrigger: Action button (e.g., "Undo") with tertiary styling
 * - closeTrigger: Dismiss button with subtle styling
 *
 * Status variants:
 * - success: Positive outcomes, confirmations (green)
 * - warning: Caution states, validation warnings (amber/yellow)
 * - error: Errors, critical alerts (red)
 * - info: Informational messages, neutral status (blue)
 * - loading: Async operations in progress (uses info styling)
 *
 * Pattern: 10% opacity backgrounds with semantic borders (matches alert recipe)
 * - Title uses semantic color for emphasis
 * - Description uses foreground for maximum readability on subtle backgrounds
 * - Indicator uses semantic color for visual emphasis
 */
export const toastRecipe = defineSlotRecipe({
    className: "toast",

    slots: [
        "root",
        "indicator",
        "title",
        "description",
        "actionTrigger",
        "closeTrigger",
    ],

    base: {
        root: {
            // Foundation styles for all toast containers
            display: "flex",
            alignItems: "flex-start",
            gap: "3",
            p: "4",
            borderRadius: "md",
            borderWidth: "1px",
            boxShadow: "shadow-md",
            // Layer-02 background for elevation (toasts float above content)
            bg: "layer-02",
            borderColor: "border-strong-02",
            minW: "xs",
            maxW: "sm",
        },
        indicator: {
            // Icon/indicator sizing and alignment
            flexShrink: 0,
            mt: "0.5", // Align with first line of text
        },
        title: {
            // Title emphasis
            fontWeight: "semibold",
            fontSize: "sm",
            lineHeight: "short",
        },
        description: {
            // Description readability
            fontSize: "sm",
            lineHeight: "normal",
            color: "foreground",
        },
        actionTrigger: {
            // Action button (e.g., "Undo")
            flexShrink: 0,
            color: "tertiary",
            fontWeight: "medium",
            fontSize: "sm",
            cursor: "pointer",
            _hover: {
                color: "tertiary-hover",
            },
        },
        closeTrigger: {
            // Dismiss button
            flexShrink: 0,
            color: "on-muted",
            cursor: "pointer",
            p: "1",
            borderRadius: "sm",
            _hover: {
                bg: "layer-hover-02",
                color: "foreground",
            },
        },
    },

    variants: {
        status: {
            /**
             * Success variant: Positive outcomes, confirmations
             * - 10% green background with green border
             * - Indicator and title: success color (emphasis)
             * - Description: foreground (readability on subtle background)
             */
            success: {
                root: {
                    bg: "success/10",
                    borderColor: "success",
                },
                indicator: {
                    color: "success",
                },
                title: {
                    color: "success",
                },
            },

            /**
             * Warning variant: Caution states, validation warnings
             * - 10% amber/yellow background with warning border
             * - Indicator and title: warning color (emphasis)
             * - Description: foreground (readability on subtle background)
             */
            warning: {
                root: {
                    bg: "warning/10",
                    borderColor: "warning",
                },
                indicator: {
                    color: "warning",
                },
                title: {
                    color: "warning",
                },
            },

            /**
             * Error variant: Errors, critical alerts
             * - 10% red background with destructive border
             * - Indicator and title: destructive color (emphasis)
             * - Description: foreground (readability on subtle background)
             *
             * Note: Uses "destructive" semantic token (matches our color system)
             * while exposing "error" variant name (matches Chakra's toast type prop)
             */
            error: {
                root: {
                    bg: "destructive/10",
                    borderColor: "destructive",
                },
                indicator: {
                    color: "destructive",
                },
                title: {
                    color: "destructive",
                },
            },

            /**
             * Info variant: Informational messages, neutral status
             * - 10% blue background with info border
             * - Indicator and title: info color (emphasis)
             * - Description: foreground (readability on subtle background)
             */
            info: {
                root: {
                    bg: "info/10",
                    borderColor: "info",
                },
                indicator: {
                    color: "info",
                },
                title: {
                    color: "info",
                },
            },

            /**
             * Loading variant: Async operations in progress
             * - Uses info styling for consistency
             * - Spinner replaces indicator in toaster composition
             */
            loading: {
                root: {
                    bg: "info/10",
                    borderColor: "info",
                },
                indicator: {
                    color: "info",
                },
                title: {
                    color: "info",
                },
            },
        },
    },

    defaultVariants: {
        status: "info",
    },
});
