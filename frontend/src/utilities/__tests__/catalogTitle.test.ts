import { describe, expect, it } from "vitest";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";
import type { BrowseParams, SortOptionValue } from "@/types/browseTypes";
import type { CatalogWindow } from "../catalogWindow";
import { parseBrowseParamsFromUrl } from "../browseUrlSync";
import { catalogTitle } from "../catalogTitle";

const rows: [CatalogWindow, SortOptionValue, string | null, string][] = [
    [
        "browse",
        "popularity.desc",
        "Popular films",
        "Popular French-language horror films",
    ],
    [
        "browse",
        "vote_average.desc",
        "Highest-rated films",
        "Highest-rated French-language horror films",
    ],
    [
        "browse",
        "release_date.desc",
        "Newest films",
        "Newest French-language horror films",
    ],
    [
        "browse",
        "release_date.asc",
        "Oldest films",
        "Oldest French-language horror films",
    ],
    [
        "browse",
        "original_title.asc",
        null,
        "French-language horror films, A to Z",
    ],
    [
        "now-playing",
        "popularity.desc",
        "Popular in theaters",
        "Popular French-language horror films in theaters",
    ],
    [
        "now-playing",
        "vote_average.desc",
        "Highest rated in theaters",
        "Highest-rated French-language horror films in theaters",
    ],
    [
        "now-playing",
        "release_date.desc",
        "Newest in theaters",
        "Newest French-language horror films in theaters",
    ],
    [
        "now-playing",
        "release_date.asc",
        "Longest in theaters",
        "French-language horror films longest in theaters",
    ],
    [
        "now-playing",
        "original_title.asc",
        null,
        "French-language horror films in theaters, A to Z",
    ],
    [
        "upcoming",
        "popularity.desc",
        "Most anticipated",
        "Most anticipated French-language horror films",
    ],
    [
        "upcoming",
        "release_date.desc",
        "Coming soon, furthest out",
        "French-language horror films coming soon, furthest out",
    ],
    [
        "upcoming",
        "release_date.asc",
        "Coming soon, soonest first",
        "French-language horror films coming soon, soonest first",
    ],
    [
        "upcoming",
        "original_title.asc",
        null,
        "French-language horror films coming soon, A to Z",
    ],
];
for (const [window, sortBy, plain, filtered] of rows) {
    if (plain)
        it(`names ${window} ${sortBy} without filters`, () => {
            expect(
                catalogTitle(window, { ...DEFAULT_BROWSE_PARAMS, sortBy }),
            ).toBe(plain);
        });
    it(`names ${window} ${sortBy} with a language and genre`, () => {
        expect(
            catalogTitle(window, {
                ...DEFAULT_BROWSE_PARAMS,
                sortBy,
                language: "fr",
                genres: [27],
            }),
        ).toBe(filtered);
    });
}

it.each([
    [28, "action"],
    [12, "adventure"],
    [16, "animated"],
    [35, "comedy"],
    [80, "crime"],
    [99, "documentary"],
    [18, "drama"],
    [10751, "family"],
    [14, "fantasy"],
    [36, "history"],
    [27, "horror"],
    [10402, "music"],
    [9648, "mystery"],
    [10749, "romance"],
    [878, "science fiction"],
    [10770, "made-for-TV"],
    [53, "thriller"],
    [10752, "war"],
    [37, "western"],
] as const)("names genre %s as %s", (id, label) => {
    expect(
        catalogTitle("browse", { ...DEFAULT_BROWSE_PARAMS, genres: [id] }),
    ).toBe(`Popular ${label} films`);
});

it.each([
    [{ language: "fr" }, "Popular French-language films"],
    [{ genres: [27, 35] }, "Popular comedy and horror films"],
    [
        { language: "fr", genres: [27, 35] },
        "Popular French-language comedy and horror films",
    ],
    [{ genres: [10770, 16] }, "Popular animated and made-for-TV films"],
    [{ genres: [27, 35, 18] }, "Popular films"],
    [{ language: "fr", genres: [27, 35, 18] }, "Popular French-language films"],
    [{ language: "unknown" }, "Popular films"],
    [{ genres: [99999] }, "Popular films"],
    [{ genres: [27, 99999] }, "Popular horror films"],
    [{ genres: [27, 35, 99999] }, "Popular films"],
    [
        { language: "fr", genres: [27, 35, 99999] },
        "Popular French-language films",
    ],
    [
        { minRating: "7", maxRating: "9", certifications: ["R"] },
        "Popular films",
    ],
] satisfies [Partial<BrowseParams>, string][])(
    "composes %j",
    (params, expected) => {
        expect(
            catalogTitle("browse", { ...DEFAULT_BROWSE_PARAMS, ...params }),
        ).toBe(expected);
    },
);

it.each([
    ["1980", "1989", "Popular films, 1980s"],
    ["1994", "1994", "Popular films, 1994"],
    ["1975", "1983", "Popular films, 1975–1983"],
    ["1990", "", "Popular films, since 1990"],
    ["", "1970", "Popular films, through 1970"],
    ["no", "1999", "Popular films"],
    ["1990", "no", "Popular films, since 1990"],
    ["", "no", "Popular films"],
    ["1990s", "1999", "Popular films, 1990s"],
    ["1990", "1980", "Popular films, 1990–1980"],
    ["0", "0", "Popular films, 0"],
])("reads year bounds %s to %s", (minYear, maxYear, expected) => {
    expect(
        catalogTitle("browse", { ...DEFAULT_BROWSE_PARAMS, minYear, maxYear }),
    ).toBe(expected);
});

it.each(["now-playing", "upcoming"] as const)("omits years on %s", (window) => {
    expect(
        catalogTitle(window, {
            ...DEFAULT_BROWSE_PARAMS,
            minYear: "1980",
            maxYear: "1989",
        }),
    ).toBe(
        window === "now-playing" ? "Popular in theaters" : "Most anticipated",
    );
});

describe.each(["unexpected", "toString", "constructor", "__proto__"])(
    "unknown sort %s",
    (sortBy) => {
        it.each([
            ["browse", "All films"],
            ["now-playing", "In theaters"],
            ["upcoming", "Coming soon"],
        ] as const)(
            "falls back to the window name on %s",
            (window, expected) => {
                expect(
                    catalogTitle(
                        window,
                        parseBrowseParamsFromUrl(`?sortBy=${sortBy}`),
                    ),
                ).toBe(expected);
                expect(
                    catalogTitle(
                        window,
                        parseBrowseParamsFromUrl(
                            `?sortBy=${sortBy}&language=fr&genres=27`,
                        ),
                    ),
                ).toBe(`${expected}: French-language horror films`);
            },
        );
    },
);

it.each([
    [
        "?sortBy=unexpected&language=fr&genres=27&minYear=1970&maxYear=1979",
        "All films: French-language horror films, 1970s",
    ],
    [
        "?sortBy=vote_average.desc&language=fr&genres=27&minYear=1970&maxYear=1979",
        "Highest-rated French-language horror films, 1970s",
    ],
    [
        "?sortBy=original_title.asc&language=fr&minYear=1990",
        "French-language films, A to Z, since 1990",
    ],
])("renders the complete selection %s", (search, expected) => {
    expect(catalogTitle("browse", parseBrowseParamsFromUrl(search))).toBe(
        expected,
    );
});

it("capitalizes a genre when it begins the title", () => {
    expect(
        catalogTitle("now-playing", {
            ...DEFAULT_BROWSE_PARAMS,
            sortBy: "release_date.asc",
            genres: [27],
        }),
    ).toBe("Horror films longest in theaters");
});
