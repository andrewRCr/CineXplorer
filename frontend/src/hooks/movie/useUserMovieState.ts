import {
    mutationOptions,
    MutationObserver,
    useMutation,
    useMutationState,
    type MutationState,
    type UseMutationOptions,
} from "@tanstack/react-query";
import {
    saveUserMovieData,
    type UserMovieDataPatchSchema,
    type UserMovieDataSchema,
} from "@/services/userMovieDataService";
import { createSaveToastId, getChangeCount } from "@/lib/session";
import { libraryKey } from "@/lib/queries";
import { toaster } from "@/components/core/chakra/toaster";

type SaveVariables = { changes: UserMovieDataPatchSchema; undo?: boolean };
const saveKey = (tmdbId: number | undefined) => ["movie-save", tmdbId] as const;

export const saveMutationOptions = (
    tmdbId: number,
): UseMutationOptions<UserMovieDataSchema, Error, SaveVariables, number> =>
    mutationOptions({
        mutationKey: saveKey(tmdbId),
        scope: { id: `movie-save:${tmdbId}` },
        gcTime: Infinity,
        mutationFn: ({ changes }: SaveVariables) =>
            saveUserMovieData(tmdbId, changes).then(
                (response) => response.data,
            ),
        onMutate: () => getChangeCount(),
        onSuccess: (record, variables, change, { client }) => {
            if (change !== getChangeCount()) return;
            void client.invalidateQueries({ queryKey: libraryKey });
            if ("user_on_watchlist" in variables.changes) {
                toaster.success({
                    id: createSaveToastId(),
                    action: variables.undo
                        ? undefined
                        : {
                              label: "Undo",
                              onClick: () => {
                                  if (change !== getChangeCount()) return;
                                  const observer = new MutationObserver(
                                      client,
                                      saveMutationOptions(tmdbId),
                                  );
                                  void observer
                                      .mutate({
                                          changes: {
                                              user_on_watchlist:
                                                  !record.user_on_watchlist,
                                          },
                                          undo: true,
                                      })
                                      .catch(() => {});
                              },
                          },
                    title: record.user_on_watchlist
                        ? "Added to watchlist"
                        : "Removed from watchlist",
                });
            }
        },
        onError: (_error, variables, change) => {
            if (change !== getChangeCount()) return;
            toaster.error({
                id: createSaveToastId(),
                title:
                    "user_on_watchlist" in variables.changes
                        ? "Failed to update watchlist"
                        : "Failed to save changes",
                description: "Please try again.",
            });
        },
    });

export function useUserMovieState(
    tmdbId: number | undefined,
    payload: UserMovieDataSchema | null | undefined,
) {
    const mutation = useMutation(saveMutationOptions(tmdbId ?? 0));
    const saves = useMutationState({
        filters: { mutationKey: saveKey(tmdbId), exact: true },
        // Only saveMutationOptions writes this key, so its state carries these types.
        select: (item) =>
            item.state as MutationState<
                UserMovieDataSchema,
                Error,
                SaveVariables,
                number
            >,
    });
    let state: UserMovieDataSchema = payload ?? {
        tmdb_id: tmdbId ?? 0,
        user_on_watchlist: false,
        user_watched: false,
        user_liked: false,
        user_rating: null,
        user_review: null,
        watched_at: null,
    };
    // The cache preserves insertion order even when submittedAt timestamps tie.
    for (const save of saves) {
        if (save.status === "success" && save.data) state = save.data;
    }
    for (const save of saves) {
        if (save.status === "pending")
            state = { ...state, ...save.variables?.changes };
    }
    return {
        state,
        save: (changes: UserMovieDataPatchSchema) => {
            if (tmdbId !== undefined) mutation.mutate({ changes });
        },
    };
}
