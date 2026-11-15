import { type ReactElement } from "react";
import { describe, it, expect } from "vitest";
import {
  isInaccessible,
  render as renderWithoutProviders,
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@tests/helpers/test-renderer";
import {
  styleSystem as badgeStyleSystem,
  expectResolvedColor,
} from "@tests/helpers/theme-styles";
import MovieUserScore from "../MovieUserScore";

const renderWithBadgeStyles = (ui: ReactElement) =>
  renderWithoutProviders(
    <ChakraProvider value={badgeStyleSystem}>{ui}</ChakraProvider>,
  );

const expectScoreStyle = (
  chip: HTMLElement,
  tier: "neutral" | "success" | "foreground" | "destructive",
) => {
  const styles = getComputedStyle(chip);
  // The decorative dot intentionally has no accessible role.
  // eslint-disable-next-line testing-library/no-node-access
  const dots = chip.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
  if (tier === "neutral") {
    expectResolvedColor(chip, "background-color", "var(--chakra-colors-badge)");
    expectResolvedColor(chip, "color", "var(--chakra-colors-on-badge)");
    expect(dots).toHaveLength(0);
    expect(styles.borderWidth).toMatch(/^(0px)?$/);
  } else {
    expect(styles.backgroundColor).toMatch(
      /^(transparent|rgba\(0, 0, 0, 0\))$/,
    );
    expect(styles.borderWidth).toBe("1px");
    expect(styles.borderStyle).toBe("solid");
    expectResolvedColor(
      chip,
      "border-color",
      "var(--chakra-colors-border-subtle-01)",
    );
    expectResolvedColor(chip, "color", "var(--chakra-colors-foreground)");
    expect(styles.boxShadow).toBe("none");
    expect(dots).toHaveLength(1);
    const dot = dots.item(0);
    expectResolvedColor(
      dot,
      "background-color",
      `var(--chakra-colors-${tier})`,
    );
    expect(getComputedStyle(dot).width).toBe("8px");
    expect(getComputedStyle(dot).height).toBe("8px");
    expect(isInaccessible(dot)).toBe(true);
  }
};

describe("MovieUserScore Component", () => {
  describe("TMDB rating only (default behavior)", () => {
    it("displays TMDB rating correctly (0-10 scale)", () => {
      render(<MovieUserScore score={7.2} voteCount={1500} />);

      // Look for the rating text (1 decimal place)
      expect(screen.getByText("7.2")).toBeInTheDocument();
    });

    it("shows correct tooltip for TMDB rating", () => {
      render(<MovieUserScore score={8.5} voteCount={1500} />);

      // Check the title attribute
      const badge = screen.getByText("8.5");
      expect(badge).toHaveAttribute("title", "TMDB Rating");
    });

    it("displays the maximum score to one decimal", () => {
      render(<MovieUserScore score={10} voteCount={1500} />);
      expect(screen.getByText("10.0")).toBeInTheDocument();
    });
  });

  describe("TMDB score with 10 or more votes", () => {
    const thresholdCases = (["compact", "detailed"] as const).flatMap(
      (presentation) => [
        { presentation, score: 7.5, label: "7.5", variant: "success" as const },
        {
          presentation,
          score: 7.47,
          label: "7.5",
          variant: "success" as const,
        },
        {
          presentation,
          score: 4.97,
          label: "5.0",
          variant: "foreground" as const,
        },
        {
          presentation,
          score: 7.4,
          label: "7.4",
          variant: "foreground" as const,
        },
        {
          presentation,
          score: 5.0,
          label: "5.0",
          variant: "foreground" as const,
        },
        {
          presentation,
          score: 4.9,
          label: "4.9",
          variant: "destructive" as const,
        },
      ],
    );

    it.each(thresholdCases)(
      "shows $label as $variant in the $presentation presentation",
      ({ presentation, score, label, variant }) => {
        renderWithBadgeStyles(
          <MovieUserScore
            score={score}
            voteCount={1500}
            presentation={presentation}
          />,
        );

        const badge = screen.getByTitle("TMDB Rating");
        expect(badge).toHaveTextContent(`TMDB Rating: ${label}`);
        expectScoreStyle(badge, variant);
        expect(badge).toHaveAttribute("title", "TMDB Rating");
      },
    );

    it.each(["compact", "detailed"] as const)(
      "scores normally at exactly 10 votes (%s)",
      (presentation) => {
        renderWithBadgeStyles(
          <MovieUserScore
            score={8.1}
            voteCount={10}
            presentation={presentation}
          />,
        );

        expectScoreStyle(screen.getByText("8.1"), "success");
      },
    );
  });

  describe("TMDB score with no votes", () => {
    const zeroVoteCases = [
      { label: "vote count 0", score: 7.2, voteCount: 0 },
      { label: "vote count null", score: 7.2, voteCount: null },
      { label: "vote count undefined", score: 7.2, voteCount: undefined },
      { label: "average null", score: null, voteCount: 1500 },
      { label: "average undefined", score: undefined, voteCount: 1500 },
    ];

    it.each(zeroVoteCases)(
      'shows a neutral "—" in the compact presentation ($label)',
      ({ score, voteCount }) => {
        renderWithBadgeStyles(
          <MovieUserScore score={score} voteCount={voteCount} />,
        );

        const badge = screen.getByText("—");
        expectScoreStyle(badge, "neutral");
        expect(badge).toHaveAttribute("title", "No TMDB votes yet");
      },
    );

    it.each(zeroVoteCases)(
      'shows a neutral "Not yet rated" in the detailed presentation ($label)',
      ({ score, voteCount }) => {
        renderWithBadgeStyles(
          <MovieUserScore
            score={score}
            voteCount={voteCount}
            presentation="detailed"
          />,
        );

        const badge = screen.getByText("Not yet rated");
        expectScoreStyle(badge, "neutral");
        expect(badge).toHaveAttribute("title", "No TMDB votes yet");
      },
    );

    it('never renders "0.0" for TMDB\'s zero-vote average', () => {
      const { rerender } = renderWithBadgeStyles(
        <MovieUserScore score={0} voteCount={0} />,
      );
      expect(screen.queryByText("0.0")).not.toBeInTheDocument();

      rerender(
        <ChakraProvider value={badgeStyleSystem}>
          <MovieUserScore score={0} voteCount={0} presentation="detailed" />
        </ChakraProvider>,
      );
      expect(screen.queryByText("0.0")).not.toBeInTheDocument();
    });
  });

  describe("TMDB score with 1–9 votes", () => {
    it('shows a neutral "—" in the compact presentation', () => {
      renderWithBadgeStyles(<MovieUserScore score={6.2} voteCount={4} />);

      const badge = screen.getByText("—");
      expectScoreStyle(badge, "neutral");
      expect(badge).toHaveAttribute("title", "Fewer than 10 TMDB votes");
      expect(screen.queryByText("6.2")).not.toBeInTheDocument();
    });

    it("shows the average with its vote count in the detailed presentation", () => {
      renderWithBadgeStyles(
        <MovieUserScore score={6.2} voteCount={4} presentation="detailed" />,
      );

      const badge = screen.getByText("6.2 · 4 votes");
      expectScoreStyle(badge, "neutral");
      expect(badge).toHaveAttribute("title", "TMDB Rating");
    });

    it("uses the singular for a single vote", () => {
      renderWithBadgeStyles(
        <MovieUserScore score={9} voteCount={1} presentation="detailed" />,
      );

      expectScoreStyle(screen.getByText("9.0 · 1 vote"), "neutral");
    });

    it("keeps 9 votes below the threshold in both presentations", () => {
      const { unmount } = renderWithBadgeStyles(
        <MovieUserScore score={8.1} voteCount={9} />,
      );
      expectScoreStyle(screen.getByText("—"), "neutral");
      unmount();

      renderWithBadgeStyles(
        <MovieUserScore score={8.1} voteCount={9} presentation="detailed" />,
      );
      expectScoreStyle(screen.getByText("8.1 · 9 votes"), "neutral");
    });
  });

  describe("Accessibility", () => {
    const tmdbStates = [
      {
        presentation: "compact" as const,
        score: 7.8,
        voteCount: 10,
        label: "7.8",
        explanation: "TMDB Rating",
      },
      {
        presentation: "detailed" as const,
        score: 7.8,
        voteCount: 10,
        label: "7.8",
        explanation: "TMDB Rating",
      },
      {
        presentation: "compact" as const,
        score: 0,
        voteCount: 0,
        label: "—",
        explanation: "No TMDB votes yet",
      },
      {
        presentation: "detailed" as const,
        score: 0,
        voteCount: 0,
        label: "Not yet rated",
        explanation: "No TMDB votes yet",
      },
      {
        presentation: "compact" as const,
        score: 6.2,
        voteCount: 4,
        label: "—",
        explanation: "Fewer than 10 TMDB votes",
      },
      {
        presentation: "detailed" as const,
        score: 6.2,
        voteCount: 4,
        label: "6.2 · 4 votes",
        explanation: "TMDB Rating",
      },
    ];

    it.each(tmdbStates)(
      'exposes "$explanation" for "$label" in the $presentation presentation',
      ({ presentation, score, voteCount, label, explanation }) => {
        renderWithBadgeStyles(
          <MovieUserScore
            score={score}
            voteCount={voteCount}
            presentation={presentation}
          />,
        );

        const badge = screen.getByTitle(explanation);
        const explanationText = within(badge).getByText(`${explanation}:`);
        expect(isInaccessible(explanationText)).toBe(false);
        expect(explanationText).toHaveStyle({
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        });
        expect(badge).toHaveTextContent(`${explanation}: ${label}`);
      },
    );
  });

  describe("Edge cases and error handling", () => {
    it("handles very low scores", () => {
      render(<MovieUserScore score={0.1} voteCount={1500} />);
      expect(screen.getByText("0.1")).toBeInTheDocument();
    });

    it("handles very high scores", () => {
      render(<MovieUserScore score={9.99} voteCount={1500} />);
      expect(screen.getByText("10.0")).toBeInTheDocument();
    });
  });
});
