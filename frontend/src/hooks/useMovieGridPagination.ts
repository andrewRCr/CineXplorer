import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Custom hook for managing movie grid pagination with URL synchronization
 * 
 * Handles complex logic for:
 * - URL parameter parsing and synchronization
 * - Browser navigation (back/forward)
 * - Page validation against API responses
 * - Reset navigation from sidebar
 * - Preventing infinite navigation loops
 */
export function useMovieGridPagination(
  initialCurrentPage?: number,
  total_pages?: number,
  total_results?: number,
  page?: number,
  isLoading?: boolean
) {
  const navigate = useNavigate();
  const location = useLocation();

  // Core pagination state
  const [currentPage, setCurrentPageState] = useState(1);

  // Navigation state management
  const isNavigatingRef = useRef(false);
  const lastNavigatedUrlRef = useRef<string | null>(null);
  const initialSetupDoneRef = useRef(false);

  // Control flags
  const [pageSetFromProps, setPageSetFromProps] = useState(false);
  const [isProcessingReset, setIsProcessingReset] = useState(false);

  // URL construction utility
  const constructUrl = useCallback(
    (page: number, pathname: string, search: string) => {
      const searchParams = new URLSearchParams(search);
      if (page === 1) {
        searchParams.delete('page');
      } else {
        searchParams.set('page', page.toString());
      }
      const newSearch = searchParams.toString();
      return `${pathname}${newSearch ? `?${newSearch}` : ''}`;
    },
    []
  );

  // Initialize current page from props or URL
  useEffect(() => {
    if (initialSetupDoneRef.current) {
      return;
    }

    let initialPage = 1;

    // Priority 1: Use initialCurrentPage prop if provided
    if (initialCurrentPage && initialCurrentPage > 0) {
      initialPage = initialCurrentPage;
    }
    // Priority 2: Parse from URL if no prop provided
    else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(location.search);
      const pageParam = params.get('page');
      const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
      initialPage = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
    }

    setCurrentPageState(initialPage);

    // Initialize lastNavigatedUrlRef
    const initialUrl = constructUrl(
      initialPage,
      location.pathname,
      location.search
    );
    lastNavigatedUrlRef.current = initialUrl;

    // Mark initial setup as complete
    initialSetupDoneRef.current = true;
  }, [initialCurrentPage, location.pathname, location.search, constructUrl]);

  // Update currentPage when initialCurrentPage prop changes
  useEffect(() => {
    if (initialCurrentPage && initialCurrentPage !== currentPage) {
      // Only validate against total_pages if we have real data from TMDB
      let validPage = initialCurrentPage;
      const hasRealData = total_pages !== undefined && total_pages > 1 && total_results !== undefined && total_results > 0;

      if (
        hasRealData &&
        total_pages !== null &&
        !isNaN(total_pages) &&
        total_pages > 0
      ) {
        if (initialCurrentPage > total_pages) {
          validPage = total_pages;
        } else if (initialCurrentPage < 1) {
          validPage = 1;
        }
      }

      setPageSetFromProps(true);
      setCurrentPageState(validPage);
      // Reset the flag after a short delay
      setTimeout(() => setPageSetFromProps(false), 0);
    }
  }, [
    initialCurrentPage,
    currentPage,
    pageSetFromProps,
    total_pages,
    total_results,
  ]);

  // Handle page changes from user interaction
  const handlePageChange = useCallback(
    (page: number) => {
      // Ensure we don't have any lingering reset parameters
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.has('reset')) {
        currentParams.delete('reset');
      }

      // Validate page number
      const validPage = Math.max(1, page);
      setCurrentPageState(validPage);
    },
    [currentPage, isProcessingReset]
  );

  // Reset to page one functionality
  const resetToPageOne = useCallback(() => {
    setCurrentPageState(1);
    // Also update the URL to remove page parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Safety mechanism: Force reset navigation flag if it gets stuck
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
      }
    }, 2000);

    return () => clearTimeout(resetTimer);
  }, [currentPage]);

  // Update URL when currentPage changes
  useEffect(() => {
    // Skip if initial setup is not complete yet
    if (!initialSetupDoneRef.current) {
      return;
    }

    // Skip if we're currently processing a reset
    if (isProcessingReset) {
      return;
    }

    // Skip if we're already navigating to prevent infinite loops
    if (isNavigatingRef.current) {
      return;
    }

    const newUrl = constructUrl(
      currentPage,
      location.pathname,
      location.search
    );

    // Only navigate if the URL actually changed from what we last navigated to
    if (lastNavigatedUrlRef.current !== newUrl) {
      isNavigatingRef.current = true;
      lastNavigatedUrlRef.current = newUrl;
      // Use push navigation for pagination to create proper history entries
      navigate(newUrl);
      // Reset the flag after navigation completes
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [
    currentPage,
    navigate,
    constructUrl,
    location.pathname,
    location.search,
    initialCurrentPage,
    isProcessingReset,
  ]);

  // Handle browser navigation via React Router
  useEffect(() => {
    // Reset navigation flag when location changes
    isNavigatingRef.current = false;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(location.search);
      const pageParam = params.get('page');
      const resetParam = params.get('reset');
      const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
      const validPage = isNaN(urlPage) ? 1 : Math.max(1, urlPage);

      // Handle sidebar reset navigation
      if (resetParam) {
        setIsProcessingReset(true);

        // Remove BOTH reset and page parameters to get a completely clean URL
        params.delete('reset');
        params.delete('page');
        const cleanSearch = params.toString();
        const cleanUrl = `${location.pathname}${
          cleanSearch ? `?${cleanSearch}` : ''
        }`;

        // Update state to page 1 FIRST
        setCurrentPageState(1);

        // Clean up the URL using React Router's navigate with replace
        try {
          navigate(cleanUrl, { replace: true });
        } catch (error) {
          // Fallback to history API
          window.history.replaceState({}, '', cleanUrl);
        }

        // Double-check cleanup after a short delay
        setTimeout(() => {
          try {
            const currentSearch = window.location.search;
            const currentParams = new URLSearchParams(currentSearch);
            if (currentParams.has('reset')) {
              currentParams.delete('reset');
              currentParams.delete('page');
              const finalCleanUrl = `${window.location.pathname}${
                currentParams.toString() ? `?${currentParams.toString()}` : ''
              }`;
              navigate(finalCleanUrl, { replace: true });
            }
          } catch (error) {
            // Error in cleanup - silently handle
          }
        }, 50);

        // Update the last navigated URL to the clean URL
        lastNavigatedUrlRef.current = cleanUrl;

        // Reset the processing flag after a longer delay
        setTimeout(() => {
          setIsProcessingReset(false);
        }, 300);

        return;
      }

      // Update the last navigated URL to prevent unnecessary navigation
      const currentUrl = constructUrl(
        validPage,
        location.pathname,
        location.search
      );
      lastNavigatedUrlRef.current = currentUrl;

      // Always update from URL changes to ensure synchronization
      // This handles browser back/forward navigation
      setCurrentPageState(validPage);
    }
  }, [
    location.pathname,
    location.search,
    constructUrl,
    currentPage,
    navigate,
  ]);

  // Validate current page when total_pages changes
  useEffect(() => {
    const hasRealData = total_pages !== undefined && total_pages > 1 && total_results !== undefined && total_results > 0;

    if (
      total_pages !== undefined &&
      total_pages !== null &&
      !isNaN(total_pages) &&
      hasRealData && // Only validate when we have real data from TMDB
      !pageSetFromProps // Don't validate if page was set from props
    ) {
      if (total_pages === 0) {
        // No pages available, redirect to page 1
        setCurrentPageState(1);
      } else if (currentPage > total_pages) {
        // Only redirect if we're way beyond the reported total_pages
        // Allow some buffer for TMDB API inconsistencies
        const buffer = 50; // Allow 50 pages beyond reported total_pages
        if (currentPage > total_pages + buffer) {
          setCurrentPageState(total_pages);
        }
      }
    }
  }, [total_pages, currentPage, pageSetFromProps, total_results]);

  // Handle case where API returns different page than requested
  useEffect(() => {
    if (page !== undefined && page !== null && !isNaN(page) && !isLoading) {
      // Check if TMDB returned a different page than requested
      if (page !== currentPage) {
        // Only redirect pages that are truly beyond TMDB's documented limits
        if (page === 1 && currentPage > 500) {
          // Redirect to TMDB's documented maximum
          const maxPage = 500;
          setCurrentPageState(maxPage);
        }
        // For other page mismatches within TMDB's documented limits (1-500)
        else if (currentPage <= 500) {
          setCurrentPageState(page);
        }
      }
    }
  }, [page, currentPage, isLoading, pageSetFromProps]);

  return {
    currentPage,
    handlePageChange,
    resetToPageOne,
    isProcessingReset,
  };
}