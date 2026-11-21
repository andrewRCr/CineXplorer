import { Text } from "@chakra-ui/react";
import { TextLink } from "@/components/common";
import { ROUTES } from "@/constants/routes";

export function SignUpNotice() {
  return (
    <Text w="full" textAlign="center" fontSize="sm" color="on-muted">
      By creating an account, you agree to the{" "}
      <TextLink to={ROUTES.TERMS}>Terms of Service</TextLink> and acknowledge
      the <TextLink to={ROUTES.PRIVACY}>Privacy Policy</TextLink>.
    </Text>
  );
}
