import { expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@tests/helpers/test-renderer";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import CertificationFilter from "@/components/movie/browse/CertificationFilter";
import { CERTIFICATION_OPTIONS } from "@/components/movie/utils/certificationUtils";

function pillFor(certification: string) {
  const input = screen.getByRole("checkbox", {
    name: certification,
  });
  // The checkbox's enclosing label owns the pill's rendered styles.
  // eslint-disable-next-line testing-library/no-node-access
  const pill = input.closest("label");
  if (!pill) throw new Error("Certification checkbox must have a pill label");
  return pill;
}

it.each(CERTIFICATION_OPTIONS)(
  "selects %s with the theme's selection color and no inset ring",
  (certification) => {
    render(
      <CertificationFilter
        selectedCertifications={[certification]}
        onChange={() => {}}
      />,
      { system: styleSystem },
    );
    expect(screen.getByRole("checkbox", { name: certification })).toBeChecked();
    const pill = pillFor(certification);
    expectResolvedColor(
      pill,
      "background-color",
      "var(--chakra-colors-tertiary)",
    );
    expectResolvedColor(pill, "color", "var(--chakra-colors-on-tertiary)");
    expectResolvedColor(pill, "border-color", "var(--chakra-colors-tertiary)");
    expect(getComputedStyle(pill).boxShadow).toBe("none");
  },
);

it("draws the selected keyboard focus outline in the theme ring color", async () => {
  const user = userEvent.setup();
  render(
    <CertificationFilter selectedCertifications={["NR"]} onChange={() => {}} />,
    { system: styleSystem },
  );
  await user.tab();
  expect(screen.getByRole("checkbox", { name: "NR" })).toHaveFocus();
  const pill = pillFor("NR");
  expect(getComputedStyle(pill).outlineStyle).toBe("solid");
  expectResolvedColor(pill, "outline-color", "var(--chakra-colors-ring)");
});

it.each(CERTIFICATION_OPTIONS)(
  "keeps unselected %s transparent with a strong neutral border",
  (certification) => {
    render(
      <CertificationFilter selectedCertifications={[]} onChange={() => {}} />,
      { system: styleSystem },
    );
    const pill = pillFor(certification);
    expect(getComputedStyle(pill).backgroundColor).toMatch(
      /^(transparent|rgba\(0, 0, 0, 0\))$/,
    );
    expectResolvedColor(
      pill,
      "border-color",
      "var(--chakra-colors-border-strong-01)",
    );
    expectResolvedColor(pill, "color", "var(--chakra-colors-on-muted)");
  },
);
