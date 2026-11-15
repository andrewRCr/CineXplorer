import type { MovieListItem } from "@/types/movie";

export interface OpeningWeek {
    monday: string;
    heading: string;
    films: MovieListItem[];
    remaining: number;
}

/** Group calendar dates in UTC, retaining the incoming popularity order within a week. */
export function groupByOpeningWeek(
    films: MovieListItem[],
    perWeek: number,
): OpeningWeek[] {
    const weeks = new Map<string, MovieListItem[]>();
    for (const film of films.slice(0, 20)) {
        if (!film.release_date) continue;
        const date = new Date(`${film.release_date}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        const monday = date.toISOString().slice(0, 10);
        const group = weeks.get(monday) ?? [];
        group.push(film);
        weeks.set(monday, group);
    }
    return [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 4)
        .map(([monday, group]) => ({
            monday,
            heading: `Week of ${new Date(`${monday}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}`,
            films: group.slice(0, perWeek),
            remaining: Math.max(0, group.length - perWeek),
        }));
}
