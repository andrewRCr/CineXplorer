import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import type { MovieListResponse } from "@/types/movie";
import type { BrowseParams } from "@/types/browseTypes";

// Reusable fetcher function type
type MovieFetcher = (page: number, tmdb_page_start?: number) => {
    request: Promise<{ data: MovieListResponse }>;
    cancel: () => void;
};

// Define the context type that matches what MovieCollectionLayout passes
interface MovieCollectionContext {
    fetcher: MovieFetcher;
    source?: string;
    query?: string;
    title?: string;
    renderPageHeader?: boolean;
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
    enhancedFetcher?: MovieFetcher;
    browseParams?: BrowseParams;
}

interface ResolvedContext {
    fetcher: MovieFetcher | undefined;
    source: string | undefined;
    query: string | undefined;
    title: string | undefined;
    renderPageHeader: boolean;
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
 * **Note:** Pagination is handled internally by TanStack Query (infinite scroll),
 * not passed through this context.
 *
 * @param props - Optional props to override or supplement outlet context
 * @returns Resolved context with fetcher and browse params
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
        props.enhancedFetcher,
        props.browseParams,
        contextFetcher,
        contextSource,
        contextQuery,
        contextTitle,
        contextRenderPageHeader,
        contextEnhancedFetcher,
        contextBrowseParams,
    ]);

    return resolvedContext;
}
