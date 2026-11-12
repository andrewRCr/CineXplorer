import type { QueryClient } from "@tanstack/react-query";
import { toaster } from "@/components/core/chakra/toaster";

/** A tab's save ownership changes whenever its signed-in user changes. */
let changeCount = 0;
let toastSequence = 0;
const saveToastPrefix = "movie-save:";

export const getChangeCount = () => changeCount;
export const createSaveToastId = () =>
    `${saveToastPrefix}${changeCount}:${++toastSequence}`;
export const sessionKey = ["session"] as const;

export function beginUserChange(client: QueryClient) {
    changeCount++;
    client.getMutationCache().clear();
    for (const toast of toaster.getVisibleToasts()) {
        if (toast.id?.startsWith(saveToastPrefix)) toaster.remove(toast.id);
    }
}
export const resetUserQueries = (client: QueryClient) =>
    client.resetQueries({
        predicate: (query) => query.queryKey[0] !== sessionKey[0],
    });
export function changeOfUser(client: QueryClient) {
    beginUserChange(client);
    return resetUserQueries(client);
}
