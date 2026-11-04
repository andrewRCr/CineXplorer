/* eslint-disable react-refresh/only-export-components */
import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TestProviders } from "./test-providers";

// Custom render function that includes common providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <TestProviders>
      <MemoryRouter>{children}</MemoryRouter>
    </TestProviders>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };
