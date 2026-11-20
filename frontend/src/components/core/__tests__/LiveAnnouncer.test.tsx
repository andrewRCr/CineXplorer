import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, Dialog, Portal } from "@chakra-ui/react";
import { act, render, screen, waitFor } from "@tests/helpers/test-renderer";
import { announce } from "@/lib/announcer";
import { LiveAnnouncer } from "../LiveAnnouncer";

afterEach(() => {
  vi.useRealTimers();
});

describe("the app's live region", () => {
  it("waits for screen readers to track a new region before its first message", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    render(<LiveAnnouncer />);
    act(() => announce("Account created!"));
    const region = screen.getByRole("status");
    act(() => vi.advanceTimersByTime(150));
    expect(region).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(60));
    expect(region).toHaveTextContent("Account created!");
  });

  it("clears before each message, so a repeated message is announced again", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    render(<LiveAnnouncer />);
    act(() => vi.advanceTimersByTime(300));
    const region = screen.getByRole("status");
    act(() => announce("Too many requests."));
    act(() => vi.advanceTimersByTime(100));
    expect(region).toHaveTextContent("Too many requests.");
    act(() => announce("Too many requests."));
    expect(region).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(100));
    expect(region).toHaveTextContent("Too many requests.");
  });

  it("stays readable while a modal dialog hides the rest of the page", async () => {
    render(
      <>
        <Button>Behind the dialog</Button>
        <Dialog.Root open>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Title>Verify your email</Dialog.Title>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
        <LiveAnnouncer />
      </>,
    );
    // The dialog hides what's behind it from screen readers...
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Behind the dialog" }),
      ).not.toBeInTheDocument(),
    );
    act(() => announce("Email verified."));
    // ...but not the live region
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Email verified."),
    );
  });

  it("goes quiet when unmounted", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { unmount } = render(<LiveAnnouncer />);
    unmount();
    expect(() => announce("Nobody hears this")).not.toThrow();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
