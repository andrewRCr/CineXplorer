import { chakra, type HTMLChakraProps } from "@chakra-ui/react";

const PosterPlaceholder = (props: HTMLChakraProps<"svg">) => (
  <chakra.svg
    xmlns="http://www.w3.org/2000/svg"
    width="500"
    height="750"
    viewBox="0 0 500 750"
    role="img"
    bg="badge"
    color="on-badge"
    fontFamily="body"
    fontSize="5xl"
    {...props}
  >
    <text fill="currentColor" textAnchor="middle">
      <tspan x="250" y="360">
        No
      </tspan>
      <tspan x="250" y="420">
        Image
      </tspan>
    </text>
  </chakra.svg>
);

export default PosterPlaceholder;
