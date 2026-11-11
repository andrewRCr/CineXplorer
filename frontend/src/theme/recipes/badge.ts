import { defineRecipe } from "@chakra-ui/react";

/**
 * Badge recipe implementing semantic status and categorization patterns
 *
 * Single-part component with semantic color pairs for solid backgrounds.
 *
 * Variants:
 * - success: Positive status (green) - bg: success, text: on-success
 * - warning: Caution status (amber/yellow) - bg: warning, text: on-warning
 * - error: Danger/error status (red) - bg: destructive, text: on-destructive
 * - info: Informational status (blue) - bg: info, text: on-info
 * - neutral: Non-semantic categorization (gray) - bg: badge, text: on-badge
 *
 * Pattern: Solid fill badges with on-* color pairs for high contrast
 * - Status badges use semantic colors (success, warning, destructive, info)
 * - Neutral badges use badge token for genre tags, content ratings, etc.
 *
 * Scores use MovieUserScore's outlined dot chip; only fewer than 10 TMDB votes
 * use the filled neutral badge, with a placeholder or vote-counted average.
 */
export const badgeRecipe = defineRecipe({
    className: "badge",

    base: {
        // Foundation styles for all badges
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "medium",
        fontSize: "xs",
        px: "2",
        py: "0.5",
        borderRadius: "sm",
        lineHeight: "1",
        whiteSpace: "nowrap",
    },

    variants: {
        variant: {
            /**
             * Success variant: Positive outcomes, active status
             * - Solid green background
             * - High contrast text (on-success)
             */
            success: {
                bg: "success",
                color: "on-success",
            },

            /**
             * Warning variant: Caution states, pending status
             * - Solid amber/yellow background
             * - High contrast text (on-warning)
             */
            warning: {
                bg: "warning",
                color: "on-warning",
            },

            /**
             * Error variant: Danger, deleted, error states
             * - Solid red background (destructive token)
             * - High contrast text (on-destructive)
             *
             * Note: Uses "destructive" semantic token (matches our color system)
             * while exposing "error" variant name (matches Chakra conventions)
             */
            error: {
                bg: "destructive",
                color: "on-destructive",
            },

            /**
             * Info variant: Informational, new, neutral status
             * - Solid blue background
             * - High contrast text (on-info)
             */
            info: {
                bg: "info",
                color: "on-info",
            },

            /**
             * Neutral variant: Non-semantic categorization
             * - Neutral gray background (badge token)
             * - High contrast text (on-badge - ADR-011 canonical naming)
             *
             * Use cases: Genre tags, content ratings (PG-13), years, TMDB scores below 10 votes,
             * non-semantic labels
             * Distinct from status colors which convey semantic meaning
             */
            neutral: {
                bg: "badge",
                color: "on-badge",
            },
        },
    },

    defaultVariants: {
        variant: "neutral",
    },
});
