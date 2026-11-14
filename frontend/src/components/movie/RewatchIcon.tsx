import { Icon } from "@chakra-ui/react";
import { LuRotateCcw } from "react-icons/lu";

/** A non-interactive rewatch marker that inherits the surrounding text color. */
export function RewatchIcon() {
  return (
    <Icon
      as={LuRotateCcw}
      aria-hidden={false}
      role="img"
      aria-label="Rewatch"
      focusable="false"
    />
  );
}
