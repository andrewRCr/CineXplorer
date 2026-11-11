/* eslint-disable react-refresh/only-export-components */
import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TestProviders } from "./test-providers";

import type { SystemContext } from "@chakra-ui/react";

interface TestRenderOptions extends Omit<RenderOptions, "wrapper"> {
  system?: SystemContext;
}

const customRender = (
  ui: ReactElement,
  { system, ...options }: TestRenderOptions = {},
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <TestProviders system={system}>
      <MemoryRouter>{children}</MemoryRouter>
    </TestProviders>
  );
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };
