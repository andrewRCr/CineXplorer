import { genreOptions, languageOptions } from "@/constants/browseOptions";
import type { BrowseParams, SortOptionValue } from "@/types/browseTypes";
import type { CatalogWindow } from "./catalogWindow";
import { readYearBounds } from "./browseParamMapper";

const windowNames: Record<CatalogWindow, string> = {
    browse: "All films",
    "now-playing": "In theaters",
    upcoming: "Coming soon",
};
const patterns: Record<
    CatalogWindow,
    Partial<Record<SortOptionValue, readonly [string, string]>>
> = {
    browse: {
        "popularity.desc": ["Popular films", "Popular {films}"],
        "vote_average.desc": ["Highest-rated films", "Highest-rated {films}"],
        "release_date.desc": ["Newest films", "Newest {films}"],
        "release_date.asc": ["Oldest films", "Oldest {films}"],
        "original_title.asc": ["Films, A to Z", "{Films}, A to Z"],
    },
    "now-playing": {
        "popularity.desc": [
            "Popular in theaters",
            "Popular {films} in theaters",
        ],
        "vote_average.desc": [
            "Highest rated in theaters",
            "Highest-rated {films} in theaters",
        ],
        "release_date.desc": [
            "Newest in theaters",
            "Newest {films} in theaters",
        ],
        "release_date.asc": [
            "Longest in theaters",
            "{Films} longest in theaters",
        ],
        "original_title.asc": [
            "Films in theaters, A to Z",
            "{Films} in theaters, A to Z",
        ],
    },
    upcoming: {
        "popularity.desc": ["Most anticipated", "Most anticipated {films}"],
        "release_date.desc": [
            "Coming soon, furthest out",
            "{Films} coming soon, furthest out",
        ],
        "release_date.asc": [
            "Coming soon, soonest first",
            "{Films} coming soon, soonest first",
        ],
        "original_title.asc": [
            "Films coming soon, A to Z",
            "{Films} coming soon, A to Z",
        ],
    },
};

function selectionWords(params: BrowseParams): string[] {
    const language =
        params.language &&
        languageOptions.find((option) => option.value === params.language)
            ?.label;
    const genres =
        params.genres.length < 3
            ? params.genres
                  .map((id) => {
                      const label = genreOptions.find(
                          (option) => option.value === String(id),
                      )?.label;
                      if (label === "Animation") return "animated";
                      if (label === "TV Movie") return "made-for-TV";
                      return label?.toLowerCase();
                  })
                  .filter((word): word is string => word !== undefined)
                  .sort((a, b) => a.localeCompare(b))
            : [];
    return [
        language ? `${language}-language` : "",
        genres.join(" and "),
    ].filter(Boolean);
}

function yearDescription(params: BrowseParams): string {
    const { minimum, maximum } = readYearBounds(params);
    if (minimum !== undefined && maximum !== undefined) {
        if (minimum === maximum) return String(minimum);
        if (minimum % 10 === 0 && maximum === minimum + 9) return `${minimum}s`;
        return `${minimum}–${maximum}`;
    }
    if (minimum !== undefined) return `since ${minimum}`;
    if (maximum !== undefined) return `through ${maximum}`;
    return "";
}

/** Name the window, ordering and labelled selection using the same year bounds as its request. */
export function catalogTitle(
    window: CatalogWindow,
    params: BrowseParams,
): string {
    const words = selectionWords(params);
    const films = [...words, "films"].join(" ");
    const capitalized = films.charAt(0).toUpperCase() + films.slice(1);
    const pattern = Object.hasOwn(patterns[window], params.sortBy)
        ? patterns[window][params.sortBy]
        : undefined;
    const title = pattern
        ? pattern[words.length ? 1 : 0]
              .replace("{films}", films)
              .replace("{Films}", capitalized)
        : `${windowNames[window]}${words.length ? `: ${films}` : ""}`;
    const years = window === "browse" ? yearDescription(params) : "";
    return years ? `${title}, ${years}` : title;
}
