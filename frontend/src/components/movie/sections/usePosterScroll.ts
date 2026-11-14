import { useCallback, useRef, useState } from "react";

/** Follow the native list's geometry and scroll events; nothing moves automatically. */
export function usePosterScroll() {
    const list = useRef<HTMLUListElement | null>(null);
    const [edges, setEdges] = useState({ atStart: true, atEnd: true });
    const measure = useCallback(() => {
        const element = list.current;
        if (!element) return;
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
            if (!element) return;
            measure();
            const observer = new ResizeObserver(measure);
            observer.observe(element);
            // Changes in card count can change overflow without resizing the list itself.
            const children = new MutationObserver(measure);
            children.observe(element, { childList: true });
            element.addEventListener("scroll", measure, { passive: true });
            return () => {
                observer.disconnect();
                children.disconnect();
                element.removeEventListener("scroll", measure);
            };
        },
        [measure],
    );
    const scroll = (direction: number) => {
        const element = list.current;
        if (!element) return;
        element.scrollTo({
            left: element.scrollLeft + direction * element.clientWidth,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
        });
    };
    return { ref, ...edges, previous: () => scroll(-1), next: () => scroll(1) };
}
