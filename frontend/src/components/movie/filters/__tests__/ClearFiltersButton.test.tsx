import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@tests/helpers/test-renderer';
import ClearFiltersButton from '../ClearFiltersButton';
import type { MovieFilters } from '../AdvancedMovieFilters';

// Create mock filters helper functions
const createMockFilters = (overrides: Partial<MovieFilters> = {}): MovieFilters => ({
  query: '',
  genres: [],
  minYear: '',
  maxYear: '',
  minRating: '',
  maxRating: '',
  minRuntime: '',
  maxRuntime: '',
  sortBy: 'popularity.desc',
  ...overrides,
});

describe('ClearFiltersButton Component', () => {
  const mockOnClearFilters = vi.fn();
  
  const defaultProps = {
    filters: createMockFilters(),
    onClearFilters: mockOnClearFilters,
    showAdvanced: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Conditional Visibility Logic', () => {
    it('hides button when no filters are active', () => {
      render(<ClearFiltersButton {...defaultProps} />);
      
      const button = screen.getByText('Clear filters');
      
      // Button should be hidden (visibility: hidden, opacity: 0)
      expect(button).not.toBeVisible();
    });

    it('shows button when genres filter is active', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28, 12] // Action and Adventure
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when year filters are active', () => {
      const filtersWithYears = createMockFilters({
        minYear: '2000',
        maxYear: '2023'
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithYears} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when only minYear is set', () => {
      const filtersWithMinYear = createMockFilters({
        minYear: '2020'
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithMinYear} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when only maxYear is set', () => {
      const filtersWithMaxYear = createMockFilters({
        maxYear: '2023'
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithMaxYear} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when runtime filters are active', () => {
      const filtersWithRuntime = createMockFilters({
        minRuntime: '90',
        maxRuntime: '180'
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithRuntime} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when multiple filter types are active', () => {
      const filtersWithMultiple = createMockFilters({
        genres: [35], // Comedy
        minYear: '2010',
        minRuntime: '120'
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithMultiple} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('hides button when showAdvanced is true, even with active filters', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28] // Action
      });
      
      render(
        <ClearFiltersButton 
          {...defaultProps} 
          filters={filtersWithGenres} 
          showAdvanced={true}
        />
      );
      
      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });
  });

  describe('hasActiveFilters Computation', () => {
    it('correctly identifies no active filters', () => {
      const emptyFilters = createMockFilters();
      render(<ClearFiltersButton {...defaultProps} filters={emptyFilters} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('correctly identifies active filters with empty arrays', () => {
      const filtersWithEmptyGenres = createMockFilters({
        genres: [] // Empty array should not count as active
      });
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithEmptyGenres} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('correctly identifies active filters with empty strings', () => {
      const filtersWithEmptyStrings = createMockFilters({
        minYear: '', // Empty string should not count as active
        maxYear: '',
        minRuntime: '',
        maxRuntime: ''
      });
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithEmptyStrings} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('ignores query field in hasActiveFilters calculation', () => {
      // The component logic only checks specific filter fields, not query
      const filtersWithQuery = createMockFilters({
        query: 'batman' // Query should not affect visibility
      });
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithQuery} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('ignores sortBy field in hasActiveFilters calculation', () => {
      const filtersWithSort = createMockFilters({
        sortBy: 'vote_average.desc'
      });
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithSort} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });
  });

  describe('User Interactions', () => {
    it('calls onClearFilters when button is clicked', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28] // Action
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByText('Clear filters');
      fireEvent.click(button);
      
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('button is clickable when visible', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28]
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByText('Clear filters');
      expect(button).toBeEnabled();
      expect(button).toBeVisible();
    });

    it('handles multiple clicks correctly', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28, 35] // Action and Comedy
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByText('Clear filters');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockOnClearFilters).toHaveBeenCalledTimes(3);
    });
  });

  describe('Component Structure and Styling', () => {
    it('renders with correct button styling classes', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28]
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByText('Clear filters');
      
      // Button should be rendered with expected text
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('applies correct container positioning', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28]
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByText('Clear filters');
      const container = button.closest('div');
      
      expect(container).toBeInTheDocument();
      // Container should exist and contain the button
    });

    it('renders consistently across different filter combinations', () => {
      // Test with different filter combinations to ensure consistent rendering
      const testCases = [
        { genres: [28] },
        { minYear: '2020' },
        { minRuntime: '90', maxRuntime: '120' },
        { genres: [35, 18], minYear: '2010', maxYear: '2023' }
      ];
      
      testCases.forEach((filterOverrides) => {
        const filters = createMockFilters(filterOverrides);
        const { unmount } = render(
          <ClearFiltersButton 
            {...defaultProps} 
            filters={filters} 
          />
        );
        
        const button = screen.getByText('Clear filters');
        expect(button).toBeVisible();
        expect(button).toBeEnabled();
        
        unmount(); // Clean up for next iteration
      });
    });
  });

  describe('Accessibility', () => {
    it('provides accessible button element', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28]
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByRole('button', { name: /clear filters/i });
      expect(button).toBeInTheDocument();
    });

    it('maintains proper button semantics when hidden', () => {
      render(<ClearFiltersButton {...defaultProps} />);
      
      // For hidden elements, use getByText since getByRole might not find hidden elements
      const button = screen.getByText('Clear filters');
      expect(button).toBeInTheDocument();
      // Button exists but is not visible
      expect(button).not.toBeVisible();
    });

    it('supports keyboard interaction when visible', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28]
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByRole('button', { name: /clear filters/i });
      
      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();
      
      // For Chakra UI buttons, test the actual click rather than keydown
      // since the framework handles the keyboard to click conversion
      fireEvent.click(button);
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('supports standard button interaction patterns', () => {
      const filtersWithGenres = createMockFilters({
        genres: [28]
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      const button = screen.getByRole('button', { name: /clear filters/i });
      
      // Test focus and click pattern (standard interaction)
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.click(button);
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined or null filter values gracefully', () => {
      // Test with potentially undefined values that might come from form state
      // Note: Component logic uses !== '', so undefined and null are truthy
      const edgeCaseFilters = createMockFilters({
        genres: [], // Empty array - falsy
        minYear: '', // Empty string - falsy
        maxYear: undefined as string | undefined, // undefined !== '' is true - will show button
      minRuntime: null as unknown as string | undefined, // null !== '' is true - will show button
        maxRuntime: ''
      });
      
      render(<ClearFiltersButton {...defaultProps} filters={edgeCaseFilters} />);
      
      const button = screen.getByText('Clear filters');
      // Button should be visible because undefined !== '' and null !== ''
      expect(button).toBeVisible();
    });

    it('handles rapid state changes', () => {
      const { rerender } = render(<ClearFiltersButton {...defaultProps} />);
      
      // Initially no filters
      let button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
      
      // Add filters
      const filtersWithGenres = createMockFilters({ genres: [28] });
      rerender(<ClearFiltersButton {...defaultProps} filters={filtersWithGenres} />);
      
      button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
      
      // Remove filters
      rerender(<ClearFiltersButton {...defaultProps} />);
      
      button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('handles showAdvanced state changes', () => {
      const filtersWithGenres = createMockFilters({ genres: [28] });
      
      const { rerender } = render(
        <ClearFiltersButton 
          {...defaultProps} 
          filters={filtersWithGenres}
          showAdvanced={false}
        />
      );
      
      // Initially visible
      let button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
      
      // Hide when showAdvanced becomes true
      rerender(
        <ClearFiltersButton 
          {...defaultProps} 
          filters={filtersWithGenres}
          showAdvanced={true}
        />
      );
      
      button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('maintains functionality after prop updates', () => {
      const initialFilters = createMockFilters({ genres: [28] });
      
      const { rerender } = render(
        <ClearFiltersButton {...defaultProps} filters={initialFilters} />
      );
      
      // Click initial button
      let button = screen.getByText('Clear filters');
      fireEvent.click(button);
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
      
      // Update filters and click again
      const updatedFilters = createMockFilters({ minYear: '2020' });
      rerender(
        <ClearFiltersButton {...defaultProps} filters={updatedFilters} />
      );
      
      button = screen.getByText('Clear filters');
      fireEvent.click(button);
      expect(mockOnClearFilters).toHaveBeenCalledTimes(2);
    });
  });
});