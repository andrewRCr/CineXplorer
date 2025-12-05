/**
 * Certification utilities and constants for MPAA rating display
 *
 * Separated from component file to allow Fast Refresh to work properly
 * and to share constants between CertificationBadge and CheckboxCard UI.
 */

/**
 * US MPAA certification values that we display
 * - G, PG, PG-13, R, NC-17: Standard MPAA ratings
 * - NR: Not Rated (no certification found)
 */
export type Certification = "G" | "PG" | "PG-13" | "R" | "NC-17" | "NR";

/**
 * Badge variant type matching the Badge recipe variants
 */
export type CertificationVariant =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "neutral";

/**
 * Maps MPAA certification to Badge recipe variant
 *
 * Color semantics follow intuitive associations:
 * - G (General): success (green) - safe for all ages
 * - PG (Parental Guidance): info (blue) - informational/neutral
 * - PG-13 (Parents Strongly Cautioned): warning (amber) - parental caution
 * - R (Restricted): error (red) - restricted content
 * - NC-17 (Adults Only): error (red) - adults only
 * - NR (Not Rated): neutral (gray) - no rating info
 */
export const CERTIFICATION_VARIANT_MAP: Record<
  Certification,
  CertificationVariant
> = {
  G: "success",
  PG: "info",
  "PG-13": "warning",
  R: "error",
  "NC-17": "error",
  NR: "neutral",
};

/**
 * All supported certification values in display order
 * Used for filter UI and validation
 */
export const CERTIFICATION_OPTIONS: Certification[] = [
  "NR",
  "G",
  "PG",
  "PG-13",
  "R",
  "NC-17",
];

/**
 * Get badge variant for a certification string
 * Returns "neutral" for unknown certifications
 */
export function getCertificationVariant(
  certification: string | null | undefined
): CertificationVariant {
  if (!certification) return "neutral";
  return (
    CERTIFICATION_VARIANT_MAP[certification as Certification] ?? "neutral"
  );
}
