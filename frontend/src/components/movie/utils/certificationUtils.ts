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
