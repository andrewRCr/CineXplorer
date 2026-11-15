import { describe, it, expect } from "vitest";
import { groupByOpeningWeek } from "@/utilities/groupByOpeningWeek";
import { createMockMovieListItem } from "@tests/mocks/movieData";
const film = (id: number, date: string) =>
    createMockMovieListItem({ tmdb_id: id, release_date: date });

describe("opening weeks", () => {
    it("groups Monday through Sunday without moving a calendar date", () => {
        const weeks = groupByOpeningWeek(
            [
                film(1, "2026-11-22"),
                film(2, "2026-11-16"),
                film(3, "2026-11-27"),
            ],
            3,
        );
        expect(
            weeks.map((w) => [w.monday, w.films.map((f) => f.tmdb_id)]),
        ).toEqual([
            ["2026-11-16", [1, 2]],
            ["2026-11-23", [3]],
        ]);
        expect(weeks[0]?.heading).toBe("Week of November 16");
    });
    it.each([2, 3])(
        "caps the first twenty films at %s per week and counts the rest",
        (cap) => {
            const films = Array.from({ length: 21 }, (_, i) =>
                film(i, "2026-11-20"),
            );
            const [week] = groupByOpeningWeek(films, cap);
            expect(week?.films.map((f) => f.tmdb_id)).toEqual(
                Array.from({ length: cap }, (_, i) => i),
            );
            expect(week?.remaining).toBe(20 - cap);
        },
    );
    it("takes the first four occupied weeks in date order and skips missing dates", () => {
        const weeks = groupByOpeningWeek(
            [
                film(1, "2027-02-19"),
                film(2, "2026-12-04"),
                film(3, "2026-12-18"),
                film(4, "2026-11-20"),
                film(5, "2027-01-08"),
                createMockMovieListItem({ release_date: null }),
            ],
            3,
        );
        expect(weeks.map((w) => w.monday)).toEqual([
            "2026-11-16",
            "2026-11-30",
            "2026-12-14",
            "2027-01-04",
        ]);
    });
});
