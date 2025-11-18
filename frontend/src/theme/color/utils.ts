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
 * Derive complete border hierarchy from base subtle and strong border colors.
 *
 * **Pattern Selection:**
 *
 * - `alternating` (2-tier): Light mode with alternating layer pattern (ADR-008)
 *   - Returns same values for all layers (2 distinct colors total)
 *   - Use when: Light mode where layers alternate (white ↔ gray ↔ white) per
 *     Carbon's architectural pattern adopted project-wide
 *   - Rationale: Same border visible on both white and gray backgrounds,
 *     no per-layer adjustment needed
 *
 * - `progressive` (5-tier): Dark mode with progressive layer lightening (ADR-008)
 *   - Returns distinct values per layer (5 distinct colors total)
 *   - Use when: Dark mode where layers progressively lighten (darker → lighter)
 *     per Carbon's architectural pattern adopted project-wide
 *   - Rationale: Each layer lighter than previous, borders must lighten too
 *     to maintain visibility on progressively lighter backgrounds
 *
 * **Design Philosophy:**
 * Follows IBM Carbon's architectural pattern where border complexity matches
 * layer elevation strategy. The alternating layer pattern (adopted project-wide
 * for light mode in ADR-008) doesn't require per-layer border adjustments, while
 * the progressive layer pattern (used for dark mode) requires borders to adjust
 * per layer for consistent visibility.
 *
 * **Delta Matching:**
 * Progressive mode uses Carbon's official deltas (compound adjustments):
 * - subtle-00 → subtle-02: +12.6% lightening
 * - strong-01 → strong-02: +20.8% lightening
 * - strong-02 → strong-03: +23.7% lightening (compound)
 *
 * @param baseSubtle - Subtle border color from design system
 * @param baseStrong - Strong/emphasis border color from design system
 * @param pattern - 'alternating' (light/2-tier) or 'progressive' (dark/5-tier)
 * @returns Complete 5-token border hierarchy
 *
 * @see ADR-008 (Adopt Carbon Light Alternating Layers)
 * @see strategy-border-system.md (Border Color Hierarchy section)
 *
 * @example
 * ```typescript
 * // Primer Light (alternating layer pattern)
 * const borders = deriveBorderHierarchy('#d1d9e0', '#818b98', 'alternating');
 * // Returns: All subtle tokens = #d1d9e0, all strong tokens = #818b98
 * ```
 *
 * @example
 * ```typescript
 * // Primer Dark (progressive layer pattern)
 * const borders = deriveBorderHierarchy('#30363d', '#656c76', 'progressive');
 * // Returns: 5 distinct values with Carbon-matched progression
 * ```
 */
export function deriveBorderHierarchy(
    baseSubtle: string,
    baseStrong: string,
    pattern: "alternating" | "progressive",
): {
    subtle00: string;
    subtle02: string;
    strong01: string;
    strong02: string;
    strong03: string;
} {
    if (pattern === "alternating") {
        // 2-tier system: All layers use same border values
        // Works because alternating layer pattern (white ↔ gray) means
        // same border is visible on both backgrounds
        return {
            subtle00: baseSubtle,
            subtle02: baseSubtle, // Same as 00
            strong01: baseStrong,
            strong02: baseStrong, // Same as 01
            strong03: baseStrong, // Same as 01
        };
    }

    // 5-tier system: Progressive lightening per layer
    // Each layer is lighter than previous, borders must lighten too
    // to maintain visibility. Uses Carbon's official deltas (compound).
    const strong02 = adjustColor(baseStrong, 20.8);
    return {
        subtle00: baseSubtle,
        subtle02: adjustColor(baseSubtle, 12.6), // Carbon delta
        strong01: baseStrong,
        strong02: strong02, // Carbon delta
        strong03: adjustColor(strong02, 23.7), // Compound adjustment
    };
}

/**
 * Blend two colors using opacity overlay calculation.
 *
 * Implements Material Design 3's state layer approach where foreground
 * color is overlaid at specified opacity on base layer color.
 *
 * Formula: (1 - opacity) * baseRGB + opacity * overlayRGB
 *
 * @param baseColor - Base layer hex color (e.g., "#f4f4f4")
 * @param overlayColor - Foreground hex color to overlay (e.g., "#161616")
 * @param opacity - Overlay opacity (0.0 to 1.0, e.g., 0.08 for 8%)
 * @returns Blended hex color
 *
 * @example
 * ```typescript
 * // Carbon light mode hover
 * blendColors("#f4f4f4", "#161616", 0.08)
 * // Returns: "#e2e2e2" (layer-01 with 8% foreground overlay)
 * ```
 */
export function blendColors(
    baseColor: string,
    overlayColor: string,
    opacity: number,
): string {
    // Remove # if present
    const base = baseColor.replace("#", "");
    const overlay = overlayColor.replace("#", "");

    // Parse RGB values
    const baseR = Number.parseInt(base.substring(0, 2), 16);
    const baseG = Number.parseInt(base.substring(2, 4), 16);
    const baseB = Number.parseInt(base.substring(4, 6), 16);

    const overlayR = Number.parseInt(overlay.substring(0, 2), 16);
    const overlayG = Number.parseInt(overlay.substring(2, 4), 16);
    const overlayB = Number.parseInt(overlay.substring(4, 6), 16);

    // Apply opacity overlay formula
    const blendedR = Math.round((1 - opacity) * baseR + opacity * overlayR);
    const blendedG = Math.round((1 - opacity) * baseG + opacity * overlayG);
    const blendedB = Math.round((1 - opacity) * baseB + opacity * overlayB);

    // Convert back to hex
    const toHex = (value: number) => value.toString(16).padStart(2, "0");
    return `#${toHex(blendedR)}${toHex(blendedG)}${toHex(blendedB)}`;
}

/**
 * Derive interaction state colors using improved opacity overlay approach.
 *
 * Per ADR-009 and ADR-016, all themes use universal opacity overlay calculation for consistency
 * across themes and compatibility with ADR-008's alternating layer pattern.
 *
 * Overlay percentages improved from Material Design 3 defaults (8%/10%/10%) to (12%/16%/16%)
 * for better contrast and visibility across theme combinations. Selected = active maintains
 * MD3's semantic equivalence (focus = press).
 *
 * @param layerColor - Base layer color (e.g., "#f4f4f4" for layer-01)
 * @param foregroundColor - Theme foreground color (e.g., "#161616" in light mode)
 * @returns Interaction states with opacity overlays applied
 *
 * @example
 * ```typescript
 * // IBM Carbon light mode
 * deriveInteractionStates("#f4f4f4", "#161616")
 * // Returns:
 * // {
 * //   hover: "#dbdbdb",    // 12% foreground overlay (improved from MD3's 8%)
 * //   selected: "#cecece", // 16% foreground overlay (improved from MD3's 10%, equals active)
 * //   active: "#cecece"    // 16% foreground overlay (improved from MD3's 10%, equals selected)
 * // }
 * ```
 */
export function deriveInteractionStates(
    layerColor: string,
    foregroundColor: string,
): {
    hover: string;
    selected: string;
    active: string;
} {
    return {
        hover: blendColors(layerColor, foregroundColor, 0.12),      // 12% overlay (improved from MD3's 8% for better contrast)
        selected: blendColors(layerColor, foregroundColor, 0.16),   // 16% overlay (improved from MD3's 10%, aligns with active per ADR-016)
        active: blendColors(layerColor, foregroundColor, 0.16),     // 16% overlay (improved from MD3's 10%, aligns with selected per ADR-016)
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
