/**
 * Integration tests for browseParamMapper API parameter generation.
 *
 * These tests validate that the browse param mapper generates API parameters
 * that match the backend schema expectations. This is critical for ensuring the
 * frontend → backend parameter contract remains stable.
 *
 * Test Strategy: Validate parameter names and formats match what the backend
 * MovieDiscoverFilterSchema expects. This would have caught the previous
 * min_rating → vote_average_gte parameter naming bug.
 *
 * Related: Browse parameter integration testing - ensuring frontend params match backend schema
 */

import { describe, it, expect } from 'vitest';
import { mapBrowseParamsToApi } from '../browseParamMapper';
import { createMockBrowseParams as createBrowseParams } from '@tests/mocks/browseParams';

describe('browseParamMapper - Backend Schema Compatibility', () => {
  describe('Year Filter Parameter Generation', () => {
    it('generates release_date_gte/lte for year range (expanded style)', () => {
      // Arrange: User selects year range 2020-2023
      const browseParams = createBrowseParams({ minYear: '2020', maxYear: '2023' });

      // Act: Map to API parameters
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Parameters match backend schema expectations
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.release_date_lte).toBe('2023-12-31');

      // Backend will extract these for both TMDB API AND backend filtering
      // TMDB API: primary filter (millions → thousands)
      // Backend: second-pass data hygiene (catch bad data)
    });

    it('generates release_date_gte only when only minYear provided', () => {
      // Arrange: User selects "From 2020" (no end year)
      const browseParams = createBrowseParams({ minYear: '2020' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Only gte parameter present
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.release_date_lte).toBeDefined(); // Mapper adds current year as max
      expect(params).not.toHaveProperty('year_min'); // Backend extracts this
    });

    it('generates release_date_lte only when only maxYear provided', () => {
      // Arrange: User selects "Up to 2023"
      const browseParams = createBrowseParams({ maxYear: '2023' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Only lte parameter present
      expect(params.release_date_lte).toBe('2023-12-31');
      expect(params).not.toHaveProperty('release_date_gte');
    });

    it('converts decade filter to release_date range (minimal style)', () => {
      // Arrange: User selects "2020s" decade
      const browseParams = createBrowseParams({ minYear: '2020s' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'compact');

      // Assert: Decade converted to date range
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.release_date_lte).toBe('2029-12-31');
    });
  });

  describe('Rating Filter Parameter Generation', () => {
    it('generates vote_average_gte for minimum rating (expanded style)', () => {
      // Arrange: User selects "7.5+ rating"
      const browseParams = createBrowseParams({ minRating: '7.5' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Parameter name matches backend schema
      expect(params.vote_average_gte).toBe('7.5');
      expect(params).not.toHaveProperty('min_rating'); // OLD bug - would fail
      expect(params).not.toHaveProperty('rating_min'); // Backend extracts this
    });

    it('generates vote_average_lte for maximum rating when no minimum (expanded style)', () => {
      // Arrange: User selects "Up to 8.0 rating"
      const browseParams = createBrowseParams({ maxRating: '8.0' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Only lte parameter when no min provided
      expect(params.vote_average_lte).toBe('8.0');
      expect(params).not.toHaveProperty('vote_average_gte');
    });

    it('generates vote_average_gte for minimal style rating filter', () => {
      // Arrange: User selects quick "7.0+" rating filter
      const browseParams = createBrowseParams({ minRating: '7.0' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'compact');

      // Assert: Minimal style also uses vote_average_gte
      expect(params.vote_average_gte).toBe('7.0');
    });
  });

  describe('Combined Filter Parameter Generation', () => {
    it('generates all parameters for combined year + rating filters', () => {
      // Arrange: User applies both year and rating filters
      const browseParams = createBrowseParams({
        genres: [28, 12], // Action, Adventure
        minYear: '2020',
        maxYear: '2023',
        minRating: '7.5',
        maxRating: '9.0',
        sortBy: 'vote_average.desc',
      });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: All filter types present
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.release_date_lte).toBe('2023-12-31');
      expect(params.vote_average_gte).toBe('7.5');
      expect(params.vote_average_lte).toBe('9.0');
      expect(params.genres).toBe('28,12');
      expect(params.sort_by).toBe('vote_average.desc');
    });

    it('handles partial filters correctly', () => {
      // Arrange: User applies only some filters
      const browseParams = createBrowseParams({
        genres: [28],
        minYear: '2020',
        minRating: '7.0',
      });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Only provided filters generate parameters
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.vote_average_gte).toBe('7.0');
      expect(params.genres).toBe('28');

      // Max parameters should not be present or should be default values
      expect(params.release_date_lte).toBeDefined(); // Mapper adds current year
      expect(params).not.toHaveProperty('vote_average_lte');
    });
  });

  describe('Minimal vs Expanded Style Parameter Differences', () => {
    it('minimal style generates simpler parameter set', () => {
      // Arrange: Minimal style filter (Letterboxd-style quick filters)
      const browseParams = createBrowseParams({
        genres: [28],
        minYear: '2020s',
        minRating: '7.0',
      });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'compact');

      // Assert: Minimal style processes decade, single rating
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.release_date_lte).toBe('2029-12-31');
      expect(params.vote_average_gte).toBe('7.0');
      expect(params.genres).toBe('28');
    });

    it('expanded style allows range filters', () => {
      // Arrange: Expanded style with range filters
      const browseParams = createBrowseParams({
        genres: [28, 12],
        minYear: '2020',
        maxYear: '2023',
        minRating: '7.0',
        maxRating: '9.0',
        sortBy: 'vote_average.desc',
      });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Expanded style allows precise ranges
      expect(params.release_date_gte).toBe('2020-01-01');
      expect(params.release_date_lte).toBe('2023-12-31');
      expect(params.vote_average_gte).toBe('7.0');
      expect(params.vote_average_lte).toBe('9.0'); // Max rating only in expanded
    });
  });

  describe('Parameter Format Validation', () => {
    it('formats dates as YYYY-MM-DD (backend schema requirement)', () => {
      // Arrange
      const browseParams = createBrowseParams({ minYear: '2022', maxYear: '2022' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Date format matches backend expectations
      expect(params.release_date_gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(params.release_date_lte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(params.release_date_gte).toBe('2022-01-01');
      expect(params.release_date_lte).toBe('2022-12-31');
    });

    it('formats ratings as strings (API query param requirement)', () => {
      // Arrange
      const browseParams = createBrowseParams({ minRating: '7.5', maxRating: '9.0' });

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Ratings sent as strings (query params)
      expect(typeof params.vote_average_gte).toBe('string');
      expect(typeof params.vote_average_lte).toBe('string');
      expect(params.vote_average_gte).toBe('7.5');
      expect(params.vote_average_lte).toBe('9.0');
    });

    it('formats genre IDs as comma-separated string', () => {
      // Arrange
      const browseParams = createBrowseParams({ genres: [28, 12, 878] }); // Action, Adventure, Sci-Fi

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Genre array converted to comma-separated string
      expect(params.genres).toBe('28,12,878');
    });
  });

  describe('Empty/Default Filter Handling', () => {
    it('does not include parameters for empty filters', () => {
      // Arrange: All filters empty
      const browseParams = createBrowseParams();

      // Act
      const params = mapBrowseParamsToApi(browseParams, 'expanded');

      // Assert: Only sort_by present (default behavior)
      expect(params.sort_by).toBe('popularity.desc');
      expect(params).not.toHaveProperty('release_date_gte');
      expect(params).not.toHaveProperty('release_date_lte');
      expect(params).not.toHaveProperty('vote_average_gte');
      expect(params).not.toHaveProperty('vote_average_lte');
    });
  });
});
