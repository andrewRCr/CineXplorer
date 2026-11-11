import { Box, CheckboxCard, CheckboxGroup, Flex, Text } from "@chakra-ui/react";
import { CERTIFICATION_OPTIONS } from "@/components/movie/utils/certificationUtils";

interface CertificationFilterProps {
  selectedCertifications: string[];
  onChange: (certifications: string[]) => void;
}

/**
 * Certification filter using CheckboxCard pills
 *
 * Visual treatment:
 * - Unselected: Outline style with muted text
 * - Selected: Theme selection fill (brass in Marquee) with no inset ring
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

              return (
                <CheckboxCard.Root
                  key={cert}
                  value={cert}
                  cursor="pointer"
                  bg={isSelected ? "tertiary" : "transparent"}
                  color={isSelected ? "on-tertiary" : "on-muted"}
                  borderWidth="1px"
                  borderColor={isSelected ? "tertiary" : "border-strong-01"}
                  focusRingColor="ring"
                  _checked={{ borderColor: "tertiary", boxShadow: "none" }}
                  borderRadius="md"
                  px={2}
                  py={1.5}
                  w="auto"
                  flex="0 0 auto"
                  _hover={{
                    borderColor: isSelected ? "tertiary" : "tertiary",
                    bg: isSelected ? "tertiary" : "tertiary/8",
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
      {/* Disclaimer constrained to chip row width to prevent layout shift */}
      {showNc17Disclaimer && (
        <Text
          fontSize="xs"
          color="on-muted"
          mt={2}
          fontStyle="italic"
          textAlign="center"
          maxW="240px"
        >
          May include uncut/alternate re-releases
        </Text>
      )}
    </Box>
  );
};

export default CertificationFilter;
