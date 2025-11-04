/**
 * Token Derivation Utilities
 *
 * Helper functions for generating "unofficial" tokens from official design system
 * tokens. These utilities ensure consistent derivation logic across all theme adapters.
 *
 * **Derivation Categories:**
 * 1. **Border hierarchy:** Generate per-layer border tokens from base border colors
 * 2. **Interaction states:** Generate hover/selected/active states from layer colors
 * 3. **Layer system:** Derive missing layers for themes that don't provide all three
 *
 * **Design Philosophy:**
 * - Derivations follow design system principles (e.g., Carbon's progressive layering)
 * - Clearly marked as "unofficial" in adapter implementations
 * - Fallback behavior: Conservative, safe defaults if derivation can't be perfect
 *
 * Related: ADR-005 (Section: Derived Tokens for Consistency)
 */

/**
 * Lighten or darken a hex color by a percentage.
 *
 * **Usage:**
 * - Positive percentage: Lighten (add white)
 * - Negative percentage: Darken (add black)
 *
 * @param hex - Hex color code (with or without #)
 * @param percent - Percentage to lighten (+) or darken (-), range: -100 to 100
 * @returns Adjusted hex color
 *
 * @example
 * ```typescript
 * adjustColor("#393939", 20)  // Lighten by 20% → "#6f6f6f"
 * adjustColor("#ffffff", -10) // Darken by 10% → "#e6e6e6"
 * ```
 */
export function adjustColor(hex: string, percent: number): string {
	// Remove # if present
	hex = hex.replace("#", "");

	// Parse RGB
	const r = Number.parseInt(hex.substring(0, 2), 16);
	const g = Number.parseInt(hex.substring(2, 4), 16);
	const b = Number.parseInt(hex.substring(4, 6), 16);

	// Calculate adjustment
	const adjust = (value: number) => {
		const adjusted = percent > 0
			? value + ((255 - value) * percent) / 100 // Lighten
			: value + (value * percent) / 100; // Darken
		return Math.round(Math.max(0, Math.min(255, adjusted)));
	};

	// Apply adjustment
	const newR = adjust(r);
	const newG = adjust(g);
	const newB = adjust(b);

	// Convert back to hex
	const toHex = (value: number) => value.toString(16).padStart(2, "0");
	return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Derive border hierarchy tokens from a single base border color.
 *
 * **Strategy (inspired by IBM Carbon):**
 * - `border-subtle-00`: Base border (unchanged)
 * - `border-subtle-02`: Lightened border for layer-02 (maintain subtle aesthetic)
 * - `border-strong-01`: Darkened border for accessibility (WCAG 3:1 target)
 * - `border-strong-02`: Further darkened for layer-02 visibility
 * - `border-strong-03`: Most contrast for layer-03 visibility
 *
 * **Mode-specific adjustments:**
 * - Light mode: Darken for "strong" variants (more contrast)
 * - Dark mode: Lighten for "strong" variants (more contrast)
 *
 * @param baseBorder - Base border color from design system
 * @param mode - Color mode (affects adjustment direction)
 * @returns Complete border hierarchy
 *
 * @example
 * ```typescript
 * // GitHub Primer light mode
 * const borders = deriveBorderHierarchy("#d1d9e0", "light");
 * // Returns: {
 * //   subtle00: "#d1d9e0",   // Original
 * //   subtle02: "#c5cdd5",   // Darker for layer-02
 * //   strong01: "#818b98",   // Accessible
 * //   strong02: "#6b7580",   // More contrast
 * //   strong03: "#555f6b"    // Highest contrast
 * // }
 * ```
 */
export function deriveBorderHierarchy(
	baseBorder: string,
	mode: "light" | "dark",
): {
	subtle00: string;
	subtle02: string;
	strong01: string;
	strong02: string;
	strong03: string;
} {
	const adjustmentDirection = mode === "light" ? -1 : 1;

	return {
		subtle00: baseBorder, // Base (unchanged)
		subtle02: adjustColor(baseBorder, adjustmentDirection * 5), // Slightly more contrast for layer-02
		strong01: adjustColor(baseBorder, adjustmentDirection * 40), // Accessible (WCAG 3:1 target)
		strong02: adjustColor(baseBorder, adjustmentDirection * 50), // More contrast for layer-02
		strong03: adjustColor(baseBorder, adjustmentDirection * 60), // Highest contrast for layer-03
	};
}

/**
 * Derive interaction state colors from a base layer color.
 *
 * **Strategy (inspired by Material Design 3 state layers):**
 * - Hover: 8% adjustment (subtle)
 * - Selected: 12% adjustment (noticeable)
 * - Active: 16% adjustment (pronounced)
 *
 * **Mode-specific behavior:**
 * - Light mode: Darken on hover/interaction (common pattern)
 * - Dark mode: Lighten on hover/interaction (Material Design 3)
 *
 * @param layerColor - Base layer color
 * @param mode - Color mode (affects adjustment direction)
 * @returns Interaction states for the layer
 *
 * @example
 * ```typescript
 * // IBM Carbon layer-01 dark mode
 * const states = deriveInteractionStates("#262626", "dark");
 * // Returns: {
 * //   hover: "#2a2a2a",    // Lightened 8%
 * //   selected: "#2d2d2d", // Lightened 12%
 * //   active: "#303030"    // Lightened 16%
 * // }
 * ```
 */
export function deriveInteractionStates(
	layerColor: string,
	mode: "light" | "dark",
): {
	hover: string;
	selected: string;
	active: string;
} {
	const direction = mode === "light" ? -1 : 1;

	return {
		hover: adjustColor(layerColor, direction * 8),
		selected: adjustColor(layerColor, direction * 12),
		active: adjustColor(layerColor, direction * 16),
	};
}

/**
 * Derive layer-03 color when design system doesn't provide it.
 *
 * **Strategy:**
 * - For themes with layer progression (like Carbon): Continue the progression pattern
 * - For themes using shadows (like Primer): Use layer-02 value (shadows provide differentiation)
 *
 * **Progression calculation:**
 * - Light mode: `layer-03` = `layer-02` - (`layer-01` - `layer-02`)
 * - Dark mode: `layer-03` = `layer-02` + (`layer-02` - `layer-01`)
 *
 * @param layer01 - First layer color
 * @param layer02 - Second layer color
 * @param useShadows - Whether theme uses shadows for elevation (if true, returns layer-02)
 * @returns Derived layer-03 color
 *
 * @example
 * ```typescript
 * // GitHub Primer (shadow-based): Returns layer-02
 * const layer03 = deriveLayer03("#f6f8fa", "#ffffff", true);
 * // Returns: "#ffffff" (same as layer-02, shadows differentiate)
 *
 * // IBM Carbon (layer-based): Continues progression
 * const layer03 = deriveLayer03("#262626", "#393939", false);
 * // Returns: "#4c4c4c" (continues progression)
 * ```
 */
export function deriveLayer03(
	layer01: string,
	layer02: string,
	useShadows: boolean,
): string {
	if (useShadows) {
		// Shadow-based themes: layer-03 = layer-02 (shadows provide differentiation)
		return layer02;
	}

	// Layer-based themes: Continue progression
	// Calculate the difference between layer-01 and layer-02
	const parseHex = (hex: string) => {
		hex = hex.replace("#", "");
		return {
			r: Number.parseInt(hex.substring(0, 2), 16),
			g: Number.parseInt(hex.substring(2, 4), 16),
			b: Number.parseInt(hex.substring(4, 6), 16),
		};
	};

	const color1 = parseHex(layer01);
	const color2 = parseHex(layer02);

	// Calculate progression (double the difference)
	const r = Math.round(color2.r + (color2.r - color1.r));
	const g = Math.round(color2.g + (color2.g - color1.g));
	const b = Math.round(color2.b + (color2.b - color1.b));

	// Clamp to valid range
	const clamp = (value: number) => Math.max(0, Math.min(255, value));
	const toHex = (value: number) => value.toString(16).padStart(2, "0");

	return `#${toHex(clamp(r))}${toHex(clamp(g))}${toHex(clamp(b))}`;
}

/**
 * Check if a color is "light" (luminance > 0.5).
 *
 * Useful for determining whether to use light or dark text on a background.
 *
 * @param hex - Hex color code
 * @returns true if color is light, false if dark
 *
 * @example
 * ```typescript
 * isLightColor("#ffffff") // true
 * isLightColor("#000000") // false
 * isLightColor("#808080") // true (borderline, but > 0.5)
 * ```
 */
export function isLightColor(hex: string): boolean {
	hex = hex.replace("#", "");
	const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
	const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
	const b = Number.parseInt(hex.substring(4, 6), 16) / 255;

	// Calculate relative luminance (ITU-R BT.709)
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.5;
}
