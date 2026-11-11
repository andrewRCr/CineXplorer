import { useState, type ReactNode } from "react";
import { ChakraProvider, type SystemContext } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultSystem } from "@/theme";

export function TestProviders({
  children,
  system = defaultSystem,
}: {
  children: ReactNode;
  system?: SystemContext;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Infinity },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </QueryClientProvider>
  );
}
