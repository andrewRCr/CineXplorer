import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import ErrorBoundary from "@/components/core/ErrorBoundary";
import NavBar from "./navbar/NavBar";
import Footer from "./Footer";
import LoadingContent from "./LoadingContent";

interface BaseLayoutProps {
  children: ReactNode;
}

function ContentLoading() {
  const provider = sessionStorage.getItem("oauth_in_progress");
  if (!provider) return <LoadingContent mode="content" />;
  const google = provider === "google";
  return (
    <LoadingContent
      mode="content"
      message={`Logging in with ${google ? "Google" : "GitHub"}...`}
      icon={
        google ? (
          <GoogleLogo size={64} />
        ) : (
          <Box color="foreground">
            <GitHubLogo size={64} />
          </Box>
        )
      }
    />
  );
}

export default function BaseLayout({ children }: BaseLayoutProps) {
  const location = useLocation();
  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="background">
      <NavBar />
      <Box flex="1" minW="0" display="flex" flexDirection="column">
        <ErrorBoundary
          resetKey={`${location.pathname}${location.search}`}
          showErrorDetails={import.meta.env.MODE === "development"}
        >
          <Suspense fallback={<ContentLoading />}>{children}</Suspense>
        </ErrorBoundary>
      </Box>
      <Footer />
    </Box>
  );
}
