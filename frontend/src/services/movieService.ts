import create from "./httpService";

export const fetchNowPlayingMoviesService = create("/movie/now-playing/");
export const fetchUpcomingMovies = () => create("/movie/upcoming");
export const fetchMovieDetail = () => create("/movie/find");
export const fetchDiscoverMoviesService = create("/movie/discover/");
export const fetchMovieGenresService = create("/movie/genres/");
export const fetchTopRatedMoviesService = create("/movie/top-rated/");
export const fetchSearchMoviesService = create("/movie/search/");
