/**
 * BrowseSequential - Reference implementation for sequential pagination
 *
 * This page uses SequentialMovieGrid instead of VirtualizedMovieGrid,
 * providing prev/next pagination rather than infinite scroll.
 *
 * Route: /browse/sequential
 *
 * Retained as an alternative pagination approach for reference.
 */
import SequentialMovieGrid from "@/components/movie/collection/SequentialMovieGrid";

const BrowseSequential = () => {
  return <SequentialMovieGrid />;
};

export default BrowseSequential;
