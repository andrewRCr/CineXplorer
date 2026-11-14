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
import {
    createSaveToastId,
    getChangeCount,
    getSaveSignal,
} from "@/lib/session";
import { libraryKey } from "@/lib/queries";
import { toaster } from "@/components/core/chakra/toaster";

import {
    movieWriteKey,
    movieWriteOptions,
    type SaveVariables,
    type MovieWriteVariables,
    type MovieWriteResponse,
} from "./movieWriteOptions";

export const saveMutationOptions = (
    tmdbId: number,
): UseMutationOptions<UserMovieDataSchema, Error, SaveVariables, number> =>
    mutationOptions({
        ...movieWriteOptions(tmdbId),
        mutationFn: ({ changes, change, undo }: SaveVariables) => {
            return saveUserMovieData(
                tmdbId,
                undo ? { ...changes, undo: true } : changes,
                {
                    signal: getSaveSignal(change),
                    shouldReportServerError: () => change === getChangeCount(),
                },
            ).then((response) => response.data);
        },
        onMutate: ({ change }) => change,
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
                                          kind: "save",
                                          undo: true,
                                          change,
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
        filters: { mutationKey: movieWriteKey(tmdbId), exact: true },
        // Record and entry options are the only writers of this key; both use these union types.
        select: (item) =>
            item.state as MutationState<
                MovieWriteResponse,
                Error,
                MovieWriteVariables,
                number
            >,
    });
    let state: UserMovieDataSchema = payload ?? {
        tmdb_id: tmdbId ?? 0,
        user_on_watchlist: false,
        user_watched: false,
        user_liked: false,
        user_rating: null,
        has_entries: false,
        last_logged_on: null,
    };
    // The cache preserves insertion order even when submittedAt timestamps tie.
    for (const save of saves) {
        if (save.status === "success" && save.data)
            state = "record" in save.data ? save.data.record : save.data;
    }
    for (const save of saves) {
        if (save.status === "pending" && save.variables?.kind === "save")
            state = { ...state, ...save.variables?.changes };
    }
    return {
        state,
        save: (changes: UserMovieDataPatchSchema) => {
            if (tmdbId !== undefined)
                mutation.mutate({
                    kind: "save",
                    changes,
                    change: getChangeCount(),
                });
        },
    };
}
