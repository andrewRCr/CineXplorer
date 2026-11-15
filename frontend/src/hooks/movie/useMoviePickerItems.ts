import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { moviePickerQuery } from "@/lib/queries";

export function useMoviePickerItems(text: string) {
    const [debounced, setDebounced] = useState("");
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(text.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [text]);
    const trimmed = text.trim();
    const enabled = trimmed.length >= 2;
    const query = useQuery({
        ...moviePickerQuery(debounced),
        enabled: enabled && trimmed === debounced,
        placeholderData: keepPreviousData,
    });
    return {
        items: enabled ? (query.data ?? []) : [],
        isSearching: enabled && (trimmed !== debounced || query.isFetching),
        isError: query.isError,
    };
}
