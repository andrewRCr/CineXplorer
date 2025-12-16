import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider } from "@/components/core/chakra/provider";
import { queryClient } from "@/lib/queryClient";
import App from "./App.tsx";

// Disable browser's native scroll restoration - we handle this manually
// for virtualized grids with sessionStorage-based position persistence.
// Must be set before React mounts to prevent race with browser restoration.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <App />
      </Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
