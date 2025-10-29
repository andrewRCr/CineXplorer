import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import type { PaginatedMoviesResponse } from "@/types/movie";

// Define the context type that matches what MovieCollectionLayout passes
interface MovieCollectionContext {
	fetcher: (page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange: (page: number) => void;
	enhancedFetcher: (page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

// Props interface for when used without Outlet context
interface MovieCollectionGridProps {
	fetcher?: (page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange?: (page: number) => void;
	enhancedFetcher?: (page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

interface ResolvedContext {
	fetcher: ((page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	}) | undefined;
	source: string | undefined;
	query: string | undefined;
	currentPage: number;
	onPageChange: ((page: number) => void) | undefined;
	enhancedFetcher: ((page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	}) | undefined;
	finalFetcher: ((page: number, tmdb_page_start?: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	}) | undefined;
}

/**
 * Movie Collection Context Hook
 *
 * **Purpose:** Resolves movie collection data from React Router outlet context or props.
 *
 * **Responsibilities:**
 * - Retrieves context passed from MovieCollectionLayout via outlet
 * - Merges outlet context with direct component props (props override context)
 * - Resolves final fetcher to use (enhanced fetcher if available, else base fetcher)
 * - Memoizes resolved values to prevent unnecessary re-renders
 *
 * **React Router Pattern:**
 * ```
 * MovieCollectionLayout (provides context)
 *   └─> Outlet
 *         └─> MovieCollectionGrid (consumes via this hook)
 * ```
 *
 * **Why This Exists:** Allows MovieCollectionGrid to work both:
 * 1. As a child route (gets data from outlet context)
 * 2. Standalone (gets data from props)
 *
 * @param props - Optional props to override or supplement outlet context
 * @returns Resolved context with fetcher, pagination data, and handlers
 */
export function useMovieCollectionContext(props: MovieCollectionGridProps): ResolvedContext {
	// Get context from parent layout, or use props as fallback
	const context = useOutletContext<MovieCollectionContext>();
	const {
		fetcher: contextFetcher,
		source: contextSource,
		query: contextQuery,
		initialCurrentPage: contextInitialPage,
		onPageChange: contextOnPageChange,
		enhancedFetcher: contextEnhancedFetcher,
	} = context || {};

	// Resolve final values using props if provided, otherwise use context
	const resolvedContext = useMemo((): ResolvedContext => {
		const fetcher = props.fetcher || contextFetcher;
		const source = props.source || contextSource;
		const query = props.query || contextQuery;
		const currentPage = props.initialCurrentPage || contextInitialPage || 1;
		const onPageChange = props.onPageChange || contextOnPageChange;
		const enhancedFetcher = props.enhancedFetcher || contextEnhancedFetcher;

		// Use the enhanced fetcher from context or props, fallback to regular fetcher
		const finalFetcher = enhancedFetcher || fetcher;

		return {
			fetcher,
			source,
			query,
			currentPage,
			onPageChange,
			enhancedFetcher,
			finalFetcher,
		};
	}, [
		props.fetcher,
		props.source,
		props.query,
		props.initialCurrentPage,
		props.onPageChange,
		props.enhancedFetcher,
		contextFetcher,
		contextSource,
		contextQuery,
		contextInitialPage,
		contextOnPageChange,
		contextEnhancedFetcher,
	]);

	return resolvedContext;
}
