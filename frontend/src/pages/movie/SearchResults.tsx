import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MovieCollectionGrid from "@/components/movie/MovieCollectionGrid";

const SearchResults = () => {
	console.log("🔍 SearchResults: COMPONENT STARTED");
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const initialQuery = searchParams.get("query") || "";

	console.log("SearchResults: Component render", {
		initialQuery,
		searchParams: searchParams.toString(),
	});

	// Handle empty search query
	useEffect(() => {
		console.log("SearchResults: Checking for empty query", {
			initialQuery,
			searchParams: searchParams.toString(),
		});
		if (!initialQuery.trim()) {
			console.log("SearchResults: No query found, redirecting to home");
			navigate("/", { replace: true });
		}
	}, [initialQuery, navigate, searchParams]);

	// If no query, don't render anything (will redirect)
	if (!initialQuery.trim()) {
		return null;
	}

	console.log("SearchResults: About to render MovieCollectionGrid");

	return <MovieCollectionGrid />;
};

export default SearchResults;
