import type { SortOption } from "@/types/browseTypes";
import { CORE_GENRE_IDS } from "./browseDefaults";

// Master genre map for DRYness
const GENRE_MAP = {
    "28": "Action",
    "12": "Adventure",
    "16": "Animation",
    "35": "Comedy",
    "80": "Crime",
    "99": "Documentary",
    "18": "Drama",
    "10751": "Family",
    "14": "Fantasy",
    "36": "History",
    "27": "Horror",
    "10402": "Music",
    "9648": "Mystery",
    "10749": "Romance",
    "878": "Science Fiction",
    "10770": "TV Movie",
    "53": "Thriller",
    "10752": "War",
    "37": "Western",
};

export const genreOptions = [
    { value: "", label: "Any Genre" },
    ...Object.entries(GENRE_MAP)
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
];

export const coreGenreOptions = [
    { value: "", label: "Any Genre" },
    ...CORE_GENRE_IDS.map((id) => ({
        value: id,
        label: GENRE_MAP[id as keyof typeof GENRE_MAP],
    })),
];

// Dynamically generate last 2 years, then decade ranges capped at 1970s
// This creates exactly 9 menu items (including "Any Year") to match genre dropdown height
const CURRENT_YEAR = new Date().getFullYear();
const last2Years = Array.from({ length: 2 }, (_, i) => {
    const year = (CURRENT_YEAR - i).toString();
    return { value: year, label: year };
});
const decadeRanges = [
    "2020's",
    "2010's",
    "2000's",
    "1990's",
    "1980's",
    "1970's",
].map((decade) => ({ value: decade, label: decade }));

export const yearOptions = [
    { value: "", label: "Any Year" },
    ...last2Years,
    ...decadeRanges,
];

// Consolidated sort options (5 total) - single dropdown, no advanced/minimal split
// Only meaningful sort directions included:
// - popularity.asc removed (produces garbage results - untracked movies)
// - vote_average.asc removed (produces garbage results - unrated movies)
// - original_title.desc removed (Z-A broken for Latin languages - Unicode ordering
//   causes all non-Latin mislabeled movies to cluster at the front)
export const sortOptions: SortOption[] = [
    { value: "popularity.desc", label: "Most Popular" },
    { value: "vote_average.desc", label: "Highest Rated" },
    { value: "release_date.desc", label: "Newest" },
    { value: "release_date.asc", label: "Oldest" },
    { value: "original_title.asc", label: "Alphabetical" },
];

// US MPAA certification options for content rating filter
// Ordered from most permissive to most restrictive
// NR (Not Rated) first since it's the fallback for uncertified content
export const certificationOptions = [
    { value: "NR", label: "NR" },
    { value: "G", label: "G" },
    { value: "PG", label: "PG" },
    { value: "PG-13", label: "PG-13" },
    { value: "R", label: "R" },
    { value: "NC-17", label: "NC-17" },
];

// Language options - ordered by TMDB film count (as of 2024)
// ISO 639-1 codes used by TMDB's with_original_language parameter
// Source: https://www.themoviedb.org/movie (discovery page language filter)
export const languageOptions = [
    { value: "", label: "All Languages" },
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
    { value: "es", label: "Spanish" },
    { value: "ja", label: "Japanese" },
    { value: "de", label: "German" },
    { value: "pt", label: "Portuguese" },
    { value: "zh", label: "Chinese" },
    { value: "it", label: "Italian" },
    { value: "ru", label: "Russian" },
    { value: "ko", label: "Korean" },
    { value: "cs", label: "Czech" },
    { value: "ar", label: "Arabic" },
    { value: "nl", label: "Dutch" },
    { value: "sv", label: "Swedish" },
    { value: "hi", label: "Hindi" },
    { value: "tr", label: "Turkish" },
    { value: "pl", label: "Polish" },
    { value: "tl", label: "Tagalog" },
    { value: "yue", label: "Cantonese" },
    { value: "id", label: "Indonesian" },
    { value: "da", label: "Danish" },
    { value: "el", label: "Greek" },
    { value: "fa", label: "Persian" },
];
