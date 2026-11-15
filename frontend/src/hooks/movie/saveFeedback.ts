import type {
    UserMovieDataPatchSchema,
    UserMovieDataSchema,
} from "@/services/userMovieDataService";

const fields = [
    "user_watched",
    "user_on_watchlist",
    "user_liked",
    "user_rating",
] as const;

/** Compare the state the visitor acted on with the server's complete answer. */
export function saveFeedback(
    shown: UserMovieDataSchema,
    record: UserMovieDataSchema,
    sent: UserMovieDataPatchSchema,
) {
    const differs = (field: (typeof fields)[number]) =>
        shown[field] !== record[field];
    const ruleChanged = (field: (typeof fields)[number]) =>
        !(field in sent) && differs(field);
    const markedWatched = ruleChanged("user_watched") && record.user_watched;
    const removedWatchlist =
        ruleChanged("user_on_watchlist") && !record.user_on_watchlist;
    const clearedLike = ruleChanged("user_liked") && !record.user_liked;
    const description =
        [
            markedWatched && removedWatchlist
                ? "Also marked as watched and removed from your watchlist."
                : markedWatched
                  ? "Also marked as watched."
                  : removedWatchlist
                    ? "Also removed from your watchlist."
                    : undefined,
            clearedLike ? "Your like was removed." : undefined,
        ]
            .filter(Boolean)
            .join(" ") || undefined;
    const title =
        "user_on_watchlist" in sent
            ? record.user_on_watchlist
                ? "Added to watchlist"
                : "Removed from watchlist"
            : "user_rating" in sent
              ? sent.user_rating === null
                  ? "Rating cleared"
                  : "Rated"
              : "user_liked" in sent
                ? "Liked"
                : sent.user_watched
                  ? "Marked as watched"
                  : "Marked as not watched";

    let undo: UserMovieDataPatchSchema = {};
    for (const field of fields) {
        if (differs(field)) undo = { ...undo, [field]: shown[field] };
    }
    if (differs("user_watched")) {
        undo.user_on_watchlist ??= record.user_on_watchlist;
        undo.user_liked ??= record.user_liked;
    }
    return {
        title,
        description,
        shouldToast:
            "user_on_watchlist" in sent ||
            sent.user_rating === null ||
            ruleChanged("user_on_watchlist") ||
            clearedLike,
        undo: Object.keys(undo).length ? undo : undefined,
    };
}
