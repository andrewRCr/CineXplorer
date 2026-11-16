import { useEffect } from "react";
import { useSearchParams } from "react-router";
import type { LibrarySortOption } from "@/components/movie/library/librarySort";

export function useLibrarySort(options: LibrarySortOption[]) {
    const [params, setParams] = useSearchParams();
    const fallback = options[0];
    if (!fallback) throw new Error("A collection must offer a default sort");
    const sort = params.get("sort") ?? fallback.sort;
    const direction = params.get("direction") ?? fallback.direction;
    const selected =
        options.find(
            (option) => option.sort === sort && option.direction === direction,
        ) ?? fallback;
    const address = (option: LibrarySortOption) => {
        const next = new URLSearchParams(params);
        next.delete("sort");
        next.delete("direction");
        if (option.sort !== fallback.sort) next.set("sort", option.sort);
        if (option.direction !== fallback.direction)
            next.set("direction", option.direction);
        return next;
    };
    const canonical = address(selected).toString();
    useEffect(() => {
        if (params.toString() !== canonical)
            void setParams(canonical, { replace: true });
    }, [params, canonical, setParams]);
    return {
        sort: selected.sort,
        direction: selected.direction,
        value: `${selected.sort}:${selected.direction}`,
        onChange: (value: string) => {
            const option = options.find(
                (option) => `${option.sort}:${option.direction}` === value,
            );
            if (option) void setParams(address(option), { replace: true });
        },
    };
}
