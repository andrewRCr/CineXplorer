/**
 * Year Filter Analysis Utility
 *
 * Centralizes all year filter logic for QuickBrowseBar preset detection,
 * advanced filter indication, and display value calculation.
 *
 * Used by:
 * - ConnectedDropdowns (display state, disabled state)
 * - useMovieCollectionState (hasAdvancedFilterValues, getAdvancedFilterHash)
 */

import { yearOptions } from "@/constants/browseOptions";

/**
 * Complete analysis of a year filter configuration
 */
export interface YearFilterAnalysis {
  /** No year filter is set */
  isEmpty: boolean;
  /** Only minYear or only maxYear is set (not both) */
  isSingleValue: boolean;
  /** Both min and max are set to the same year (e.g., 2024-2024) */
  isSameYear: boolean;
  /** 9-year span ending in 0 (e.g., 1980-1989) */
  isDecadeRange: boolean;
  /** Whether the current filter matches a QuickBrowseBar preset */
  isInPresets: boolean;
  /** Value for the dropdown Select: year, decade with apostrophe, "custom", or "" */
  displayValue: string;
  /** Label to show in UI (may differ from displayValue for custom items, e.g., "1940's" vs "custom") */
  displayLabel: string;
}

/**
 * Analyze a year filter configuration to determine its type and preset status
 */
export function analyzeYearFilter(minYear: string, maxYear: string): YearFilterAnalysis {
  const hasMin = !!minYear;
  const hasMax = !!maxYear;
  const isEmpty = !hasMin && !hasMax;

  if (isEmpty) {
    return {
      isEmpty: true,
      isSingleValue: false,
      isSameYear: false,
      isDecadeRange: false,
      isInPresets: true, // Empty is effectively "Any Year" which is a preset
      displayValue: "",
      displayLabel: "",
    };
  }

  const isSingleValue = (hasMin && !hasMax) || (!hasMin && hasMax);
  const isSameYear = hasMin && hasMax && minYear === maxYear;

  // Decade range: 9-year span where minYear ends in 0 (e.g., 1980-1989)
  const isDecadeRange = hasMin && hasMax &&
    parseInt(maxYear) - parseInt(minYear) === 9 &&
    minYear.endsWith("0");

  // Determine display value, label, and preset status
  let displayValue = "";
  let displayLabel = "";
  let isInPresets = false;

  if (isSingleValue) {
    const singleValue = minYear || maxYear;
    isInPresets = yearOptions.some(opt => opt.value === singleValue);
    displayValue = isInPresets ? singleValue : "custom";
    displayLabel = singleValue; // Always show the actual year
  } else if (isSameYear) {
    displayValue = minYear;
    displayLabel = minYear;
    isInPresets = yearOptions.some(opt => opt.value === minYear);
  } else if (isDecadeRange) {
    const decadeValue = `${minYear.slice(0, 4)}'s`;
    isInPresets = yearOptions.some(opt => opt.value === decadeValue);
    displayValue = isInPresets ? decadeValue : "custom";
    displayLabel = decadeValue; // Always show the decade (e.g., "1940's")
  } else {
    // Arbitrary range (not a decade)
    displayValue = "custom";
    displayLabel = "Custom";
    isInPresets = false;
  }

  return {
    isEmpty,
    isSingleValue,
    isSameYear,
    isDecadeRange,
    isInPresets,
    displayValue,
    displayLabel,
  };
}

/**
 * Check if a year filter should show as "Custom" (disabled dropdown, italic text)
 *
 * True when: year filter is set AND not matching a QuickBrowseBar preset
 * (excludes same-year selections which are selectable via dropdown)
 */
export function isYearFilterCustom(minYear: string, maxYear: string): boolean {
  const analysis = analyzeYearFilter(minYear, maxYear);
  return !analysis.isEmpty && !analysis.isInPresets && !analysis.isSameYear;
}

/**
 * Check if a year filter should trigger the "advanced filters active" indicator
 *
 * True when:
 * - Single-value filter (only min or max) that's not in presets
 * - Range filter (min != max) that's not a preset decade
 *
 * Same-year selections (min === max) are NEVER advanced because any year
 * can be selected directly via the QuickBrowseBar dropdown.
 */
export function isYearFilterAdvanced(minYear: string, maxYear: string): boolean {
  const analysis = analyzeYearFilter(minYear, maxYear);

  // Empty or same-year selections are never advanced
  if (analysis.isEmpty || analysis.isSameYear) return false;

  // Single-value or range: advanced if not in presets
  return !analysis.isInPresets;
}
