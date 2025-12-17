import { useApiRequest } from "@/hooks/useApiRequest";
import { useMemo } from "react";
import type React from "react";
import type { MovieDetail } from "@/types/movie";

type FetchDetailFn = () => {
    request: Promise<{ data: MovieDetail }>;
    cancel: () => void;
};

const useMovieDetail = (fetchFn: FetchDetailFn): {
    movie: MovieDetail | undefined;
    error: string;
    setMovie: React.Dispatch<React.SetStateAction<MovieDetail | undefined>>;
    setError: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
} => {
    const stableFetcher = useMemo(() => fetchFn, [fetchFn]);
    const {
        data: movie,
        error,
        setData: setMovie,
        setError,
        isLoading,
    } = useApiRequest<MovieDetail>(stableFetcher);
    return { movie, error, setMovie, setError, isLoading };
};

export default useMovieDetail;
