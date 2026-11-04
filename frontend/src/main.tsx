import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "@/components/core/chakra/provider";
import { Toaster, PriorityToaster } from "@/components/core/chakra/toaster";
import { QueryDevtoolsToggle } from "@/components/core/QueryDevtoolsToggle";
import { initConsoleCapture } from "@/services/consoleCapture";
import { queryClient } from "@/lib/queryClient";
import App from "./App.tsx";

// Disable browser's native scroll restoration - we handle this manually
// for virtualized grids with sessionStorage-based position persistence.
// Must be set before React mounts to prevent race with browser restoration.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

initConsoleCapture();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <App />
        <Toaster />
        <PriorityToaster />
      </Provider>
      <QueryDevtoolsToggle />
    </QueryClientProvider>
  </StrictMode>,
);
