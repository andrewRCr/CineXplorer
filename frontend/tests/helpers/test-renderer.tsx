/* eslint-disable react-refresh/only-export-components */
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from '@/components/chakra/provider';

// Custom render function that includes common providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
	return (
		<Provider>
			<MemoryRouter>
				{children}
			</MemoryRouter>
		</Provider>
	);
};

// Custom render function
const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };
