import { Badge } from "@chakra-ui/react";
import React from "react";
import { getCertificationVariant } from "./certificationUtils";

interface CertificationBadgeProps {
  /** US MPAA certification string from API */
  certification: string | null | undefined;
}

/**
 * Displays a color-coded badge for US MPAA movie certification
 *
 * Uses Badge recipe status variants for WCAG-compliant contrast across themes.
 * Returns null if certification is not provided (graceful omission).
 *
 * @example
 * <CertificationBadge certification="PG-13" />
 * // Renders: amber/warning badge with "PG-13" text
 *
 * @example
 * <CertificationBadge certification={null} />
 * // Renders: nothing (null)
 */
const CertificationBadge: React.FC<CertificationBadgeProps> = ({
  certification,
}) => {
  // Return null if no certification - layout handles absence gracefully
  if (!certification) {
    return null;
  }

  const variant = getCertificationVariant(certification);

  return (
    <Badge variant={variant} title={`Rated ${certification}`}>
      {certification}
    </Badge>
  );
};

export default CertificationBadge;
