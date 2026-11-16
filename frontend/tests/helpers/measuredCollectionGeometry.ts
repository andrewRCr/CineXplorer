import { vi } from "vitest";

/** Native-like geometry with row measurements that can be unavailable on return. */
export function measuredCollectionGeometry(
    // A controllable delivery boundary lets tests finish measuring before observing scroll.
    scheduleMeasurement: (deliver: () => void) => void = queueMicrotask,
) {
    let measurable = true;
    class MeasuredRowsObserver implements ResizeObserver {
        private targets = new Set<Element>();
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
            this.targets.add(target);
            // The real virtualizer waits for ResizeObserver while the visitor scrolls.
            if (
                !(target instanceof HTMLElement) ||
                !target.hasAttribute("data-index")
            )
                return;
            scheduleMeasurement(() => {
                if (!this.targets.has(target) || !measurable) return;
                const size = { blockSize: 300, inlineSize: 374 };
                this.callback(
                    [
                        {
                            target,
                            borderBoxSize: [size],
                            contentBoxSize: [size],
                            devicePixelContentBoxSize: [size],
                            contentRect: target.getBoundingClientRect(),
                        },
                    ],
                    this,
                );
            });
        }
        unobserve(target: Element) {
            this.targets.delete(target);
        }
        disconnect() {
            this.targets.clear();
        }
    }
    vi.stubGlobal("ResizeObserver", MeasuredRowsObserver);
    // Keep viewport coordinates consistent with a container at document position zero.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        () => new DOMRect(0, -window.scrollY, 374, 0),
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
        function (this: HTMLElement) {
            return this.hasAttribute("data-index") && measurable ? 300 : 0;
        },
    );
    vi.spyOn(window, "scrollTo").mockImplementation(
        (value: number | ScrollToOptions, y?: number) => {
            const top = typeof value === "number" ? (y ?? 0) : (value.top ?? 0);
            const changed = top !== window.scrollY;
            Object.defineProperty(window, "scrollY", {
                configurable: true,
                value: top,
            });
            Object.defineProperty(window, "pageYOffset", {
                configurable: true,
                value: top,
            });
            if (changed)
                queueMicrotask(() => window.dispatchEvent(new Event("scroll")));
        },
    );
    return {
        stopMeasuring: () => {
            measurable = false;
        },
    };
}
