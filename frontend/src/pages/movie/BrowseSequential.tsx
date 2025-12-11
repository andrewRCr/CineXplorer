/**
 * BrowseSequential - Temporary A/B testing page for sequential pagination
 *
 * This page is identical to Browse but uses SequentialMovieGrid instead of
 * InfiniteMovieGrid. Used for A/B comparison during infinite scroll migration.
 *
 * Route: /browse/sequential
 *
 * Note: Temporary page - remove once pagination approach is finalized.
 */
import SequentialMovieGrid from "@/components/movie/collection/SequentialMovieGrid";

const BrowseSequential = () => {
  return <SequentialMovieGrid />;
};

export default BrowseSequential;
