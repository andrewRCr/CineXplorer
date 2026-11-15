import type {
    EntryWriteInput,
    UserMovieDataPatchSchema,
    UserMovieDataSchema,
    EntryWriteResponse,
} from "@/services/userMovieDataService";

export type SaveVariables = {
    kind: "save";
    changes: UserMovieDataPatchSchema;
    undo?: boolean;
    change: number;
};
export type EntryVariables = { kind: "entry"; change: number } & (
    | { operation: "create"; data: EntryWriteInput }
    | { operation: "edit"; entryId: number; data: EntryWriteInput }
    | { operation: "delete"; entryId: number }
);
export type MovieWriteVariables = SaveVariables | EntryVariables;
export type MovieWriteResponse = UserMovieDataSchema | EntryWriteResponse;

export const movieWriteKey = (tmdbId: number | undefined) =>
    ["movie-save", tmdbId] as const;

/** Every write of a film shares its queue and keeps its confirmed record. */
export const movieWriteOptions = (tmdbId: number) => ({
    mutationKey: movieWriteKey(tmdbId),
    scope: { id: `movie-save:${tmdbId}` },
    gcTime: Infinity,
});
