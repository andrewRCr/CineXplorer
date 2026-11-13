/**
 * BackToCollectionLink - Navigation link for returning to movie/person collections
 *
 * Provides a consistent "Back to Results" button that:
 * - Preserves filter parameters from the original collection view
 * - Signals scroll restoration intent via React Router location state
 * - Supports browse routes (presets like now-playing, upcoming) and search routes
 *
 * The `restoreScroll: true` state enables VirtualizedMovieGrid to restore
 * the user's scroll position when navigating back, while page refreshes
 * (which clear location state) correctly reset to top.
 *
 * @example
 * ```tsx
 * // In MovieDetail or PersonDetail
 * const [searchParams] = useSearchParams();
 * <BackToCollectionLink searchParams={searchParams} />
 * ```
 */

import { Link } from "react-router";
import { Box, Button } from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";

export interface BackToCollectionLinkProps {
  /**
   * URL search params from the detail page.
   * Used to extract `from` route and preserve filter params.
   */
  searchParams: URLSearchParams;

  /**
   * Button label text.
   * @default "Back to Results"
   */
  label?: string;

  /**
   * Button variant style.
   * @default "outline"
   */
  variant?: "outline" | "ghost" | "solid";

  /**
   * Bottom margin for spacing.
   * @default 4
   */
  mb?: number | string;
}

/**
 * Params to exclude when building the back URL query string.
 * - `from`: encoded in the route path, not query string
 * - `page`, `tmdb_page_start`: pagination params not used in infinite scroll
 */
const EXCLUDED_PARAMS = new Set(["from", "page", "tmdb_page_start"]);

/**
 * Builds the back URL from search params.
 * Determines route from `from` param and preserves filter params.
 */
function buildBackUrl(searchParams: URLSearchParams): string {
  const from = searchParams.get("from") || "now-playing";

  // Build query string, filtering out excluded and empty params
  const queryParts: string[] = [];
  searchParams.forEach((value, key) => {
    if (!EXCLUDED_PARAMS.has(key) && value !== "") {
      queryParts.push(`${key}=${encodeURIComponent(value)}`);
    }
  });
  const queryString = queryParts.join("&");

  // Determine base route from `from` param
  if (from === "search") {
    return `/search${queryString ? `?${queryString}` : ""}`;
  }
  if (from === "browse") {
    return `/browse${queryString ? `?${queryString}` : ""}`;
  }
  // Preset routes: now-playing, upcoming, etc.
  return `/browse/${from}${queryString ? `?${queryString}` : ""}`;
}

export function BackToCollectionLink({
  searchParams,
  label = "Back to Results",
  variant = "outline",
  mb = 4,
}: BackToCollectionLinkProps) {
  const backUrl = buildBackUrl(searchParams);

  return (
    <Box mb={mb}>
      <Link
        to={backUrl}
        state={{ restoreScroll: true }}
        style={{ textDecoration: "none" }}
      >
        <Button variant={variant}>
          <LuArrowLeft data-testid="back-to-results-icon" />
          {label}
        </Button>
      </Link>
    </Box>
  );
}
