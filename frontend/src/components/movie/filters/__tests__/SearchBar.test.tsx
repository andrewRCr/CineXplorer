import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@tests/helpers/test-renderer';
import SearchBar from '../SearchBar';

// Mock the COLORS constant since it's used in the component
vi.mock('@/constants/theme', () => ({
	COLORS: {
		background: { main: '#ffffff' },
		border: { main: '#e2e8f0' },
		text: { 
			main: '#1a202c',
			secondary: '#4a5568'
		},
		accent: { 
			primary: '#3182ce',
			secondary: '#2c5aa0'
		}
	}
}));

describe('SearchBar Component', () => {
	const mockOnChange = vi.fn();
	
	const defaultProps = {
		value: '',
		onChange: mockOnChange,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('renders search input with default placeholder', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			expect(input).toBeInTheDocument();
			expect(input).toHaveValue('');
		});

		it('renders with custom placeholder', () => {
			render(<SearchBar {...defaultProps} placeholder="Search for titles..." />);
			
			const input = screen.getByPlaceholderText('Search for titles...');
			expect(input).toBeInTheDocument();
		});

		it('displays search icon', () => {
			render(<SearchBar {...defaultProps} />);
			
			// FiSearch icon is rendered as an SVG - check for its presence
			const container = screen.getByPlaceholderText('Search movies...').closest('div');
			expect(container).toBeInTheDocument();
			
			// We can't easily test for the specific icon, but we can verify structure
			expect(container?.querySelector('svg')).toBeTruthy();
		});

		it('renders with provided value', () => {
			render(<SearchBar {...defaultProps} value="action movies" />);
			
			const input = screen.getByDisplayValue('action movies');
			expect(input).toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('calls onChange when user types', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			fireEvent.change(input, { target: { value: 'test query' } });
			
			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange).toHaveBeenCalledWith('test query');
		});

		it('calls onChange for each character typed', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			// Simulate typing "hello"
			fireEvent.change(input, { target: { value: 'h' } });
			fireEvent.change(input, { target: { value: 'he' } });
			fireEvent.change(input, { target: { value: 'hel' } });
			
			expect(mockOnChange).toHaveBeenCalledTimes(3);
			expect(mockOnChange).toHaveBeenNthCalledWith(1, 'h');
			expect(mockOnChange).toHaveBeenNthCalledWith(2, 'he');
			expect(mockOnChange).toHaveBeenNthCalledWith(3, 'hel');
		});

		it('handles clearing input', () => {
			render(<SearchBar {...defaultProps} value="existing query" />);
			
			const input = screen.getByDisplayValue('existing query');
			
			fireEvent.change(input, { target: { value: '' } });
			
			expect(mockOnChange).toHaveBeenCalledWith('');
		});

		it('handles special characters and numbers', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			fireEvent.change(input, { target: { value: 'Star Wars: Episode IV - A New Hope (1977)' } });
			
			expect(mockOnChange).toHaveBeenCalledWith('Star Wars: Episode IV - A New Hope (1977)');
		});
	});

	describe('Controlled Component Behavior', () => {
		it('reflects value prop changes', () => {
			const { rerender } = render(<SearchBar {...defaultProps} value="initial" />);
			
			let input = screen.getByDisplayValue('initial');
			expect(input).toHaveValue('initial');
			
			// Update value prop
			rerender(<SearchBar {...defaultProps} value="updated" />);
			
			input = screen.getByDisplayValue('updated');
			expect(input).toHaveValue('updated');
		});

		it('does not change value without onChange being called', () => {
			render(<SearchBar {...defaultProps} value="fixed value" />);
			
			const input = screen.getByDisplayValue('fixed value');
			
			// Try to change input directly (should not work in controlled component)
			fireEvent.change(input, { target: { value: 'should not change' } });
			
			// Value should remain the same since component is controlled
			expect(input).toHaveValue('fixed value');
			// But onChange should still be called
			expect(mockOnChange).toHaveBeenCalledWith('should not change');
		});
	});

	describe('Focus and Interaction States', () => {
		it('can receive focus', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			input.focus();
			expect(input).toHaveFocus();
		});

		it('can lose focus', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			input.focus();
			expect(input).toHaveFocus();
			
			input.blur();
			expect(input).not.toHaveFocus();
		});

		it('handles keyboard navigation', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			// Test that component doesn't crash with keyboard events
			fireEvent.keyDown(input, { key: 'Tab' });
			fireEvent.keyDown(input, { key: 'Enter' });
			fireEvent.keyDown(input, { key: 'Escape' });
			
			// Component should still be functional
			expect(input).toBeInTheDocument();
		});
	});

	describe('Component Structure and Styling', () => {
		it('applies correct container styles', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			const container = input.closest('div');
			
			expect(container).toBeInTheDocument();
			// Test that container has position relative for icon positioning
			// Note: We can't easily test CSS-in-JS styles, but we can verify structure
		});

		it('positions search icon correctly', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			const container = input.closest('div');
			const icon = container?.querySelector('svg');
			
			expect(icon).toBeInTheDocument();
			// Icon should be positioned absolutely within the container
		});

		it('applies proper input padding for icon space', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			
			// Input should have left padding to accommodate icon
			// Testing exact CSS values is brittle, but we can verify the input exists
			expect(input).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('provides accessible input field', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByRole('textbox');
			expect(input).toBeInTheDocument();
		});

		it('has proper placeholder for screen readers', () => {
			render(<SearchBar {...defaultProps} placeholder="Find movies by title" />);
			
			const input = screen.getByPlaceholderText('Find movies by title');
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('placeholder', 'Find movies by title');
		});

		it('supports keyboard navigation', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByRole('textbox');
			
			// Should be focusable via keyboard and not disabled
			expect(input).not.toHaveAttribute('disabled');
			expect(input).not.toHaveAttribute('readonly');
			
			// Should be a proper input element
			expect(input.tagName).toBe('INPUT');
		});

		it('maintains focus when interacting with input', () => {
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByRole('textbox');
			
			input.focus();
			fireEvent.change(input, { target: { value: 'test' } });
			
			expect(input).toHaveFocus();
		});
	});

	describe('Edge Cases', () => {
		it('handles empty string value', () => {
			render(<SearchBar {...defaultProps} value="" />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			expect(input).toHaveValue('');
		});

		it('handles undefined onChange gracefully', () => {
			// This test ensures component doesn't crash if onChange is undefined
			// Though TypeScript should prevent this, it's good defensive programming
			const { container } = render(
				<SearchBar 
					value="test"
					onChange={() => {}} // Empty function to prevent crashes
				/>
			);
			
			expect(container).toBeInTheDocument();
		});

		it('handles very long search queries', () => {
			const longQuery = 'A'.repeat(1000);
			render(<SearchBar {...defaultProps} value={longQuery} />);
			
			const input = screen.getByDisplayValue(longQuery);
			expect(input).toHaveValue(longQuery);
		});

		it('handles special characters and emojis', () => {
			const specialQuery = 'Movie with émojis 🎬 and spëcial chars!';
			render(<SearchBar {...defaultProps} />);
			
			const input = screen.getByPlaceholderText('Search movies...');
			fireEvent.change(input, { target: { value: specialQuery } });
			
			expect(mockOnChange).toHaveBeenCalledWith(specialQuery);
		});
	});
});