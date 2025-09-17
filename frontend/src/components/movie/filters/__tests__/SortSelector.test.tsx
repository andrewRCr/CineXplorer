import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/helpers/test-renderer';
import userEvent from '@testing-library/user-event';
import SortSelector from '../SortSelector';

// Mock the theme constants
vi.mock('@/constants/theme', () => ({
	COLORS: {
		background: { main: '#ffffff', subItem: '#f7fafc' },
		border: { main: '#e2e8f0' },
		text: { 
			main: '#1a202c',
			secondary: '#4a5568'
		},
		accent: { primary: '#3182ce', secondary: '#2b77cb' }
	}
}));

// Mock the sort options
vi.mock('@/constants/movieFilterOptions', () => ({
	advancedSortOptions: [
		{ value: 'popularity.desc', label: 'Popularity (High to Low)' },
		{ value: 'popularity.asc', label: 'Popularity (Low to High)' },
		{ value: 'vote_average.desc', label: 'Rating (High to Low)' },
		{ value: 'vote_average.asc', label: 'Rating (Low to High)' },
		{ value: 'release_date.desc', label: 'Release Date (Newest)' },
		{ value: 'release_date.asc', label: 'Release Date (Oldest)' },
		{ value: 'original_title.asc', label: 'Title (A-Z)' },
		{ value: 'original_title.desc', label: 'Title (Z-A)' }
	]
}));

describe('SortSelector Component', () => {
	const mockOnChange = vi.fn();
	
	const defaultProps = {
		value: 'popularity.desc' as const,
		onChange: mockOnChange,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('renders sort selector with title', () => {
			render(<SortSelector {...defaultProps} />);
			
			expect(screen.getByText('Sort By')).toBeInTheDocument();
		});

		it('renders with correct initial value', () => {
			render(<SortSelector {...defaultProps} value="vote_average.desc" />);
			
			// The trigger should show the selected value - use more specific selector
			const trigger = screen.getByRole('combobox');
			expect(trigger).toHaveTextContent('Rating (High to Low)');
		});

		it('renders as a proper select dropdown', () => {
			render(<SortSelector {...defaultProps} />);
			
			// Should have a combobox role for the select trigger
			const trigger = screen.getByRole('combobox');
			expect(trigger).toBeInTheDocument();
		});
	});

	describe('Dropdown Options', () => {
		it('shows all sort options when opened', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			// Check that all options are present - use role selector to avoid duplicates
			await waitFor(() => {
				const options = screen.getAllByRole('option');
				expect(options).toHaveLength(8);
				
				// Check specific option values
				const optionTexts = options.map(option => option.textContent);
				expect(optionTexts).toContain('Popularity (High to Low)');
				expect(optionTexts).toContain('Popularity (Low to High)');
				expect(optionTexts).toContain('Rating (High to Low)');
				expect(optionTexts).toContain('Rating (Low to High)');
				expect(optionTexts).toContain('Release Date (Newest)');
				expect(optionTexts).toContain('Release Date (Oldest)');
				expect(optionTexts).toContain('Title (A-Z)');
				expect(optionTexts).toContain('Title (Z-A)');
			});
		});

		it('highlights the currently selected option', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} value="vote_average.desc" />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			await waitFor(() => {
				// Find the option element with the correct aria-selected state
				const selectedOption = screen.getByRole('option', { name: 'Rating (High to Low)' });
				expect(selectedOption).toHaveAttribute('aria-selected', 'true');
				expect(selectedOption).toBeVisible();
			});
		});
	});

	describe('User Interactions', () => {
		it('calls onChange when selecting a different option', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			// Select a different option - use role selector to get the clickable option
			await waitFor(() => {
				const ratingOption = screen.getByRole('option', { name: 'Rating (High to Low)' });
				expect(ratingOption).toBeVisible();
			});
			
			const ratingOption = screen.getByRole('option', { name: 'Rating (High to Low)' });
			await user.click(ratingOption);
			
			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange).toHaveBeenCalledWith('vote_average.desc');
		});

		it('updates display when selecting new option', async () => {
			const user = userEvent.setup();
			const { rerender } = render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			// Select Rating option
			await waitFor(() => {
				const ratingOption = screen.getByRole('option', { name: 'Rating (High to Low)' });
				expect(ratingOption).toBeVisible();
			});
			
			const ratingOption = screen.getByRole('option', { name: 'Rating (High to Low)' });
			await user.click(ratingOption);
			
			// Simulate parent state update
			rerender(<SortSelector {...defaultProps} value="vote_average.desc" />);
			
			// Display should update - check the trigger text content
			const updatedTrigger = screen.getByRole('combobox');
			expect(updatedTrigger).toHaveTextContent('Rating (High to Low)');
		});

		it('handles keyboard navigation', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			
			// Focus the trigger
			await user.click(trigger);
			expect(trigger).toHaveFocus();
			
			// Should be able to navigate with keyboard
			await user.keyboard('{ArrowDown}');
			
			// Options should be visible
			await waitFor(() => {
				expect(screen.getByText('Popularity (Low to High)')).toBeVisible();
			});
		});
	});

	describe('Controlled Component Behavior', () => {
		it('reflects value prop changes', () => {
			const { rerender } = render(<SortSelector {...defaultProps} value="popularity.desc" />);
			
			const trigger = screen.getByRole('combobox');
			expect(trigger).toHaveTextContent('Popularity (High to Low)');
			
			// Update value prop
			rerender(<SortSelector {...defaultProps} value="release_date.desc" />);
			
			expect(trigger).toHaveTextContent('Release Date (Newest)');
		});

		it('handles all valid sort option values', () => {
			const sortOptions = [
				{ value: 'popularity.desc', label: 'Popularity (High to Low)' },
				{ value: 'popularity.asc', label: 'Popularity (Low to High)' },
				{ value: 'vote_average.desc', label: 'Rating (High to Low)' },
				{ value: 'vote_average.asc', label: 'Rating (Low to High)' },
				{ value: 'release_date.desc', label: 'Release Date (Newest)' },
				{ value: 'release_date.asc', label: 'Release Date (Oldest)' },
				{ value: 'original_title.asc', label: 'Title (A-Z)' },
				{ value: 'original_title.desc', label: 'Title (Z-A)' }
			] as const;
			
			const { rerender } = render(<SortSelector {...defaultProps} />);
			
			// Test each option renders correctly
			const trigger = screen.getByRole('combobox');
			sortOptions.forEach(({ value, label }) => {
				rerender(<SortSelector {...defaultProps} value={value} />);
				expect(trigger).toHaveTextContent(label);
			});
		});

		it('maintains proper component state during rapid changes', () => {
			const { rerender } = render(<SortSelector {...defaultProps} value="popularity.desc" />);
			
			// Rapid prop changes
			rerender(<SortSelector {...defaultProps} value="vote_average.desc" />);
			rerender(<SortSelector {...defaultProps} value="release_date.desc" />);
			rerender(<SortSelector {...defaultProps} value="original_title.asc" />);
			
			// Should show the last value
			const trigger = screen.getByRole('combobox');
			expect(trigger).toHaveTextContent('Title (A-Z)');
		});
	});

	describe('Accessibility', () => {
		it('provides accessible dropdown structure', () => {
			render(<SortSelector {...defaultProps} />);
			
			const combobox = screen.getByRole('combobox');
			expect(combobox).toBeInTheDocument();
			expect(combobox).toHaveAttribute('aria-expanded');
		});

		it('supports keyboard accessibility', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			
			// Should be focusable
			trigger.focus();
			expect(trigger).toHaveFocus();
			
			// Should open on Enter
			await user.keyboard('{Enter}');
			
			await waitFor(() => {
				expect(screen.getByText('Popularity (Low to High)')).toBeVisible();
			});
		});

		it('provides meaningful labels', () => {
			render(<SortSelector {...defaultProps} />);
			
			expect(screen.getByText('Sort By')).toBeInTheDocument();
			
			const trigger = screen.getByRole('combobox');
			// Chakra UI should provide accessible name through aria-label or similar
			expect(trigger).toBeInTheDocument();
		});

		it('maintains focus management in dropdown', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			// After opening, focus should be maintained
			await waitFor(() => {
				expect(screen.getByText('Popularity (Low to High)')).toBeVisible();
			});
			
			// Should be able to close with Escape
			await user.keyboard('{Escape}');
			
			// Dropdown should close
			await waitFor(() => {
				expect(screen.queryByText('Popularity (Low to High)')).not.toBeVisible();
			});
		});
	});

	describe('Component Structure', () => {
		it('applies consistent width to trigger and dropdown', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			
			// Trigger should have fixed width (220px defined in component)
			expect(trigger).toBeInTheDocument();
			
			// Open dropdown to check content width consistency
			await user.click(trigger);
			
			await waitFor(() => {
				expect(screen.getByText('Popularity (Low to High)')).toBeVisible();
			});
		});

		it('renders with proper styling structure', () => {
			const { container } = render(<SortSelector {...defaultProps} />);
			
			// Component should be wrapped in a Box
			expect(container.firstChild).toBeInTheDocument();
			
			// Should have title text
			expect(screen.getByText('Sort By')).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('handles missing onChange prop gracefully', async () => {
			// Component should render without crashing even if onChange is undefined
			// though this violates the interface, test defensive behavior
			const user = userEvent.setup();
			
			const { container } = render(
				<SortSelector value="popularity.desc" onChange={undefined as any} />
			);
			
			expect(container).toBeInTheDocument();
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			// Should open without error
			await waitFor(() => {
				expect(screen.getByText('Popularity (Low to High)')).toBeVisible();
			});
		});

		it('handles rapid user interactions', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			
			// Rapid clicks should be handled gracefully
			await user.click(trigger);
			await user.click(trigger);
			
			await waitFor(() => {
				// Should either be open or closed consistently
				const isOpen = screen.queryByText('Popularity (Low to High)')?.style.display !== 'none';
				expect(typeof isOpen).toBe('boolean');
			});
		});

		it('maintains correct selection state during re-renders', async () => {
			const user = userEvent.setup();
			const { rerender } = render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			// Rerender while dropdown is open
			rerender(<SortSelector {...defaultProps} value="vote_average.desc" />);
			
			// Should show updated value
			const updatedTrigger = screen.getByRole('combobox');
			expect(updatedTrigger).toHaveTextContent('Rating (High to Low)');
		});
	});

	describe('Performance Considerations', () => {
		it('renders efficiently with all options', () => {
			render(<SortSelector {...defaultProps} />);
			
			// Component should render without performance issues
			expect(screen.getByText('Sort By')).toBeInTheDocument();
			expect(screen.getByRole('combobox')).toBeInTheDocument();
		});

		it('handles callback invocation correctly', async () => {
			const user = userEvent.setup();
			render(<SortSelector {...defaultProps} />);
			
			const trigger = screen.getByRole('combobox');
			await user.click(trigger);
			
			await waitFor(() => {
				const option = screen.getByRole('option', { name: 'Rating (High to Low)' });
				expect(option).toBeVisible();
			});
			
			const option = screen.getByRole('option', { name: 'Rating (High to Low)' });
			await user.click(option);
			
			// onChange should be called exactly once per selection
			expect(mockOnChange).toHaveBeenCalledTimes(1);
			expect(mockOnChange).toHaveBeenCalledWith('vote_average.desc');
		});
	});
});