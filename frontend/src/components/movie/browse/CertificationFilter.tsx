import { Box, CheckboxCard, CheckboxGroup, Flex, Text } from "@chakra-ui/react";
import {
  CERTIFICATION_OPTIONS,
  getCertificationVariant,
  type CertificationVariant,
} from "../utils/certificationUtils";

interface CertificationFilterProps {
  selectedCertifications: string[];
  onChange: (certifications: string[]) => void;
}

/**
 * Maps certification variant to background/text token pairs for selected state
 * Uses status tokens from the semantic color system
 */
const VARIANT_TO_TOKENS: Record<
  CertificationVariant,
  { bg: string; color: string }
> = {
  success: { bg: "success", color: "on-success" },
  info: { bg: "info", color: "on-info" },
  warning: { bg: "warning", color: "on-warning" },
  error: { bg: "destructive", color: "on-destructive" },
  neutral: { bg: "badge", color: "on-badge" },
};

/**
 * Certification filter using CheckboxCard pills
 *
 * Visual treatment:
 * - Unselected: Outline style with muted text
 * - Selected: Solid fill with status color matching CertificationBadge
 *
 * No indicator (checkbox mark) - selection state shown via background color
 *
 * Note: NC-17 filter shows disclaimer due to TMDB API limitation - certification
 * filtering matches any release type (theatrical, digital, etc.), not just theatrical.
 * Movies with NC-17 uncut/digital versions appear even if theatrical release was R.
 */
const CertificationFilter = ({
  selectedCertifications,
  onChange,
}: CertificationFilterProps) => {
  const showNc17Disclaimer = selectedCertifications.includes("NC-17");

  return (
    <Box>
      {/* Checkbox group - no centering, let parent handle layout */}
      <Flex>
        <CheckboxGroup
          value={selectedCertifications}
          onValueChange={(value) => onChange(value)}
        >
          <Text fontSize="sm" fontWeight="medium" mb={0} color="foreground">
            Certification
          </Text>
          <Flex gap={2} wrap="wrap">
            {CERTIFICATION_OPTIONS.map((cert) => {
              const isSelected = selectedCertifications.includes(cert);
              const variant = getCertificationVariant(cert);
              const tokens = VARIANT_TO_TOKENS[variant];

              return (
                <CheckboxCard.Root
                  key={cert}
                  value={cert}
                  cursor="pointer"
                  bg={isSelected ? tokens.bg : "transparent"}
                  color={isSelected ? tokens.color : "on-muted"}
                  borderWidth="1px"
                  borderColor={isSelected ? tokens.bg : "border-strong-01"}
                  borderRadius="md"
                  px={2}
                  py={1.5}
                  w="auto"
                  flex="0 0 auto"
                  _hover={{
                    borderColor: isSelected ? tokens.bg : "tertiary",
                    bg: isSelected ? tokens.bg : "tertiary/8",
                  }}
                  transition="all 0.15s ease-out"
                >
                  <CheckboxCard.HiddenInput />
                  <CheckboxCard.Control
                    p={0}
                    border="none"
                    bg="transparent"
                    w="auto"
                    minW="0"
                    _hover={{ bg: "transparent" }}
                  >
                    <CheckboxCard.Label
                      fontSize="sm"
                      fontWeight="medium"
                      cursor="pointer"
                      whiteSpace="nowrap"
                    >
                      {cert}
                    </CheckboxCard.Label>
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
              );
            })}
          </Flex>
        </CheckboxGroup>
      </Flex>
      {/* Disclaimer fully centered in container */}
      {showNc17Disclaimer && (
        <Text
          fontSize="xs"
          color="on-muted"
          mt={2}
          fontStyle="italic"
          textAlign="center"
        >
          Results may include alternate versions (uncut, re-releases) rated
          NC-17
        </Text>
      )}
    </Box>
  );
};

export default CertificationFilter;
