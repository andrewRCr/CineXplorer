/**
 * Type declarations for wcag-contrast
 *
 * The wcag-contrast library doesn't ship with TypeScript types.
 * This provides minimal type declarations for our usage.
 *
 * Package: wcag-contrast@3.0.0
 * Repository: https://github.com/tmcw/wcag-contrast
 */

declare module "wcag-contrast" {
    /**
     * Calculate WCAG contrast ratio between two hex colors
     * @param fg - Foreground hex color, with an optional # prefix
     * @param bg - Background hex color, with an optional # prefix
     * @returns Contrast ratio (e.g., 4.52 for 4.52:1)
     */
    export function hex(fg: string, bg: string): number;

    /**
     * Calculate WCAG contrast ratio between two RGB colors
     */
    export function rgb(
        fg: [number, number, number],
        bg: [number, number, number],
    ): number;

    /**
     * Calculate WCAG contrast ratio between two relative luminance values
     * @param a - First relative luminance value (0 to 1)
     * @param b - Second relative luminance value (0 to 1)
     * @returns Contrast ratio (e.g., 4.52 for 4.52:1)
     */
    export function luminance(a: number, b: number): number;

    /**
     * Get WCAG score level for a contrast ratio
     * @returns "AAA", "AA", "AA Large", or "Fail"
     */
    export function score(ratio: number): "AAA" | "AA" | "AA Large" | "Fail";
}
