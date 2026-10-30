import "@testing-library/jest-dom";

// Global test setup - runs before each test file

// Node 25+ defines its own localStorage and sessionStorage globals, which keep
// Vitest from installing jsdom's (localStorage is undefined unless Node gets
// --localstorage-file). Install jsdom's Storage the way Vitest installs other
// window globals; reading Node's getter to test for this would log a warning.
declare const jsdom: { window: Pick<Window, "localStorage" | "sessionStorage"> };
for (const key of ["localStorage", "sessionStorage"] as const) {
	let override: Storage | undefined;
	Object.defineProperty(globalThis, key, {
		configurable: true,
		get: () => override ?? jsdom.window[key],
		set: (value: Storage) => {
			override = value;
		},
	});
}

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

// ============================================================================
// KNOWN ISSUE: Chakra UI v3 Select "act() warnings"
// ============================================================================
//
// Tests using Chakra UI v3's Select component produce warnings like:
//   "An update to ForwardRef(SelectImpl) inside a test was not wrapped in act(...)"
//
// This is a KNOWN LIMITATION of Chakra UI v3's architecture:
// - Chakra v3 uses Ark UI underneath, which has state machine-based components
// - These state machines trigger async updates that React Testing Library can't
//   automatically wrap in act()
// - The warnings are cosmetic noise, NOT test failures or bugs
//
// Research conducted Dec 2025 confirmed:
// - CSS animation disabling doesn't help (it's JS state updates, not CSS)
// - Manual act() wrapping doesn't help (updates happen after test completion)
// - waitFor/findByRole don't help (Ark UI state machines are the cause)
// - This is a library-level issue with no clean workaround
//
// Per Kent C. Dodds, suppressing warnings masks real issues - accept the noise.
// See: https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning
// ============================================================================

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
