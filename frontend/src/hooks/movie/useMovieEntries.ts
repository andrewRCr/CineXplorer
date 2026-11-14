import { useMutation } from "@tanstack/react-query";
import {
    createMovieEntry,
    editMovieEntry,
    deleteMovieEntry,
    type EntryInput,
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
    return {
        isPending: mutation.isPending,
        createEntry: (data: EntryInput) =>
            mutation.mutateAsync({
                kind: "entry",
                operation: "create",
                data: withTimeZone(data),
                change: getChangeCount(),
            }),
        editEntry: (entryId: number, data: EntryInput) =>
            mutation.mutateAsync({
                kind: "entry",
                operation: "edit",
                entryId,
                data: withTimeZone(data),
                change: getChangeCount(),
            }),
        deleteEntry: (entryId: number) =>
            mutation.mutateAsync({
                kind: "entry",
                operation: "delete",
                entryId,
                change: getChangeCount(),
            }),
    };
}
