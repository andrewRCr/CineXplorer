/**
 * Theme Definitions - Registry of All Available Themes
 *
 * This file consolidates all theme definitions for CineXplorer. Each theme is a
 * thin wrapper that references its corresponding adapter implementation.
 *
 * **Architecture:**
 * - Definitions (this file): Theme registry - what themes exist, metadata
 * - Adapters (adapters/*.ts): Theme implementations - how themes map tokens
 *
 * All themes use the UnifiedTheme interface (~67 tokens) providing consistent
 * cross-theme vocabulary for layer system, border hierarchy, shadows, and
 * interaction states.
 */

import type { Theme } from "../types";
import { createUnifiedTheme } from "./index";

/**
 * GitHub Primer Theme
 *
 * Provides neutral, professional aesthetic proven at massive scale.
 * Uses GitHub's official design system tokens.
 *
 * **Design Philosophy:**
 * - Neutral grays with subtle blue accents
 * - Heavy shadow use for elevation (shadow-first approach)
 * - Accessible contrast ratios throughout
 *
 * **Source:** https://primer.style
 */
export const githubTheme: Theme = {
    name: "github-primer",
    label: "GitHub Primer",
    lightUnified: createUnifiedTheme("github-primer", "light"),
    darkUnified: createUnifiedTheme("github-primer", "dark"),
} as const;

/**
 * IBM Carbon Theme
 *
 * Provides enterprise-grade design system with layer-based elevation.
 * Uses IBM's Carbon design system tokens.
 *
 * **Design Philosophy:**
 * - Layer color changes for elevation (minimal shadows)
 * - Strict gray palette with blue accents
 * - Accessibility-first design
 *
 * **Source:** https://carbondesignsystem.com
 * **Default Theme:** Carbon's layer philosophy guides CineXplorer's unified adapter architecture
 */
export const ibmCarbonTheme: Theme = {
    name: "ibm-carbon",
    label: "IBM Carbon",
    lightUnified: createUnifiedTheme("ibm-carbon", "light"),
    darkUnified: createUnifiedTheme("ibm-carbon", "dark"),
} as const;

/**
 * GitLab Pajamas Theme
 *
 * Provides clean, modern aesthetic with balanced shadows.
 * Uses GitLab's Pajamas design system tokens.
 *
 * **Design Philosophy:**
 * - Warm grays with purple/orange accents
 * - Moderate shadow use (balanced approach)
 * - Brand-aligned color hierarchy
 *
 * **Source:** https://design.gitlab.com
 */
export const gitlabPajamasTheme: Theme = {
    name: "gitlab-pajamas",
    label: "GitLab Pajamas",
    lightUnified: createUnifiedTheme("gitlab-pajamas", "light"),
    darkUnified: createUnifiedTheme("gitlab-pajamas", "dark"),
} as const;

/**
 * Material Design 3 Theme
 *
 * Provides vibrant, modern aesthetic following Google's M3 baseline.
 * Uses Material Design 3 baseline static palette.
 *
 * **Design Philosophy:**
 * - Vibrant purples with maroon accents
 * - 6-tier surface elevation system
 * - Dynamic color roles (primary/secondary/tertiary)
 *
 * **Architecture:** 3-tier color system
 * - Brand: Purple (Material's signature primary color)
 * - Primary: Purple (action buttons, same as brand)
 * - Tertiary: Maroon (contrasting accent for links/interactive text)
 *
 * **Source:** https://m3.material.io/styles/color/static/baseline
 */
export const materialDesign3Theme: Theme = {
    name: "material-design-3",
    label: "Material Design 3",
    lightUnified: createUnifiedTheme("material-design-3", "light"),
    darkUnified: createUnifiedTheme("material-design-3", "dark"),
} as const;
