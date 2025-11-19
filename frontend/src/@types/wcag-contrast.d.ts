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
	 * @param fg - Foreground color (hex format: #RRGGBB)
	 * @param bg - Background color (hex format: #RRGGBB)
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
	 * Calculate relative luminance of an RGB color
	 */
	export function luminance(rgb: [number, number, number]): number;

	/**
	 * Get WCAG score level for a contrast ratio
	 * @returns "AAA", "AA", "AA18", "DNP" (Does Not Pass)
	 */
	export function score(ratio: number): string;
}
