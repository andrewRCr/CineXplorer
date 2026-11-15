import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { useLocation } from "react-router";
import {
    useWindowVirtualizer,
    type Virtualizer,
    type VirtualizerOptions,
} from "@tanstack/react-virtual";
import { isRecord } from "@/utilities/typeGuards";
import { useScrollPersistence } from "@/hooks/movie/useScrollPersistence";
import {
    canRestoreLibrary,
    libraryMeasurements,
    keepLibraryMeasurements,
    markLibraryPositionSaved,
} from "./libraryScrollMemory";

type MeasuredOptions = Pick<
    VirtualizerOptions<Window, Element>,
    | "count"
    | "estimateSize"
    | "getItemKey"
    | "gap"
    | "scrollMargin"
    | "overscan"
>;

/** Preserve the window position together with this collection's measured rows. */
export function useMeasuredLibrary({
    source,
    params,
    isLoading,
    hasContent,
    isError,
    ...options
}: MeasuredOptions & {
    source: string;
    params: object;
    isLoading: boolean;
    hasContent: boolean;
    isError: boolean;
}) {
    const instance = useRef<{
        key: string;
        value: Virtualizer<Window, Element>;
    } | null>(null);
    const onSave = useCallback((key: string) => {
        if (instance.current?.key === key)
            markLibraryPositionSaved(
                key,
                instance.current.value.takeSnapshot(),
            );
    }, []);
    const { initialOffset, scrollStorageKey } = useScrollPersistence({
        source,
        browseParams: params,
        isLoading,
        hasContent,
        isError,
        canRestore: canRestoreLibrary,
        onSave,
    });
    const navigationState: unknown = useLocation().state;
    const [restore] = useState(() => ({
        key: scrollStorageKey,
        measurements:
            isRecord(navigationState) &&
            navigationState.restoreScroll === true &&
            canRestoreLibrary(scrollStorageKey)
                ? libraryMeasurements(scrollStorageKey)
                : undefined,
    }));
    const virtualizer = useWindowVirtualizer({
        ...options,
        initialOffset,
        initialMeasurementsCache:
            restore.key === scrollStorageKey ? restore.measurements : undefined,
    });
    useLayoutEffect(() => {
        instance.current = { key: scrollStorageKey, value: virtualizer };
    });
    useEffect(
        () => () => {
            const last = instance.current;
            if (last)
                keepLibraryMeasurements(last.key, last.value.takeSnapshot());
        },
        [],
    );
    return virtualizer;
}
