import { defineSlotRecipe } from "@chakra-ui/react";

/**
 * Alert slot recipe implementing semantic status feedback patterns
 *
 * Multi-part component with slots:
 * - root: Container with opacity background and semantic border
 * - icon: Status icon with semantic color
 * - title: Emphasized text with semantic color
 * - description: Body text with foreground color for readability
 *
 * Status variants:
 * - success: Positive outcomes, confirmations (green)
 * - warning: Caution states, validation warnings (amber/yellow)
 * - destructive: Errors, critical alerts (red)
 * - info: Informational messages, neutral status (blue)
 *
 * Pattern: 10% opacity backgrounds with semantic borders
 * Status/subtle compound styles keep the themed tint and foreground root text
 * after Chakra's merged subtle variant.
 * - Title uses semantic color for emphasis
 * - Description uses foreground for maximum readability on subtle backgrounds
 * - Icon uses semantic color for visual emphasis
 */
export const alertRecipe = defineSlotRecipe({
    className: "alert",

    slots: ["root", "indicator", "title", "description"],

    base: {
        root: {
            // Foundation styles for all alert containers
            display: "flex",
            alignItems: "flex-start",
            gap: "3",
            p: "4",
            borderRadius: "md",
            borderWidth: "1px",
        },
        indicator: {
            // Icon/indicator sizing and alignment
            flexShrink: 0,
            mt: "0.5", // Align with first line of text
        },
        title: {
            // Title emphasis
            fontWeight: "semibold",
            fontSize: "md",
            lineHeight: "short",
        },
        description: {
            // Description readability
            fontSize: "sm",
            lineHeight: "normal",
            mt: "1",
        },
    },

    variants: {
        // Declare the inherited variant so compound styles are type-checked.
        variant: { subtle: {} },
        status: {
            /**
             * Success variant: Positive outcomes, confirmations
             * - 10% green background with green border
             * - Icon and title: success color (emphasis)
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
                description: {
                    color: "foreground",
                },
            },

            /**
             * Warning variant: Caution states, validation warnings
             * - 10% amber/yellow background with warning border
             * - Icon and title: warning color (emphasis)
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
                description: {
                    color: "foreground",
                },
            },

            /**
             * Error variant: Errors, critical alerts
             * - 10% red background with destructive border
             * - Icon and title: destructive color (emphasis)
             * - Description: foreground (readability on subtle background)
             *
             * Note: Uses "destructive" semantic token (matches our color system)
             * while exposing "error" variant name (matches Chakra's Alert.status prop)
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
                description: {
                    color: "foreground",
                },
            },

            /**
             * Info variant: Informational messages, neutral status
             * - 10% blue background with info border
             * - Icon and title: info color (emphasis)
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
                description: {
                    color: "foreground",
                },
            },
        },
    },

    compoundVariants: [
        {
            status: "success",
            variant: "subtle",
            css: { root: { bg: "success/10", color: "foreground" } },
        },
        {
            status: "warning",
            variant: "subtle",
            css: { root: { bg: "warning/10", color: "foreground" } },
        },
        {
            status: "error",
            variant: "subtle",
            css: { root: { bg: "destructive/10", color: "foreground" } },
        },
        {
            status: "info",
            variant: "subtle",
            css: { root: { bg: "info/10", color: "foreground" } },
        },
    ],

    defaultVariants: {
        status: "info",
    },
});
