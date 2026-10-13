import { render, screen } from "@testing-library/react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { Providers } from "./Providers";

function ClientProbe({ onClient }: { onClient: (client: QueryClient) => void }) {
  onClient(useQueryClient());
  return <p>child content</p>;
}

describe("Providers", () => {
  it("renders its children", () => {
    render(
      <Providers>
        <p>child content</p>
      </Providers>
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("provides a QueryClient to descendants", () => {
    const clients: QueryClient[] = [];

    render(
      <Providers>
        <ClientProbe onClient={(client) => clients.push(client)} />
      </Providers>
    );

    expect(clients[0]).toBeDefined();
  });

  it("keeps the same QueryClient across re-renders", () => {
    const clients: QueryClient[] = [];
    const probe = <ClientProbe onClient={(client) => clients.push(client)} />;

    const { rerender } = render(<Providers>{probe}</Providers>);
    rerender(<Providers>{probe}</Providers>);
    rerender(
      <Providers>
        <ClientProbe onClient={(client) => clients.push(client)} />
      </Providers>
    );

    expect(clients.length).toBeGreaterThanOrEqual(2);
    expect(new Set(clients).size).toBe(1);
  });
});
