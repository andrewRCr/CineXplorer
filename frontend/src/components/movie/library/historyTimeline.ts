import type { HistoryEntry } from "@/services/userMovieDataService";

export type HistoryItem =
    | { type: "month"; key: string; day: string }
    | { type: "entry"; key: string; entry: HistoryEntry; showDay: boolean };

/** Keep each entry once and add the calendar labels in the server's timeline order. */
export function historyTimeline(entries: HistoryEntry[]): HistoryItem[] {
    const seen = new Set<number>();
    const items: HistoryItem[] = [];
    let previousMonth = "";
    let previousDay = "";
    for (const entry of entries) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        const month = entry.day.slice(0, 7);
        if (month !== previousMonth) {
            items.push({
                type: "month",
                key: `month-${month}`,
                day: entry.day,
            });
            previousMonth = month;
        }
        items.push({
            type: "entry",
            key: `entry-${entry.id}`,
            entry,
            showDay: entry.day !== previousDay,
        });
        previousDay = entry.day;
    }
    return items;
}
