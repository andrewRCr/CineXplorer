import { useCallback, useRef, useState } from "react";
import { posterRowLayout } from "./posterRowLayout";

/** Keep native scrolling aligned to whole cards as the viewport and films change. */
export function usePosterScroll() {
    const list = useRef<HTMLUListElement | null>(null);
    const layout = useRef<ReturnType<typeof posterRowLayout> | null>(null);
    const [count, setCount] = useState(1);
    const [edges, setEdges] = useState({ atStart: true, atEnd: true });
    const measure = useCallback(() => {
        const element = list.current;
        if (!element) return;
        const width =
            element.getBoundingClientRect().width || element.clientWidth;
        if (width > 0) {
            const next = posterRowLayout(width);
            const previous = layout.current;
            element.style.setProperty(
                "--poster-card-width",
                `${next.cardWidth}px`,
            );
            layout.current = next;
            setCount(next.count);
            if (previous && previous.stride !== next.stride) {
                const first = Math.round(element.scrollLeft / previous.stride);
                element.scrollLeft =
                    Math.min(
                        first,
                        Math.max(0, element.childElementCount - next.count),
                    ) * next.stride;
            }
        }
        const atStart = element.scrollLeft <= 1;
        const atEnd =
            element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
        setEdges((previous) =>
            previous.atStart === atStart && previous.atEnd === atEnd
                ? previous
                : { atStart, atEnd },
        );
    }, []);
    const ref = useCallback(
        (element: HTMLUListElement | null) => {
            list.current = element;
            layout.current = null;
            if (!element) return;
            measure();
            const observer = new ResizeObserver(measure);
            observer.observe(element);
            const children = new MutationObserver(measure);
            children.observe(element, { childList: true });
            element.addEventListener("scroll", measure, { passive: true });
            return () => {
                observer.disconnect();
                children.disconnect();
                element.removeEventListener("scroll", measure);
                list.current = null;
            };
        },
        [measure],
    );
    const scroll = (direction: number) => {
        const element = list.current;
        const current = layout.current;
        if (!element || !current) return;
        const first = Math.round(element.scrollLeft / current.stride);
        const last = Math.max(0, element.childElementCount - current.count);
        const target = Math.min(
            last,
            Math.max(0, first + direction * current.count),
        );
        element.scrollTo({
            left: target * current.stride,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
        });
    };
    return {
        ref,
        count,
        ...edges,
        previous: () => scroll(-1),
        next: () => scroll(1),
    };
}
