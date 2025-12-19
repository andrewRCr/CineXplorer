/**
 * Tests for Featured page component
 *
 * NOTE: Featured is currently a minimal stub/placeholder. This test file
 * contains only a basic smoke test to verify the component renders.
 *
 * Expand test coverage when the Featured page is properly implemented with:
 * - Hero section with featured movies
 * - Dynamic content loading
 * - User personalization features
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ChakraProvider } from '@/components/core/chakra/provider';
import Featured from '../Featured';

function renderWithProviders(component: React.ReactElement) {
  return render(
    <ChakraProvider>
      <BrowserRouter>{component}</BrowserRouter>
    </ChakraProvider>
  );
}

describe('Featured Page', () => {
  it('renders without errors', () => {
    renderWithProviders(<Featured />);

    // Verify basic content renders
    expect(screen.getByText('Welcome to CineXplorer')).toBeInTheDocument();
  });
});
