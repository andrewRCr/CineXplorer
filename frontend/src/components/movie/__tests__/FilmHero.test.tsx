import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { mockViewport as viewport } from "@tests/helpers/viewport";
import { FilmHero } from "@/components/movie/FilmHero";

const film = {
  tmdb_id: 62,
  title: "A film",
  release_date: "1968-04-02",
  backdrop_path: "/frame.jpg",
  tagline: "An epic.",
};
const pitch = {
  heading: <h1>Pitch</h1>,
  description: <p>Hero description</p>,
  actions: <a href="/register">Create account</a>,
};
afterEach(() => vi.restoreAllMocks());

it.each([
  [2000, 1000, false],
  [1024, 1000, false],
  [900, 700, false],
  [390, 844, true],
  [768, 1024, true],
] as const)(
  "flips only a mirrored film's full-bleed image at %s×%s",
  (width, height, stacked) => {
    viewport(width, height);
    render(
      <FilmHero
        film={film}
        focusPoint={{ x: 12, y: 86 }}
        mirrored
        creditHref="/movie/62?from=home"
        {...pitch}
      />,
    );
    const image = screen.getByAltText("");
    expect(getComputedStyle(image).transform).toBe(
      stacked ? "none" : "scaleX(-1)",
    );
    // The point is given in the flipped frame, so the unflipped source is positioned at its mirror.
    expect(getComputedStyle(image).objectPosition).toBe(
      stacked ? "50% 50%" : "88% 86%",
    );
    for (const text of [
      screen.getByRole("heading", { level: 1, name: "Pitch" }),
      screen.getByRole("link", { name: /A film/ }),
    ])
      expect(getComputedStyle(text).transform).toBe("none");
  },
);

it.each([
  [390, 844, true, false, true],
  [768, 1024, true, true, true],
  [900, 700, false, false, true],
  [768, 600, false, false, true],
  [1024, 1000, false, true, false],
  [2000, 1000, false, true, false],
  [1023, 1200, true, true, true],
  [1024, 1200, false, true, false],
  [767, 1000, true, false, true],
  [768, 1000, true, true, true],
] as const)(
  "composes %s×%s with the right frame, text and reading order",
  (width, height, stacked, tagline, compact) => {
    viewport(width, height);
    render(
      <FilmHero
        film={film}
        directors={["First Director", "Second Director"]}
        focusPoint={{ x: 12, y: 86 }}
        creditHref="/movie/62?from=home"
        {...pitch}
      />,
    );
    const image = screen.getByAltText("");
    expect(getComputedStyle(image).objectFit).toBe(
      stacked ? "contain" : "cover",
    );
    expect(getComputedStyle(image).objectPosition).toBe(
      stacked ? "50% 50%" : "12% 86%",
    );
    expect(getComputedStyle(image).transform).toBe("none");
    const title = screen.getByRole("link", { name: /A film/ });
    const action = screen.getByRole("link", { name: "Create account" });
    expect(screen.getAllByRole("link")[0]).toBe(compact ? title : action);
    expect(title).toHaveAccessibleName("A film");
    // Browsers can name a capitalized link in capitals, so the title's own case is set explicitly.
    expect(title).toHaveAttribute("aria-label", "A film");
    expect(getComputedStyle(title).textTransform).toBe("uppercase");
    expect(title).toHaveAttribute("href", "/movie/62?from=home");
    expect(
      screen.getByRole("heading", { level: 1, name: "Pitch" }),
    ).toBeInTheDocument();
    if (stacked)
      expect(screen.queryByText("Hero description")).not.toBeInTheDocument();
    else expect(screen.getByText("Hero description")).toBeInTheDocument();
    if (tagline) expect(screen.getByText("An epic.")).toBeInTheDocument();
    else expect(screen.queryByText("An epic.")).not.toBeInTheDocument();
    expect(
      screen.getByText("First Director, Second Director 1968"),
    ).toBeInTheDocument();
    expect(screen.getByText("|")).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.queryByRole("link", { name: /First Director|An epic/ }),
    ).not.toBeInTheDocument();
  },
);

it.each([
  { directors: [], date: "1968-04-02", text: "1968" },
  { directors: ["Only Director"], date: null, text: "Only Director" },
])(
  "keeps the available credit part without a separator: $text",
  ({ directors, date, text }) => {
    viewport(2000, 1000);
    render(
      <FilmHero
        film={{ ...film, release_date: date }}
        directors={directors}
        {...pitch}
      />,
    );
    expect(screen.getByText(text, { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/\|/)).not.toBeInTheDocument();
  },
);

it("omits metadata when no director or year is available", () => {
  viewport(2000, 1000);
  render(
    <FilmHero
      film={{ ...film, release_date: null }}
      directors={[]}
      {...pitch}
    />,
  );
  expect(screen.getByRole("link", { name: "A film" })).toBeInTheDocument();
  expect(screen.queryByText("|")).not.toBeInTheDocument();
});
