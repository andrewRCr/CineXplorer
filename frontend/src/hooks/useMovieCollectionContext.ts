import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import type { PaginatedMoviesResponse } from "@/types/movie";

// Define the context type that matches what MovieCollectionLayout passes
interface MovieCollectionContext {
	fetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange: (page: number) => void;
	enhancedFetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

// Props interface for when used without Outlet context
interface MovieCollectionGridProps {
	fetcher?: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
	query?: string;
	initialCurrentPage?: number;
	onPageChange?: (page: number) => void;
	enhancedFetcher?: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
}

interface ResolvedContext {
	fetcher: ((page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	}) | undefined;
	source: string | undefined;
	query: string | undefined;
	currentPage: number;
	onPageChange: ((page: number) => void) | undefined;
	enhancedFetcher: ((page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	}) | undefined;
	finalFetcher: ((page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	}) | undefined;
}

/**
 * Custom hook to resolve context and props for MovieCollectionGrid
 * Handles the complex logic of merging context from outlet with component props
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
