import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import type { PaginatedMoviesResponse } from "@/types/movie";
import type { BrowseParams } from "@/types/browseTypes";

// Reusable fetcher function type
type MovieFetcher = (page: number, tmdb_page_start?: number) => {
    request: Promise<{ data: PaginatedMoviesResponse }>;
    cancel: () => void;
};

// Define the context type that matches what MovieCollectionLayout passes
interface MovieCollectionContext {
    fetcher: MovieFetcher;
    source?: string;
    query?: string;
    title?: string;
    renderPageHeader?: boolean;
    initialCurrentPage?: number;
    initialTmdbPageStart?: number;
    onPageChange: (page: number, tmdb_page_start?: number) => void;
    enhancedFetcher: MovieFetcher;
    browseParams?: BrowseParams;
}

// Props interface for when used without Outlet context
interface MovieGridProps {
    fetcher?: MovieFetcher;
    source?: string;
    query?: string;
    title?: string;
    renderPageHeader?: boolean;
    initialCurrentPage?: number;
    initialTmdbPageStart?: number;
    onPageChange?: (page: number, tmdb_page_start?: number) => void;
    enhancedFetcher?: MovieFetcher;
    browseParams?: BrowseParams;
}

interface ResolvedContext {
    fetcher: MovieFetcher | undefined;
    source: string | undefined;
    query: string | undefined;
    title: string | undefined;
    renderPageHeader: boolean;
    currentPage: number;
    initialTmdbPageStart: number | undefined;
    onPageChange: ((page: number, tmdb_page_start?: number) => void) | undefined;
    enhancedFetcher: MovieFetcher | undefined;
    finalFetcher: MovieFetcher | undefined;
    browseParams: BrowseParams | undefined;
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
 *         └─> VirtualizedMovieGrid (consumes via this hook)
 * ```
 *
 * **Why This Exists:** Allows VirtualizedMovieGrid to work both:
 * 1. As a child route (gets data from outlet context)
 * 2. Standalone (gets data from props)
 *
 * @param props - Optional props to override or supplement outlet context
 * @returns Resolved context with fetcher, pagination data, and handlers
 */
export function useMovieCollectionContext(props: MovieGridProps): ResolvedContext {
    // Get context from parent layout, or use props as fallback
    const context = useOutletContext<MovieCollectionContext>();
    const {
        fetcher: contextFetcher,
        source: contextSource,
        query: contextQuery,
        title: contextTitle,
        renderPageHeader: contextRenderPageHeader,
        initialCurrentPage: contextInitialPage,
        initialTmdbPageStart: contextInitialTmdbPageStart,
        onPageChange: contextOnPageChange,
        enhancedFetcher: contextEnhancedFetcher,
        browseParams: contextBrowseParams,
    } = context || {};

    // Resolve final values using props if provided, otherwise use context
    const resolvedContext = useMemo((): ResolvedContext => {
        const fetcher = props.fetcher || contextFetcher;
        const source = props.source || contextSource;
        const query = props.query || contextQuery;
        const title = props.title || contextTitle;
        // Default to true (render PageHeader) unless explicitly set to false
        const renderPageHeader = props.renderPageHeader ?? contextRenderPageHeader ?? true;
        const currentPage = props.initialCurrentPage || contextInitialPage || 1;
        const initialTmdbPageStart = props.initialTmdbPageStart ?? contextInitialTmdbPageStart;
        const onPageChange = props.onPageChange || contextOnPageChange;
        const enhancedFetcher = props.enhancedFetcher || contextEnhancedFetcher;
        const browseParams = props.browseParams || contextBrowseParams;

        // Use the enhanced fetcher from context or props, fallback to regular fetcher
        const finalFetcher = enhancedFetcher || fetcher;

        return {
            fetcher,
            source,
            query,
            title,
            renderPageHeader,
            currentPage,
            initialTmdbPageStart,
            onPageChange,
            enhancedFetcher,
            finalFetcher,
            browseParams,
        };
    }, [
        props.fetcher,
        props.source,
        props.query,
        props.title,
        props.renderPageHeader,
        props.initialCurrentPage,
        props.initialTmdbPageStart,
        props.onPageChange,
        props.enhancedFetcher,
        props.browseParams,
        contextFetcher,
        contextSource,
        contextQuery,
        contextTitle,
        contextRenderPageHeader,
        contextInitialPage,
        contextInitialTmdbPageStart,
        contextOnPageChange,
        contextEnhancedFetcher,
        contextBrowseParams,
    ]);

    return resolvedContext;
}
