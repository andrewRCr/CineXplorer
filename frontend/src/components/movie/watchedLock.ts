import type { UserMovieDataSchema } from "@/services/userMovieDataService";

export const WATCHED_LOCK_EXPLANATION =
    "Watched stays on while this film has your rating or any entries.";

export function isWatchedLocked(record: UserMovieDataSchema): boolean {
    return record.user_rating != null || record.has_entries;
}
