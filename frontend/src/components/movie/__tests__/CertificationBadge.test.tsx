import { expect, it } from "vitest";
import { render, screen } from "@tests/helpers/test-renderer";
import { styleSystem, expectResolvedColor } from "@tests/helpers/theme-styles";
import CertificationBadge from "@/components/movie/CertificationBadge";
import { CERTIFICATION_OPTIONS } from "@/components/movie/utils/certificationUtils";

it.each(CERTIFICATION_OPTIONS)(
  "renders %s as a neutral certification",
  (certification) => {
    render(<CertificationBadge certification={certification} />, {
      system: styleSystem,
    });
    const badge = screen.getByTitle(`Rated ${certification}`);
    expect(badge).toHaveTextContent(certification);
    expectResolvedColor(
      badge,
      "background-color",
      "var(--chakra-colors-badge)",
    );
    expectResolvedColor(badge, "color", "var(--chakra-colors-on-badge)");
  },
);

it.each([null, undefined, ""])(
  "omits a missing certification (%s)",
  (certification) => {
    const { container } = render(
      <CertificationBadge certification={certification} />,
      { system: styleSystem },
    );
    expect(container).toBeEmptyDOMElement();
  },
);
