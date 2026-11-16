import { MutationObserver, type QueryClient } from "@tanstack/react-query";
import { toaster } from "@/components/core/chakra/toaster";
import { saveFeedback } from "@/hooks/movie/saveFeedback";
import { entryMutationOptions } from "@/hooks/movie/useMovieEntries";
import { saveMutationOptions } from "@/hooks/movie/useUserMovieState";
import { createSaveToastId, getChangeCount } from "@/lib/session";
import type { EntrySavedResult } from "./EntryForm";

/** Confirm one completed dialog write; its Undo survives the form's unmount. */
export function showEntryFeedback(
    client: QueryClient,
    result: EntrySavedResult,
) {
    const change = getChangeCount();
    const feedback = saveFeedback(result.shown, result.record, result.sent);
    const undo = async () => {
        if (change !== getChangeCount()) return;
        if (result.kind === "create") {
            await new MutationObserver(
                client,
                entryMutationOptions(result.record.tmdb_id),
            ).mutate({
                kind: "entry",
                operation: "delete",
                entryId: result.entryId,
                change,
            });
        }
        if (change !== getChangeCount() || !feedback.undo) return;
        await new MutationObserver(
            client,
            saveMutationOptions(result.record.tmdb_id),
        ).mutate({
            kind: "save",
            changes: feedback.undo,
            shown: result.record,
            undo: true,
            change,
        });
    };
    toaster.success({
        id: createSaveToastId(),
        title:
            result.kind === "edit"
                ? "Entry updated"
                : result.kind === "save"
                  ? "Saved"
                  : result.dateOn
                    ? "Logged"
                    : "Review saved",
        description: feedback.description,
        action:
            result.kind === "create" ||
            (result.kind === "save" && feedback.undo)
                ? {
                      label: "Undo",
                      onClick: () => {
                          void undo().catch(() => {});
                      },
                  }
                : undefined,
    });
}
