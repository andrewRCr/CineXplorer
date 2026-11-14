import { vi } from "vitest";

/** Supply browser media measurements where jsdom has no viewport layout. */
export function mockViewport(width: number, height: number) {
    vi.spyOn(window, "matchMedia").mockImplementation((media) => {
        const min = media.match(/min-width:\s*([\d.]+)(px|rem|em)/);
        return {
            media,
            matches: media.includes("orientation")
                ? height >= width
                : min
                  ? width >= Number(min[1]) * (min[2] === "px" ? 1 : 16)
                  : false,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
    });
}
