import { useRef, useState } from "react";
import { useLocation } from "react-router";
import { expect, it } from "vitest";
import { render, screen, waitFor } from "@tests/helpers/test-renderer";
import userEvent from "@testing-library/user-event";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";
import { EntryDialogHost } from "../EntryDialogHost";

const film = { tmdbId: 1, title: "Test film", year: "2024", posterPath: null };
const entry = {
  id: 7,
  tmdb_id: 1,
  watched_on: "2026-11-01",
  rating: 7,
  review: "A viewing",
  rewatch: false,
};
function Opener({
  edit = false,
  unmount = false,
}: {
  edit?: boolean;
  unmount?: boolean;
}) {
  const { open } = useEntryDialog();
  const [visible, setVisible] = useState(true);
  const fallback = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  return (
    <>
      <output aria-label="Current location">
        {location.pathname}
        {location.search}
      </output>
      <button ref={fallback}>Surviving control</button>
      {visible && (
        <button
          onClick={() => {
            open({
              film,
              dateOn: true,
              filmChangeable: false,
              entry: edit ? entry : undefined,
              returnFocus: () => fallback.current,
            });
            if (unmount) setVisible(false);
          }}
        >
          Open entry
        </button>
      )}
    </>
  );
}

it.each([false, true])(
  "opens one titled dialog without navigation; editing: %s",
  async (edit) => {
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener edit={edit} />
      </EntryDialogHost>,
    );
    const location = screen.getByRole("status", { name: "Current location" });
    const original = location.textContent;
    await user.click(screen.getByRole("button", { name: "Open entry" }));
    expect(
      await screen.findByRole("dialog", {
        name: edit ? "Edit entry" : "Review or log",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(location.textContent).toBe(original);
  },
);

it.each([false, true])(
  "returns focus to the opener or its fallback; opener gone: %s",
  async (unmount) => {
    const user = userEvent.setup();
    render(
      <EntryDialogHost>
        <Opener unmount={unmount} />
      </EntryDialogHost>,
    );
    const opener = screen.getByRole("button", { name: "Open entry" });
    const fallback = screen.getByRole("button", { name: "Surviving control" });
    await user.click(opener);
    await screen.findByRole("dialog", { name: "Review or log" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(unmount ? fallback : opener).toHaveFocus());
  },
);

it("Escape closes and returns focus", async () => {
  const user = userEvent.setup();
  render(
    <EntryDialogHost>
      <Opener />
    </EntryDialogHost>,
  );
  const opener = screen.getByRole("button", { name: "Open entry" });
  await user.click(opener);
  await screen.findByRole("dialog", { name: "Review or log" });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(opener).toHaveFocus());
});

it("renders outside a host and reports a missing host only when open is called", async () => {
  function Outside() {
    const { open } = useEntryDialog();
    const [error, setError] = useState("");
    return (
      <>
        <button
          onClick={() => {
            try {
              open({ dateOn: true, filmChangeable: true });
            } catch (error) {
              if (error instanceof Error) setError(error.message);
            }
          }}
        >
          Open outside
        </button>
        <output aria-label="Error">{error}</output>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Outside />);
  expect(screen.getByRole("status", { name: "Error" })).toBeEmptyDOMElement();
  await user.click(screen.getByRole("button", { name: "Open outside" }));
  expect(screen.getByRole("status", { name: "Error" })).toHaveTextContent(
    "EntryDialogHost",
  );
});
