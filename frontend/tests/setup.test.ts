import { describe, it, expect } from 'vitest';

describe('Test Environment Setup', () => {
	it('should have vi globals available', () => {
		expect(vi).toBeDefined();
		expect(vi.fn).toBeDefined();
		expect(vi.mock).toBeDefined();
	});

	it('should have jest-dom matchers available', () => {
		const element = document.createElement('div');
		element.textContent = 'Hello World';
		document.body.appendChild(element);

		// This should not throw if jest-dom is properly set up
		expect(element).toBeInTheDocument();
		
		document.body.removeChild(element);
	});

	it('should have mock browser APIs available', () => {
		expect(window.matchMedia).toBeDefined();
		expect(window.IntersectionObserver).toBeDefined();
		expect(window.ResizeObserver).toBeDefined();
		expect(Element.prototype.scrollIntoView).toBeDefined();
	});
});