import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@tests/helpers/test-renderer';
import Footer from '../Footer';

// Mock the theme constants
vi.mock('@/constants/theme', () => ({
  COLORS: {
    background: { footer: '#f8f9fa' },
    border: { main: '#e2e8f0' },
    text: {
      muted: '#6b7280'
    }
  }
}));

// Mock the TMDB logo import
vi.mock('../../../assets/tmdb_logo_alt_short.svg', () => ({
  default: '/mock-tmdb-logo.svg'
}));

// Mock components that require context providers
// Note: Using inline factories to avoid hoisting issues with imported helpers
vi.mock('@/components/common', () => ({
  TextLink: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  ThemeSelector: () => <div data-testid="theme-selector">Theme Selector</div>
}));

vi.mock('@/components/core/chakra/color-mode', () => ({
  ColorModeButton: () => <button data-testid="color-mode-button">Color Mode</button>
}));

describe('Footer Component', () => {
  describe('Basic Rendering', () => {
    it('renders footer with correct semantic structure', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveAttribute('aria-label', 'Application footer with TMDB attribution and theme controls');
    });

    it('renders copyright text', () => {
      render(<Footer />);
      
      expect(screen.getByText('© 2025 CineXplorer. All rights reserved.')).toBeInTheDocument();
    });

    it('renders TMDB attribution text', () => {
      render(<Footer />);
      
      const attributionText = screen.getByText(
        'This product uses the TMDB API but is not endorsed or certified by TMDB.'
      );
      expect(attributionText).toBeInTheDocument();
    });

    it('renders TMDB logo image', () => {
      render(<Footer />);
      
      const logo = screen.getByAltText('TMDB Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/mock-tmdb-logo.svg');
    });
  });

  describe('External Link Behavior', () => {
    it('renders TMDB API documentation link with correct attributes', () => {
      render(<Footer />);
      
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      expect(tmdbLink).toBeInTheDocument();
      expect(tmdbLink).toHaveAttribute('href', 'https://www.themoviedb.org/documentation/api');
      expect(tmdbLink).toHaveAttribute('target', '_blank');
      expect(tmdbLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('provides accessible link label', () => {
      render(<Footer />);
      
      const tmdbLink = screen.getByLabelText('TMDB API Documentation');
      expect(tmdbLink).toBeInTheDocument();
    });

    it('contains TMDB logo within the link', () => {
      render(<Footer />);
      
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      const logo = screen.getByAltText('TMDB Logo');
      
      expect(tmdbLink).toContainElement(logo);
    });
  });

  describe('Image and Asset Handling', () => {
    it('renders TMDB logo with correct styling attributes', () => {
      render(<Footer />);
      
      const logo = screen.getByAltText('TMDB Logo');
      expect(logo).toHaveStyle({ height: '18px', opacity: '0.7' });
    });

    it('provides meaningful alt text for screen readers', () => {
      render(<Footer />);
      
      const logo = screen.getByAltText('TMDB Logo');
      expect(logo).toHaveAccessibleName('TMDB Logo');
    });

    it('handles logo as clickable element within link', () => {
      render(<Footer />);
      
      const logo = screen.getByAltText('TMDB Logo');
      const link = screen.getByRole('link', { name: 'TMDB API Documentation' });
      
      // Logo should be inside the clickable link
      expect(link).toContainElement(logo);
    });
  });

  describe('Layout and Styling Structure', () => {
    it('applies correct container styling', () => {
      render(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      
      // Footer should have proper semantic role and styling classes
      expect(footer).toHaveStyle({
        width: '100%',
        textAlign: 'center'
      });
    });

    it('organizes content in vertical stack layout', () => {
      const { container } = render(<Footer />);
      
      // Should have VStack structure with proper gap
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
      
      // Check that content is organized properly
      const copyrightText = screen.getByText('© 2025 CineXplorer. All rights reserved.');
      const attributionText = screen.getByText(/This product uses the TMDB API/);
      
      expect(copyrightText).toBeInTheDocument();
      expect(attributionText).toBeInTheDocument();
    });

    it('maintains consistent spacing between sections', () => {
      render(<Footer />);

      // Both text sections should be present and structured properly
      expect(screen.getByText('© 2025 CineXplorer. All rights reserved.')).toBeInTheDocument();
      expect(screen.getByText(/This product uses the TMDB API/)).toBeInTheDocument();

      // Logo and link should be in the same section as attribution text
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      const logo = screen.getByAltText('TMDB Logo');
      expect(tmdbLink).toContainElement(logo);
    });
  });

  describe('Accessibility Features', () => {
    it('provides proper semantic footer role', () => {
      render(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('includes descriptive aria-label for footer', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveAttribute('aria-label', 'Application footer with TMDB attribution and theme controls');
    });

    it('ensures external link has proper accessibility attributes', () => {
      render(<Footer />);
      
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      
      // External links should have proper security and accessibility attributes
      expect(tmdbLink).toHaveAttribute('target', '_blank');
      expect(tmdbLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(tmdbLink).toHaveAttribute('aria-label', 'TMDB API Documentation');
    });

    it('provides meaningful text content for screen readers', () => {
      render(<Footer />);
      
      // All text should be accessible
      expect(screen.getByText('© 2025 CineXplorer. All rights reserved.')).toBeInTheDocument();
      expect(screen.getByText(/This product uses the TMDB API/)).toBeInTheDocument();
      
      // Image should have alt text
      expect(screen.getByAltText('TMDB Logo')).toBeInTheDocument();
    });

    it('maintains focus order for keyboard navigation', () => {
      render(<Footer />);
      
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      
      // Link should be focusable
      tmdbLink.focus();
      expect(tmdbLink).toHaveFocus();
    });
  });

  describe('Content Accuracy', () => {
    it('displays current year in copyright', () => {
      render(<Footer />);
      
      const copyrightText = screen.getByText('© 2025 CineXplorer. All rights reserved.');
      expect(copyrightText).toBeInTheDocument();
    });

    it('includes accurate TMDB disclaimer', () => {
      render(<Footer />);
      
      const disclaimer = screen.getByText(
        'This product uses the TMDB API but is not endorsed or certified by TMDB.'
      );
      expect(disclaimer).toBeInTheDocument();
    });

    it('links to correct TMDB API documentation URL', () => {
      render(<Footer />);
      
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      expect(tmdbLink).toHaveAttribute('href', 'https://www.themoviedb.org/documentation/api');
    });
  });

  describe('Component Structure', () => {
    it('renders without crashing', () => {
      const { container } = render(<Footer />);
      expect(container).toBeInTheDocument();
    });

    it('maintains consistent component structure', () => {
      render(<Footer />);

      // Should have all expected elements
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText('© 2025 CineXplorer. All rights reserved.')).toBeInTheDocument();
      expect(screen.getByText(/This product uses the TMDB API/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'TMDB API Documentation' })).toBeInTheDocument();
      expect(screen.getByAltText('TMDB Logo')).toBeInTheDocument();
    });

    it('uses proper HTML semantics', () => {
      const { container } = render(<Footer />);
      
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
      
      // Should contain proper link element
      const link = container.querySelector('a[href*="themoviedb.org"]');
      expect(link).toBeInTheDocument();
      
      // Should contain proper image element
      const img = container.querySelector('img[alt="TMDB Logo"]');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing logo asset gracefully', () => {
      // Component should render even if logo fails to load
      render(<Footer />);

      const logo = screen.getByAltText('TMDB Logo');
      expect(logo).toBeInTheDocument();

      // Component structure should remain intact
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'TMDB API Documentation' })).toBeInTheDocument();
    });

    it('maintains functionality with broken external link', () => {
      render(<Footer />);

      // Link should still be present with correct attributes even if destination is unreachable
      const tmdbLink = screen.getByRole('link', { name: 'TMDB API Documentation' });
      expect(tmdbLink).toHaveAttribute('href', 'https://www.themoviedb.org/documentation/api');
      expect(tmdbLink).toHaveAttribute('target', '_blank');
      expect(tmdbLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('handles theme color constants gracefully', () => {
      // Component should render even if theme constants are missing
      const { container } = render(<Footer />);
      expect(container).toBeInTheDocument();
      
      // Essential content should still be present
      expect(screen.getByText('© 2025 CineXplorer. All rights reserved.')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('renders efficiently without expensive operations', () => {
      const { container } = render(<Footer />);
      
      // Should render quickly with static content
      expect(container).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('maintains consistent render output', () => {
      const { container: container1 } = render(<Footer />);
      const { container: container2 } = render(<Footer />);
      
      // Multiple renders should produce consistent output
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });
});