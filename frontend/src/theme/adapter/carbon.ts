/**
 * IBM Carbon Theme Adapter
 *
 * Adapter that maps IBM Carbon design system tokens to CineXplorer's unified
 * theme vocabulary. Carbon provides the most complete token vocabulary of the
 * three systems, serving as the architectural inspiration for the unified layer.
 *
 * **Design System:** IBM Carbon v11
 * **Source Package:** @carbon/themes v11.0.0
 * **Documentation:** https://carbondesignsystem.com/elements/color/usage/
 *
 * **Elevation Strategy:** Layer progression
 * - Explicit layer system: background → layer-01 → layer-02 → layer-03
 * - Background color changes indicate elevation (minimal shadows)
 * - Each layer has corresponding border tokens for visibility
 *
 * **Border Philosophy:** Per-layer hierarchy
 * - Different border colors for different layers (maintain visibility)
 * - Provides border-subtle-00/02 and border-strong-01/02/03 officially
 * - This strategy was extended to Primer/Pajamas in unified adapter
 *
 * **Implementation Structure:**
 *
 * ```typescript
 * export function createCarbonAdapter(mode: "light" | "dark"): UnifiedTheme {
 *   // SECTION 1: Official Mappings (with corrections)
 *   // - Most complete: Carbon has layer-03, per-layer borders, interaction states
 *   // - Apply dark mode border corrections (invisible #393939 → #6f6f6f)
 *   // - Document official token sources
 *
 *   // SECTION 2: Derived Tokens (minimal for Carbon)
 *   // - Interaction states if missing (hover, selected, active per layer)
 *   // - Shadow tokens (Carbon uses minimal shadows, provide conservative values)
 *
 *   // SECTION 3: CineXplorer Extensions (app-specific)
 *   // - Apply centralized extensions (rating, badges)
 *   // - Adapt to Carbon's neutral, professional palette
 *
 *   return { ...official, ...derived, ...extensions };
 * }
 * ```
 *
 * **Key Corrections from Research:**
 * - Dark mode (G100) `border`: #6f6f6f (border-strong-01) NOT #393939 (invisible!)
 * - Dark mode `layer-03`: #525252 (gray-70) - add missing token
 * - Border hierarchy: Already provided by Carbon (minimal derivation needed)
 * - Shadows: Provide conservative values (Carbon relies on layers, not shadows)
 *
 * **Carbon's Layer System (G100 Dark):**
 * - background: #161616 (gray-100)
 * - layer-01: #262626 (gray-90)
 * - layer-02: #393939 (gray-80)
 * - layer-03: #525252 (gray-70)
 *
 * **Critical Dark Mode Border Issue:**
 * Current `border` (#393939) matches `layer-02` (#393939) = invisible borders!
 * Must use `border-strong-01` (#6f6f6f) for visibility.
 *
 * Related:
 * - Research: .arc/active/incidental/notes-theme-definition-semantic-corrections.md
 * - Task: Phase 2.2 (IBM Carbon per-theme migration)
 */

import type { UnifiedTheme } from "./types";
import { getShadowValues as _getShadowValues } from "./shadows";
import { createExtensions as _createExtensions } from "./extensions";
import {
	deriveBorderHierarchy as _deriveBorderHierarchy,
	deriveInteractionStates as _deriveInteractionStates,
	deriveLayer03 as _deriveLayer03,
} from "./utils";

/**
 * Create IBM Carbon theme adapter.
 *
 * **IMPLEMENTATION STATUS:** Skeleton only - Phase 2.2 will implement full mapping.
 *
 * @param _mode - Color mode (light or dark)
 * @returns UnifiedTheme with Carbon → unified token mappings
 */
export function createCarbonAdapter(_mode: "light" | "dark"): UnifiedTheme {
	// TODO (Phase 2.2): Implement IBM Carbon adapter
	// 1. Import palette: import { carbonLight, carbonDark } from "../palettes/ibm-carbon"
	// 2. Map official tokens with corrections (especially dark mode borders!)
	// 3. Derive minimal tokens (Carbon is most complete, needs least derivation)
	// 4. Apply CineXplorer extensions
	// 5. Return complete UnifiedTheme

	throw new Error(
		"IBM Carbon adapter not yet implemented. See Phase 2.2 in task list.",
	);
}
