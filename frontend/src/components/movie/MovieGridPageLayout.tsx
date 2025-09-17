import React, { useState, useEffect, useCallback } from "react";
import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import { PaginationCtrl } from "../layout/PaginationCtrl";
import type { PaginatedMoviesResponse } from "@/types/movie";

interface MovieGridPageLayoutProps {
	title: string;
	fetcher: (
		page: number,
		filters?: Record<string, string | number | number[]>
	) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source: string;
	showFilters?: boolean;
	filterStyle?: "minimal" | "full";
	defaultFilters?: Record<string, string | number | number[] | undefined>;
}

const MovieGridPageLayout: React.FC<MovieGridPageLayoutProps> = ({
	title,
	fetcher,
}) => {
	const [movies, setMovies] = useState<PaginatedMoviesResponse["results"]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalResults, setTotalResults] = useState(0);

	const loadMovies = useCallback(
		async (page: number) => {
			try {
				setLoading(true);
				setError(null);
				const result = await fetcher(page).request;
				setMovies(result.data.results || []);
				setTotalPages(result.data.total_pages || 1);
				setTotalResults(result.data.total_results || 0);
			} catch (err) {
				setError("Failed to load movies");
				console.error("Error loading movies:", err);
			} finally {
				setLoading(false);
			}
		},
		[fetcher]
	);

	useEffect(() => {
		loadMovies(currentPage);
	}, [currentPage, loadMovies]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	return (
		<Box maxW="1400px" mx="auto" px={4} pt={3} pb={4}>
			{/* Page Header */}
			<Box mb={6}>
				<Box
					fontSize="3xl"
					fontWeight="normal"
					fontStyle="italic"
					color={COLORS.text.main}
					textAlign="left"
					mb={1}
					position="relative"
					display="inline-block"
				>
					{title}
					<Box
						position="absolute"
						bottom="-2px"
						left="0"
						right="0"
						height="2px"
						backgroundColor={COLORS.accent.primary}
						borderRadius="1px"
					/>
				</Box>
			</Box>

			{/* Error State */}
			{error && (
				<Box textAlign="center" py={8}>
					<Text color="red.500">{error}</Text>
				</Box>
			)}

			{/* Movie Grid */}
			<SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 5 }} gap={6} mb={8}>
				{loading
					? Array.from({ length: 20 }, (_, i) => <MovieCardSkeleton key={i} />)
					: movies.map((movie: PaginatedMoviesResponse['results'][number]) => (
							<MovieCard key={movie.tmdb_id} movie={movie} />
					  ))}
			</SimpleGrid>

			{/* Pagination */}
			{!loading && movies.length > 0 && (
				<PaginationCtrl
					currentPage={currentPage}
					totalMovieCount={totalResults}
					totalPages={totalPages}
					onGoToPage={handlePageChange}
				/>
			)}
		</Box>
	);
};
export default MovieGridPageLayout;
