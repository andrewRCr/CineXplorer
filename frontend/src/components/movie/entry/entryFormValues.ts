import type { MovieEntries } from "@/services/userMovieDataService";

export interface FormValues {
    dateOn: boolean;
    watchedOn: string;
    rating: number | null;
    review: string;
    rewatch: boolean;
    liked: boolean;
}

export function localToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isRewatch(entries: MovieEntries["entries"], date: string) {
    return entries.some(
        (entry) => entry.watched_on !== null && entry.watched_on <= date,
    );
}
