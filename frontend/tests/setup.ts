import "@testing-library/jest-dom";

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
	private callback: ResizeObserverCallback;
	
	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}
	
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

// Also ensure window.ResizeObserver is available
if (typeof window !== 'undefined') {
	window.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

// Mock scrollIntoView since it's not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock scrollTo since it's not implemented in jsdom (needed for Chakra UI Select)
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

// Suppress console warnings during tests (optional - can be removed if needed)
const originalError = console.error;
console.error = (...args) => {
	// Suppress React 18 warnings about act() in tests
	if (
		typeof args[0] === "string" &&
		args[0].includes("Warning: ReactDOM.render")
	) {
		return;
	}
	originalError.call(console, ...args);
};

// Mock next-themes since it's not available in test environment
vi.mock('next-themes', () => ({
	useTheme: () => ({
		theme: 'light',
		setTheme: vi.fn(),
		resolvedTheme: 'light',
	}),
	ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Clean up after each test
afterEach(() => {
	vi.clearAllMocks();
});
