/**
 * BrowseVirtualized - Temporary testing page for virtualized infinite scroll
 *
 * This page is identical to Browse but uses VirtualizedMovieGrid instead of
 * InfiniteMovieGrid. Used for testing virtualization + scroll restoration
 * during infinite scroll migration.
 *
 * Route: /browse/virtualized
 *
 * Note: Temporary page - remove once pagination approach is finalized.
 */
import VirtualizedMovieGrid from "@/components/movie/collection/VirtualizedMovieGrid";

const BrowseVirtualized = () => {
  return <VirtualizedMovieGrid />;
};

export default BrowseVirtualized;
