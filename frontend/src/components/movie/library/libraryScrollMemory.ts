import type { VirtualItem } from "@tanstack/react-virtual";

const rows = new Map<string, VirtualItem[]>();
const expandedGroups = new Set<string>();
const expansionListeners = new Set<() => void>();
export const isHistoryGroupExpanded = (key: string) => expandedGroups.has(key);
export function subscribeHistoryExpansion(listener: () => void) {
    expansionListeners.add(listener);
    return () => {
        expansionListeners.delete(listener);
    };
}
export function setHistoryGroupExpanded(key: string, expanded: boolean) {
    if (expanded) expandedGroups.add(key);
    else expandedGroups.delete(key);
    for (const listener of expansionListeners) listener();
}
const savedPositions = new Set<string>();
export const canRestoreLibrary = (key: string) =>
    savedPositions.has(key) && (rows.get(key)?.length ?? 0) > 0;
/** A fresh visit supersedes the previous visit until another position is saved. */
export function invalidateLibraryRestoration(key: string) {
    savedPositions.delete(key);
}
export const libraryMeasurements = (key: string) => rows.get(key);
export function keepLibraryMeasurements(
    key: string,
    measurements: VirtualItem[],
) {
    rows.set(key, measurements);
}
export function markLibraryPositionSaved(
    key: string,
    measurements: VirtualItem[],
) {
    keepLibraryMeasurements(key, measurements);
    savedPositions.add(key);
}
/** A reload naturally empties this memory; a change of user clears it explicitly. */
export function clearLibraryScrollMemory() {
    expandedGroups.clear();
    for (const listener of expansionListeners) listener();
    rows.clear();
    savedPositions.clear();
}
