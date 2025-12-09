import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MovieCollectionGrid from "@/components/movie/collection/MovieCollectionGrid";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("query") || "";

  // Handle empty search query - redirect to home
  useEffect(() => {
    if (!initialQuery.trim()) {
      navigate("/", { replace: true });
    }
  }, [initialQuery, navigate]);

  // If no query, don't render anything (will redirect)
  if (!initialQuery.trim()) {
    return null;
  }

  // MovieCollectionLayout will provide:
  // - Page header with title from routeConfigHelper.ts
  // - Search fetcher from routeConfigHelper.ts  
  // - Pagination management
  // - Consistent styling and layout
  return <MovieCollectionGrid />;
};

export default SearchResults;
