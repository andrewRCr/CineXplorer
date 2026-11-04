import type { ReactElement } from "react";
import { useChakraContext } from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { describe, expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { renderWithRoute } from "@tests/helpers/test-renderer-with-routes";

const renderers = [
  { name: "render", render },
  {
    name: "renderWithRoute",
    render: (ui: ReactElement) =>
      renderWithRoute("/test", ui, { initialRoute: "/test" }),
  },
];

function ThemeProbe() {
  const system = useChakraContext();
  return (
    <output aria-label="Layer color">
      {system.token.var("colors.layer-01")}
    </output>
  );
}

function QueryProbe({ value }: { value: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["renderer-query"],
    queryFn: () => Promise.resolve(value),
    staleTime: Infinity,
  });
  return (
    <>
      <output aria-label="Query result">{query.data ?? query.status}</output>
      <output aria-label="Query cache">
        Cache: {client.getQueryData<string>(["renderer-query"]) ?? "empty"}
      </output>
    </>
  );
}

function FailingQueryProbe() {
  const query = useQuery({
    queryKey: ["renderer-failure"],
    queryFn: () => Promise.reject(new Error("Query unavailable")),
  });
  return <output>{query.error?.message ?? query.status}</output>;
}

describe.each(renderers)("$name providers", ({ render }) => {
  it("provides the application's semantic theme tokens", () => {
    render(<ThemeProbe />);
    expect(screen.getByLabelText("Layer color")).toHaveTextContent(
      "var(--chakra-colors-layer-01)",
    );
  });

  it("isolates cached data between separate renders", async () => {
    const view = render(<QueryProbe value="First result" />);
    expect(await screen.findByText("First result")).toBeInTheDocument();
    view.unmount();

    render(<QueryProbe value="Second result" />);
    expect(await screen.findByText("Second result")).toBeInTheDocument();
  });

  it("keeps its cached query result when rerendered", async () => {
    const view = render(<QueryProbe value="Cached result" />);
    expect(await screen.findByText("Cached result")).toBeInTheDocument();

    view.rerender(<QueryProbe value="Replacement result" />);
    expect(screen.getByText("Cached result")).toBeInTheDocument();
    expect(screen.getByLabelText("Query cache")).toHaveTextContent(
      "Cache: Cached result",
    );
  });

  it("reports query failures without waiting for retries", async () => {
    render(<FailingQueryProbe />);
    expect(await screen.findByText("Query unavailable")).toBeInTheDocument();
  });
});
