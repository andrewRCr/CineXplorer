import { Badge } from "@chakra-ui/react";
import React from "react";

interface CertificationBadgeProps {
  /** US MPAA certification string from API */
  certification: string | null | undefined;
}

/**
 * Displays a neutral badge for US MPAA movie certification
 *
 * Uses the neutral badge/on-badge pair for every certification.
 * Returns null if certification is not provided (graceful omission).
 *
 * @example
 * <CertificationBadge certification="PG-13" />
 * // Renders: neutral badge with "PG-13" text
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

  return (
    <Badge variant="neutral" title={`Rated ${certification}`}>
      {certification}
    </Badge>
  );
};

export default CertificationBadge;
