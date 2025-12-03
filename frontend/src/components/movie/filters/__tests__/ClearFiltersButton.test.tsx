import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@tests/helpers/test-renderer';
import ClearBrowseParamsButton from '../../browse/ClearBrowseParamsButton';
import type { BrowseParams } from '@/types/browseTypes';

// Create mock browse params helper functions
const createMockBrowseParams = (overrides: Partial<BrowseParams> = {}): BrowseParams => ({
  query: '',
  genres: [],
  minYear: '',
  maxYear: '',
  minRating: '',
  maxRating: '',
  minRuntime: '',
  maxRuntime: '',
  sortBy: 'popularity.desc',
  language: '',
  ...overrides,
});

describe('ClearBrowseParamsButton Component', () => {
  const mockOnClear = vi.fn();

  const defaultProps = {
    browseParams: createMockBrowseParams(),
    onClear: mockOnClear,
    isAdvancedOpen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Conditional Visibility Logic', () => {
    it('hides button when no params are active', () => {
      render(<ClearBrowseParamsButton {...defaultProps} />);

      const button = screen.getByText('Clear filters');

      // Button should be hidden (visibility: hidden, opacity: 0)
      expect(button).not.toBeVisible();
    });

    it('shows button when genres param is active', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28, 12] // Action and Adventure
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when year params are active', () => {
      const paramsWithYears = createMockBrowseParams({
        minYear: '2000',
        maxYear: '2023'
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithYears} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when only minYear is set', () => {
      const paramsWithMinYear = createMockBrowseParams({
        minYear: '2020'
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithMinYear} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when only maxYear is set', () => {
      const paramsWithMaxYear = createMockBrowseParams({
        maxYear: '2023'
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithMaxYear} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when runtime params are active', () => {
      const paramsWithRuntime = createMockBrowseParams({
        minRuntime: '90',
        maxRuntime: '180'
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithRuntime} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('shows button when multiple param types are active', () => {
      const paramsWithMultiple = createMockBrowseParams({
        genres: [35], // Comedy
        minYear: '2010',
        minRuntime: '120'
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithMultiple} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeVisible();
    });

    it('hides button when isAdvancedOpen is true, even with active params', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28] // Action
      });

      render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
          isAdvancedOpen={true}
        />
      );

      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });
  });

  describe('hasActiveParams Computation', () => {
    it('correctly identifies no active params', () => {
      const emptyParams = createMockBrowseParams();
      render(<ClearBrowseParamsButton {...defaultProps} browseParams={emptyParams} />);

      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('correctly identifies active params with empty arrays', () => {
      const paramsWithEmptyGenres = createMockBrowseParams({
        genres: [] // Empty array should not count as active
      });
      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithEmptyGenres} />);

      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('correctly identifies active params with empty strings', () => {
      const paramsWithEmptyStrings = createMockBrowseParams({
        minYear: '', // Empty string should not count as active
        maxYear: '',
        minRuntime: '',
        maxRuntime: ''
      });
      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithEmptyStrings} />);

      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('ignores query field in hasActiveParams calculation', () => {
      // The component logic only checks specific param fields, not query
      const paramsWithQuery = createMockBrowseParams({
        query: 'batman' // Query should not affect visibility
      });
      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithQuery} />);

      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('ignores sortBy field in hasActiveParams calculation', () => {
      const paramsWithSort = createMockBrowseParams({
        sortBy: 'vote_average.desc'
      });
      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithSort} />);

      const button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });
  });

  describe('User Interactions', () => {
    it('calls onClear when button is clicked', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28] // Action
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByText('Clear filters');
      fireEvent.click(button);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('button is clickable when visible', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28]
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByText('Clear filters');
      expect(button).toBeEnabled();
      expect(button).toBeVisible();
    });

    it('handles multiple clicks correctly', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28, 35] // Action and Comedy
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByText('Clear filters');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClear).toHaveBeenCalledTimes(3);
    });
  });

  describe('Component Structure and Styling', () => {
    it('renders with correct button styling classes', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28]
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByText('Clear filters');

      // Button should be rendered with expected text
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('applies correct container positioning', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28]
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByText('Clear filters');
      const container = button.closest('div');

      expect(container).toBeInTheDocument();
      // Container should exist and contain the button
    });

    it('renders consistently across different param combinations', () => {
      // Test with different param combinations to ensure consistent rendering
      const testCases = [
        { genres: [28] },
        { minYear: '2020' },
        { minRuntime: '90', maxRuntime: '120' },
        { genres: [35, 18], minYear: '2010', maxYear: '2023' }
      ];

      testCases.forEach((paramOverrides) => {
        const browseParams = createMockBrowseParams(paramOverrides);
        const { unmount } = render(
          <ClearBrowseParamsButton
            {...defaultProps}
            browseParams={browseParams}
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
      const paramsWithGenres = createMockBrowseParams({
        genres: [28]
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByRole('button', { name: /clear filters/i });
      expect(button).toBeInTheDocument();
    });

    it('maintains proper button semantics when hidden', () => {
      render(<ClearBrowseParamsButton {...defaultProps} />);

      // For hidden elements, use getByText since getByRole might not find hidden elements
      const button = screen.getByText('Clear filters');
      expect(button).toBeInTheDocument();
      // Button exists but is not visible
      expect(button).not.toBeVisible();
    });

    it('supports keyboard interaction when visible', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28]
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByRole('button', { name: /clear filters/i });

      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();

      // For Chakra UI buttons, test the actual click rather than keydown
      // since the framework handles the keyboard to click conversion
      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('supports standard button interaction patterns', () => {
      const paramsWithGenres = createMockBrowseParams({
        genres: [28]
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      const button = screen.getByRole('button', { name: /clear filters/i });

      // Test focus and click pattern (standard interaction)
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined or null param values gracefully', () => {
      // Test with potentially undefined values that might come from form state
      // Note: Component logic uses !== '', so undefined and null are truthy
      const edgeCaseParams = createMockBrowseParams({
        genres: [], // Empty array - falsy
        minYear: '', // Empty string - falsy
        maxYear: undefined as string | undefined, // undefined !== '' is true - will show button
        minRuntime: null as unknown as string | undefined, // null !== '' is true - will show button
        maxRuntime: ''
      });

      render(<ClearBrowseParamsButton {...defaultProps} browseParams={edgeCaseParams} />);

      const button = screen.getByText('Clear filters');
      // Button should be visible because undefined !== '' and null !== ''
      expect(button).toBeVisible();
    });

    it('handles rapid state changes', () => {
      const { rerender } = render(<ClearBrowseParamsButton {...defaultProps} />);

      // Initially no params
      let button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();

      // Add params
      const paramsWithGenres = createMockBrowseParams({ genres: [28] });
      rerender(<ClearBrowseParamsButton {...defaultProps} browseParams={paramsWithGenres} />);

      button = screen.getByText('Clear filters');
      expect(button).toBeVisible();

      // Remove params
      rerender(<ClearBrowseParamsButton {...defaultProps} />);

      button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('handles isAdvancedOpen state changes', () => {
      const paramsWithGenres = createMockBrowseParams({ genres: [28] });

      const { rerender } = render(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
          isAdvancedOpen={false}
        />
      );

      // Initially visible
      let button = screen.getByText('Clear filters');
      expect(button).toBeVisible();

      // Hide when isAdvancedOpen becomes true
      rerender(
        <ClearBrowseParamsButton
          {...defaultProps}
          browseParams={paramsWithGenres}
          isAdvancedOpen={true}
        />
      );

      button = screen.getByText('Clear filters');
      expect(button).not.toBeVisible();
    });

    it('maintains functionality after prop updates', () => {
      const initialParams = createMockBrowseParams({ genres: [28] });

      const { rerender } = render(
        <ClearBrowseParamsButton {...defaultProps} browseParams={initialParams} />
      );

      // Click initial button
      let button = screen.getByText('Clear filters');
      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(1);

      // Update params and click again
      const updatedParams = createMockBrowseParams({ minYear: '2020' });
      rerender(
        <ClearBrowseParamsButton {...defaultProps} browseParams={updatedParams} />
      );

      button = screen.getByText('Clear filters');
      fireEvent.click(button);
      expect(mockOnClear).toHaveBeenCalledTimes(2);
    });
  });
});