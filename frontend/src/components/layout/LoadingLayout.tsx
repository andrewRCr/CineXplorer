import LoadingContent from "./LoadingContent";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import BaseLayout from "./BaseLayout";
import { Box } from "@chakra-ui/react";
import { useEffect } from "react";

// Declare global function type for preload overlay dismissal
declare global {
  interface Window {
    __dismissPreloadOverlay?: () => void;
  }
}

/**
 * Full-page loading layout for Suspense fallback
 * Uses LoadingContent component in layout mode
 *
 * OAuth-aware: If returning from OAuth flow, shows provider-specific spinner
 * with AuthLayout structure (NavBar + Footer) to prevent visual jump when
 * Login component mounts.
 */
const LoadingLayout = () => {
  // Dismiss preload overlay when React is ready to render
  useEffect(() => {
    window.__dismissPreloadOverlay?.();
  }, []);

  // Check if we're returning from an OAuth flow
  const oauthProvider = sessionStorage.getItem("oauth_in_progress");

  // Show OAuth-specific loading if coming back from OAuth provider
  // Use BaseLayout to match AuthLayout structure (prevents spinner position jump)
  if (oauthProvider) {
    return (
      <BaseLayout>
        {/* Match AuthLayout's container structure */}
        <Box
          position="relative"
          // Matches AuthLayout container height to prevent OAuth spinner jump
          minH="calc(100vh - 144px)"
          w="100%"
        >
          <LoadingContent
            mode="content" // Use content mode since we have BaseLayout wrapper
            message={`Logging in with ${
              oauthProvider === "google" ? "Google" : "GitHub"
            }...`}
            icon={
              oauthProvider === "google" ? (
                <GoogleLogo size={64} />
              ) : (
                <Box color="foreground">
                  <GitHubLogo size={64} />
                </Box>
              )
            }
          />
        </Box>
      </BaseLayout>
    );
  }

  // Default generic loading for normal navigation
  return <LoadingContent mode="layout" />;
};

export default LoadingLayout;
