/**
 * Shadow Value Definitions Per Design System
 *
 * Provides shadow values for the three elevation levels (sm, md, lg) based on
 * each design system's official tokens or recommended values.
 *
 * **Design System Strategies:**
 * - **GitHub Primer:** Heavy shadow usage for elevation (official shadow tokens)
 * - **IBM Carbon:** Minimal shadow usage, prefers layer color changes (light shadows optional)
 * - **GitLab Pajamas:** Shadow-based elevation (official gl-shadow utilities)
 *
 * **Source Documentation:**
 * - GitHub Primer: @primer/primitives v8.x shadow tokens
 * - IBM Carbon: Carbon Design System elevation guidance
 * - GitLab Pajamas: design.gitlab.com elevation system
 */

/**
 * Shadow values for a single theme/mode combination.
 */
export interface ShadowValues {
    /** Small shadow for subtle elevation (cards) */
    sm: string;
    /** Medium shadow for moderate elevation (popovers, dropdowns) */
    md: string;
    /** Large shadow for high elevation (modals, overlays) */
    lg: string;
}

/**
 * GitHub Primer shadow values (official tokens from @primer/primitives v8.x).
 *
 * Primer uses shadows heavily for elevation differentiation. All surfaces typically
 * use bgColor-default with varying shadow levels for depth.
 *
 * **Light Mode:**
 * - Shadows use gray-ish rgba values with low opacity
 * - Progressive depth: subtle → card → modal
 *
 * **Dark Mode:**
 * - Similar shadow structure adapted for dark backgrounds
 * - Slightly higher opacity for visibility
 */
export const primerShadows = {
    light: {
        sm: "0 1px 0 rgba(27, 31, 36, 0.04)",
        md: "0 3px 6px rgba(140, 149, 159, 0.15)",
        lg: "0 8px 24px rgba(140, 149, 159, 0.2)",
    },
    dark: {
        sm: "0 1px 0 rgba(0, 0, 0, 0.12)",
        md: "0 3px 6px rgba(0, 0, 0, 0.25)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.4)",
    },
} as const;

/**
 * IBM Carbon shadow values (minimal, optional usage).
 *
 * Carbon prefers layer color progression (layer-01 → layer-02 → layer-03) over shadows.
 * Shadows are used sparingly, mainly for tooltips and floating elements.
 *
 * **Philosophy:** "Let the layers do the work" - color changes indicate elevation.
 *
 * **Light Mode:**
 * - Very subtle shadows if used
 * - Most elevation communicated through background color changes
 *
 * **Dark Mode:**
 * - Extremely subtle or no shadows
 * - Layer progression provides sufficient visual hierarchy
 *
 * **Note:** These values are conservative. Carbon components often use no shadow at all,
 * relying entirely on layer color differentiation.
 */
export const carbonShadows = {
    light: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
        md: "0 2px 4px rgba(0, 0, 0, 0.08)",
        lg: "0 4px 8px rgba(0, 0, 0, 0.12)",
    },
    dark: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.08)",
        md: "0 2px 4px rgba(0, 0, 0, 0.12)",
        lg: "0 4px 8px rgba(0, 0, 0, 0.16)",
    },
} as const;

/**
 * GitLab Pajamas shadow values (official gl-shadow utilities).
 *
 * Pajamas uses shadows for elevation similar to Primer. Components like cards use
 * gl-shadow-sm, modals use gl-shadow-lg.
 *
 * **Light Mode:**
 * - Clean, subtle shadows
 * - Balanced depth without being too heavy
 *
 * **Dark Mode:**
 * - Increased opacity for visibility against dark backgrounds
 * - Similar structure to light mode with adjusted values
 *
 * **Source:** design.gitlab.com elevation documentation, gitlab-ui component library
 */
export const pajamasShadows = {
    light: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.12)",
        md: "0 2px 8px rgba(0, 0, 0, 0.15)",
        lg: "0 4px 16px rgba(0, 0, 0, 0.2)",
    },
    dark: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.16)",
        md: "0 2px 8px rgba(0, 0, 0, 0.24)",
        lg: "0 4px 16px rgba(0, 0, 0, 0.32)",
    },
} as const;

/**
 * Get shadow values for a specific design system.
 *
 * @param designSystem - Design system identifier (uses ThemeName from index.ts)
 * @param mode - Color mode (light or dark)
 * @returns Shadow values for the specified system and mode
 * @throws Error if designSystem is not recognized (exhaustiveness check)
 *
 * **Note:** Material Design 3 shadows not yet implemented - falls back to GitHub Primer.
 */
export function getShadowValues(
    designSystem:
        "github-primer" | "ibm-carbon" | "gitlab-pajamas" | "material-design-3",
    mode: "light" | "dark",
): ShadowValues {
    switch (designSystem) {
        case "github-primer":
            return primerShadows[mode];
        case "ibm-carbon":
            return carbonShadows[mode];
        case "gitlab-pajamas":
            return pajamasShadows[mode];
        case "material-design-3":
            // Material Design 3 uses Primer shadows (design system preference)
            // Material's native elevation system intentionally not implemented
            return primerShadows[mode];
        default: {
            // Exhaustiveness check: TypeScript will error if a case is missing
            const _exhaustiveCheck: never = designSystem;
            throw new Error(
                `Unhandled design system: ${String(_exhaustiveCheck)}`,
            );
        }
    }
}
