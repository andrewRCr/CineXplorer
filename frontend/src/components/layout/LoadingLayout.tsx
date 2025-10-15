import LoadingContent from "./LoadingContent";

/**
 * Full-page loading layout for Suspense fallback
 * Uses LoadingContent component in layout mode
 */
const LoadingLayout = () => {
	return <LoadingContent mode="layout" />;
};

export default LoadingLayout;
