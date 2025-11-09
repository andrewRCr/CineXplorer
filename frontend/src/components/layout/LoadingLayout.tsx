import LoadingContent from "./LoadingContent";
import GoogleLogo from "@/assets/GoogleLogo";
import GitHubLogo from "@/assets/GitHubLogo";
import BaseLayout from "./BaseLayout";
import { Box } from "@chakra-ui/react";

/**
 * Full-page loading layout for Suspense fallback
 * Uses LoadingContent component in layout mode
 *
 * OAuth-aware: If returning from OAuth flow, shows provider-specific spinner
 * with AuthLayout structure (NavBar + Footer) to prevent visual jump when
 * Login component mounts.
 */
const LoadingLayout = () => {
  // Check if we're returning from an OAuth flow
  const oauthProvider = sessionStorage.getItem('oauth_in_progress');

  // Show OAuth-specific loading if coming back from OAuth provider
  // Use BaseLayout to match AuthLayout structure (prevents spinner position jump)
  if (oauthProvider) {
    return (
      <BaseLayout>
        {/* Match AuthLayout's container structure */}
        <Box
          position="relative"
          minH="calc(100vh - 144px)" // Same as AuthLayout
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
                // EXCEPTION: GitHub logo requires black for brand consistency
                <Box color="black">
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
