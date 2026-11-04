import "./browser-storage";
import "@testing-library/jest-dom";
import { server } from "./mocks/server";

// Global test setup - runs before each test file

// Mock window.matchMedia since it's not available in jsdom
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver since it's not available in jsdom
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
}));

// Mock ResizeObserver since it's not available in jsdom
// This is needed for @floating-ui/dom which is used by Chakra UI Select
class ResizeObserverMock {
    constructor(_callback: ResizeObserverCallback) {
        // Callback parameter kept for interface compatibility but not used in mock
    }

    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

// Also ensure window.ResizeObserver is available
if (typeof window !== "undefined") {
    window.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

// Mock scrollIntoView since it's not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock scrolling APIs that jsdom does not implement.
window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();
HTMLElement.prototype.scrollTo = vi.fn();

// Mock window.location methods
Object.defineProperty(window, "location", {
    value: {
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
        href: "http://localhost:3000",
        origin: "http://localhost:3000",
        protocol: "http:",
        host: "localhost:3000",
        hostname: "localhost",
        port: "3000",
        pathname: "/",
        search: "",
        hash: "",
    },
    writable: true,
});

// Disable CSS animations/transitions in tests for faster, more deterministic tests
const style = document.createElement("style");
style.textContent = `
	*, *::before, *::after {
		animation-duration: 0s !important;
		animation-delay: 0s !important;
		transition-duration: 0s !important;
		transition-delay: 0s !important;
	}
`;
document.head.appendChild(style);

// Mock next-themes since it's not available in test environment
vi.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: vi.fn(),
        resolvedTheme: "light",
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
});

// Restore shared defaults after every test; runtime handlers never leak.
afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
});

afterAll(() => {
    server.close();
});
