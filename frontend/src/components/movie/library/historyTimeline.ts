import type { HistoryRow } from "@/services/userMovieDataService";

export type HistoryItem =
    | { type: "month"; key: string; day: string }
    | { type: "entry"; key: string; entry: HistoryRow; showDay: boolean };

/** Keep each timeline row once and add the calendar labels in the server's timeline order. */
export function historyTimeline(entries: HistoryRow[]): HistoryItem[] {
    const seen = new Set<string>();
    const items: HistoryItem[] = [];
    let previousMonth = "";
    let previousDay = "";
    for (const entry of entries) {
        const key =
            entry.kind === "changes"
                ? `changes-${entry.day}-${entry.field}`
                : `entry-${entry.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
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
            key,
            entry,
            showDay: entry.day !== previousDay,
        });
        previousDay = entry.day;
    }
    return items;
}
