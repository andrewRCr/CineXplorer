/**
 * GitLab Pajamas Theme Adapter
 *
 * Adapter that maps GitLab Pajamas design system tokens to CineXplorer's unified
 * theme vocabulary. Combines semantic section tokens with shadow-based elevation.
 *
 * **Design System:** GitLab Pajamas
 * **Source:** gitlab-ui component library, Pajamas design tokens
 * **Documentation:** https://design.gitlab.com/product-foundations/color/
 *
 * **Elevation Strategy:** Hybrid (sections + shadows)
 * - Semantic section tokens for cards (background.color.section)
 * - Shadow-based elevation for overlays (gl-shadow-sm/lg)
 * - Combines structural semantics with visual depth cues
 *
 * **Border Philosophy:** Intentionally subtle with "partial support"
 * - Acknowledges WCAG non-text contrast "partial support" openly
 * - Uses subtle borders aesthetically, provides stronger variants
 * - Compensating cues: shadows, spacing, section differentiation
 *
 * **Implementation Structure:**
 *
 * ```typescript
 * export function createPajamasAdapter(mode: "light" | "dark"): UnifiedTheme {
 *   // SECTION 1: Official Mappings (with corrections)
 *   // - Card: background.color.section (neutral-50) NOT neutral-10
 *   // - Elevated surfaces: background.color.default with shadows
 *   // - Borders: Use neutral-200/300 for better contrast
 *
 *   // SECTION 2: Derived Tokens (unofficial, for consistency)
 *   // - Per-layer border hierarchy (Pajamas lacks this, derive from neutral scale)
 *   // - Interaction states (hover, selected, active per layer)
 *   // - layer-03 (derive from layer-02, shadows differentiate)
 *
 *   // SECTION 3: CineXplorer Extensions (app-specific)
 *   // - Apply centralized extensions (rating, badges)
 *   // - Adapt to Pajamas' clean, semantic palette
 *
 *   return { ...official, ...derived, ...extensions };
 * }
 * ```
 *
 * **Key Corrections from Research:**
 * - Light mode `card`: neutral-50 (#ececef) NOT neutral-10 (#fbfafd) - "noticeable difference"
 * - Light mode `layer-02`: neutral-0 (#ffffff) + shadow NOT neutral-800 (emphasis token)
 * - Light mode `border`: neutral-200 (#bfbfc3) or neutral-300 (#a4a3a8) for better contrast
 * - Dark mode `border`: neutral-600 (#626168) NOT neutral-700 (#4c4b51) - visibility
 *
 * **Card Differentiation Requirements:**
 * GitLab docs explicitly state: "Each combination has a **noticeable difference**
 * between the border and background." Current neutral-10 (1.02:1) fails this.
 * Use neutral-50 for proper card/background distinction.
 *
 * **Contrast Analysis:**
 * - Light border: neutral-100 (#dcdcde) = 1.17:1 ❌ → neutral-200 (#bfbfc3) = ~2.1:1 ⚠️
 * - Dark border: neutral-700 (#4c4b51) = 1.44:1 ❌ → neutral-600 (#626168) = ~2.1:1 ⚠️
 * - Note: Still subtle (below WCAG 3:1), but aligned with Pajamas' "partial support" stance
 *
 * Related:
 * - Research: .arc/active/incidental/notes-theme-definition-semantic-corrections.md
 * - Task: Phase 2.3 (GitLab Pajamas per-theme migration)
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
 * Create GitLab Pajamas theme adapter.
 *
 * **IMPLEMENTATION STATUS:** Skeleton only - Phase 2.3 will implement full mapping.
 *
 * @param _mode - Color mode (light or dark)
 * @returns UnifiedTheme with Pajamas → unified token mappings
 */
export function createPajamasAdapter(_mode: "light" | "dark"): UnifiedTheme {
	// TODO (Phase 2.3): Implement GitLab Pajamas adapter
	// 1. Import palette: import { pajamasLight, pajamasDark } from "../palettes/gitlab-pajamas"
	// 2. Map official tokens with corrections (card, borders)
	// 3. Derive unofficial tokens (border hierarchy, interaction states, layer-03)
	// 4. Apply CineXplorer extensions
	// 5. Return complete UnifiedTheme

	console.error("GitLab Pajamas adapter not yet implemented. See Phase 2.3 in task list.");

	// TEMP: Return stub to satisfy TypeScript. Will throw at runtime if called.
	return {} as UnifiedTheme;
}
