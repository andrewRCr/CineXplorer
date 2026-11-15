import type { VirtualItem } from "@tanstack/react-virtual";

const rows = new Map<string, VirtualItem[]>();
const savedPositions = new Set<string>();
export const canRestoreLibrary = (key: string) =>
    savedPositions.has(key) && (rows.get(key)?.length ?? 0) > 0;
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
    rows.clear();
    savedPositions.clear();
}
