import { getChangeCount } from "@/lib/session";
import { SignedInHome } from "./SignedInHome";
import { Container } from "@chakra-ui/react";
import useAuthContext from "@/hooks/auth/useAuthContext";
import LoadingContent from "@/components/layout/LoadingContent";
import { pageContainerProps } from "@/components/layout/pageContainer";
import { HomeHero } from "./HomeHero";
import { HomeBand } from "./HomeBand";
import { WhatsOn } from "./WhatsOn";

export default function Home() {
  const status = useAuthContext()?.status ?? "resolving";
  if (status === "resolving") return <LoadingContent mode="content" />;
  if (status === "authenticated")
    return (
      <SignedInHome key={getChangeCount()} generation={getChangeCount()} />
    );
  return (
    <>
      <HomeHero />
      <Container {...pageContainerProps}>
        <WhatsOn />
      </Container>
      <HomeBand />
    </>
  );
}
