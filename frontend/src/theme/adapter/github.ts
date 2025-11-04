/**
 * GitHub Primer Theme Adapter
 *
 * Adapter that maps GitHub Primer design system tokens to CineXplorer's unified
 * theme vocabulary. Provides consistent ~47-token interface while preserving
 * Primer's visual character and design principles.
 *
 * **Design System:** GitHub Primer
 * **Source Package:** @primer/primitives v8.x
 * **Documentation:** https://primer.style/design/foundations/color
 *
 * **Elevation Strategy:** Shadow-based
 * - All surfaces use bgColor-default (same background color)
 * - Elevation differentiated via shadows (shadow-sm, shadow-md, shadow-lg)
 * - Minimal background color changes for depth
 *
 * **Border Philosophy:** Intentionally subtle
 * - Default borders may not meet WCAG 3:1 (compensated by shadows, spacing)
 * - Provides borderColor-emphasis for accessibility-critical contexts
 *
 * **Implementation Structure:**
 *
 * ```typescript
 * export function createGithubAdapter(mode: "light" | "dark"): UnifiedTheme {
 *   // SECTION 1: Official Mappings (with corrections)
 *   // - Map Primer tokens → unified vocabulary
 *   // - Apply research-discovered corrections
 *   // - Document source tokens
 *
 *   // SECTION 2: Derived Tokens (unofficial, for consistency)
 *   // - Generate per-layer border tokens (Primer lacks these)
 *   // - Derive interaction states (hover, selected, active)
 *   // - Clearly mark as "unofficial" with derivation rationale
 *
 *   // SECTION 3: CineXplorer Extensions (app-specific)
 *   // - Apply centralized extensions (rating, badges)
 *   // - Adapt to Primer's color palette character
 *
 *   return { ...official, ...derived, ...extensions };
 * }
 * ```
 *
 * **Key Corrections from Research:**
 * - Light mode `card`: bgColor-muted (#f6f8fa) NOT bgColor-default for differentiation
 * - Light mode `layer-02`: bgColor-default (#ffffff) + shadow-lg NOT bg_emphasis (blue)
 * - Dark mode `card`: Consider bgColor-muted (#151b23) vs current bg_inset (#010409)
 * - Border hierarchy: Derive from borderColor-default/emphasis tokens
 *
 * Related:
 * - Research: .arc/active/incidental/notes-theme-definition-semantic-corrections.md
 * - Task: Phase 2.1 (GitHub Primer per-theme migration)
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
 * Create GitHub Primer theme adapter.
 *
 * **IMPLEMENTATION STATUS:** Skeleton only - Phase 2.1 will implement full mapping.
 *
 * @param _mode - Color mode (light or dark)
 * @returns UnifiedTheme with Primer → unified token mappings
 */
export function createGithubAdapter(_mode: "light" | "dark"): UnifiedTheme {
	// TODO (Phase 2.1): Implement GitHub Primer adapter
	// 1. Import palette: import { githubPaletteLight, githubPaletteDark } from "../palettes/github"
	// 2. Map official tokens with corrections
	// 3. Derive unofficial tokens (border hierarchy, interaction states, layer-03)
	// 4. Apply CineXplorer extensions
	// 5. Return complete UnifiedTheme

	throw new Error(
		"GitHub Primer adapter not yet implemented. See Phase 2.1 in task list.",
	);
}
