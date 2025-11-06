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

const CORE_GENRE_IDS = [
    "28", // Action
    "35", // Comedy
    "99", // Documentary
    "18", // Drama
    "10751", // Family
    "27", // Horror
    "878", // Science Fiction
    "53", // Thriller
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

// DISABLED: Runtime filtering options
// 
// TMDB's runtime filtering API is fundamentally broken and returns incorrect results.
// The issue is caused by data contamination from user-submitted translations where
// runtime data is often wrong or omitted entirely. TMDB has acknowledged this issue
// but states they don't intend to fix it.
//
// Evidence of the problem:
// - "Under 90 min" filter returns MORE results than no filter at all (725,797 vs 19,676)
// - "Over 150 min" filter barely reduces results (19,146 vs 19,676)
// - Testing with TMDB's official API test forms shows the same incorrect behavior
// - Only TMDB's client-facing website has working runtime filtering (likely client-side)
//
// To re-enable runtime filtering in the future, you would need to:
// 1. Fetch runtime data individually for each movie using /movie/{id} endpoint
// 2. Implement client-side filtering based on actual runtime values
// 3. Add caching layer to avoid 20+ API calls per page load
// 4. Accept 2-5 second page load delays when runtime filters are active
//
// Preserved for future implementation:
export const runtimeOptions = [
    { value: "", label: "Any Runtime" },
    { value: "0-90", label: "Under 90 min" },
    { value: "90-120", label: "90-120 min" },
    { value: "120-150", label: "120-150 min" },
    { value: "150-400", label: "Over 150 min" }, // Fixed from 999 to realistic upper bound
];

export type SortOptionValue =
    | "popularity.desc"
    | "popularity.asc"
    | "vote_average.desc"
    | "vote_average.asc"
    | "release_date.desc"
    | "release_date.asc"
    | "original_title.asc"
    | "original_title.desc";

export interface SortOption {
    value: SortOptionValue;
    label: string;
}

const ALL_SORT_OPTIONS: Record<string, SortOption> = {
    POPULARITY_DESC: { value: "popularity.desc", label: "Popularity" },
    POPULARITY_ASC: {
        value: "popularity.asc",
        label: "Popularity (Low to High)",
    },
    VOTE_AVERAGE_DESC: {
        value: "vote_average.desc",
        label: "Rating (High to Low)",
    },
    VOTE_AVERAGE_ASC: {
        value: "vote_average.asc",
        label: "Rating (Low to High)",
    },
    RELEASE_DATE_DESC: { value: "release_date.desc", label: "Release Date" },
    RELEASE_DATE_ASC: {
        value: "release_date.asc",
        label: "Release Date (Oldest)",
    },
    TITLE_ASC: { value: "original_title.asc", label: "A-Z" },
    TITLE_DESC: { value: "original_title.desc", label: "Title (Z-A)" },
};

export const minimalSortOptions: SortOption[] = [
    ALL_SORT_OPTIONS.POPULARITY_DESC,
    ALL_SORT_OPTIONS.RELEASE_DATE_DESC,
    ALL_SORT_OPTIONS.TITLE_ASC,
    { ...ALL_SORT_OPTIONS.VOTE_AVERAGE_DESC, label: "Rating" },
];

export const advancedSortOptions: SortOption[] = [
    { ...ALL_SORT_OPTIONS.POPULARITY_DESC, label: "Popularity (High to Low)" },
    ALL_SORT_OPTIONS.POPULARITY_ASC,
    ALL_SORT_OPTIONS.VOTE_AVERAGE_DESC,
    ALL_SORT_OPTIONS.VOTE_AVERAGE_ASC,
    { ...ALL_SORT_OPTIONS.RELEASE_DATE_DESC, label: "Release Date (Newest)" },
    ALL_SORT_OPTIONS.RELEASE_DATE_ASC,
    { ...ALL_SORT_OPTIONS.TITLE_ASC, label: "Title (A-Z)" },
    ALL_SORT_OPTIONS.TITLE_DESC,
];
