import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import VirtualizedMovieGrid from "@/components/movie/collection/VirtualizedMovieGrid";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("query") || "";

  // Handle empty search query - redirect to home
  useEffect(() => {
    if (!initialQuery.trim()) {
      void navigate("/", { replace: true });
    }
  }, [initialQuery, navigate]);

  // If no query, don't render anything (will redirect)
  if (!initialQuery.trim()) {
    return null;
  }

  // VirtualizedMovieGrid provides:
  // - Page header with title from routeConfigHelper.ts
  // - Search fetcher from routeConfigHelper.ts
  // - Infinite scroll with virtualization
  // - Scroll position persistence keyed by search query
  return <VirtualizedMovieGrid />;
};

export default SearchResults;
