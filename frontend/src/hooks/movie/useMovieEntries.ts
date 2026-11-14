import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { CanceledError } from "axios";
import {
    createMovieEntry,
    editMovieEntry,
    deleteMovieEntry,
    type EntryInput,
    type EntryWriteResponse,
} from "@/services/userMovieDataService";
import { entriesKey, libraryKey } from "@/lib/queries";
import {
    createSaveToastId,
    getChangeCount,
    getSaveSignal,
} from "@/lib/session";
import { toaster } from "@/components/core/chakra/toaster";
import { movieWriteOptions, type EntryVariables } from "./movieWriteOptions";

export function useMovieEntries(tmdbId: number) {
    const observerOwner = useRef<number | undefined>(undefined);
    const mutation = useMutation({
        ...movieWriteOptions(tmdbId),
        mutationFn: (variables: EntryVariables) => {
            const config = {
                signal: getSaveSignal(variables.change),
                shouldReportServerError: () =>
                    variables.change === getChangeCount(),
            };
            if (variables.operation === "delete")
                return deleteMovieEntry(tmdbId, variables.entryId, config).then(
                    (response) => response.data,
                );
            if (variables.operation === "edit")
                return editMovieEntry(
                    tmdbId,
                    variables.entryId,
                    variables.data,
                    config,
                ).then((response) => response.data);
            return createMovieEntry(tmdbId, variables.data, config).then(
                (response) => response.data,
            );
        },
        onMutate: (variables) => variables.change,
        onSuccess: (_data, variables, _context, { client }) => {
            if (variables.change !== getChangeCount()) return;
            void client.invalidateQueries({ queryKey: libraryKey });
            void client.invalidateQueries({ queryKey: entriesKey });
        },
        onError: (_error, variables) => {
            if (variables.change !== getChangeCount()) return;
            toaster.error({
                id: createSaveToastId(),
                title: "Failed to save entry",
                description: "Please try again.",
            });
        },
    });
    const withTimeZone = (data: EntryInput) => ({
        ...data,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    // Cache retirement drops paused executions without settling their promises.
    // Bind the caller before queueing, and detach its observer when ownership ends.
    const writeEntry = (variables: EntryVariables) =>
        new Promise<EntryWriteResponse>((resolve, reject) => {
            const signal = getSaveSignal(variables.change);
            const retire = () => {
                signal.removeEventListener("abort", retire);
                if (observerOwner.current === variables.change)
                    mutation.reset();
                reject(new CanceledError("Entry belongs to an earlier user"));
            };
            if (signal.aborted) {
                retire();
                return;
            }
            observerOwner.current = variables.change;
            signal.addEventListener("abort", retire, { once: true });
            // Keep both handlers even after retirement so transport rejection is handled.
            void mutation.mutateAsync(variables).then(
                (data) => {
                    signal.removeEventListener("abort", retire);
                    resolve(data);
                },
                (error: unknown) => {
                    signal.removeEventListener("abort", retire);
                    reject(
                        error instanceof Error
                            ? error
                            : new Error("Entry write failed"),
                    );
                },
            );
        });
    return {
        isPending: mutation.isPending,
        createEntry: (data: EntryInput) =>
            writeEntry({
                kind: "entry",
                operation: "create",
                data: withTimeZone(data),
                change: getChangeCount(),
            }),
        editEntry: (entryId: number, data: EntryInput) =>
            writeEntry({
                kind: "entry",
                operation: "edit",
                entryId,
                data: withTimeZone(data),
                change: getChangeCount(),
            }),
        deleteEntry: (entryId: number) =>
            writeEntry({
                kind: "entry",
                operation: "delete",
                entryId,
                change: getChangeCount(),
            }),
    };
}
