import { RatingGroup } from "@chakra-ui/react";

interface HalfStarRatingItemProps extends RatingGroup.ItemProps {
  onPointerValue: (value: number) => void;
  disabled?: boolean;
}

/** Resolve a completed click or tap without depending on a preceding hover movement. */
export function HalfStarRatingItem({
  index,
  onPointerValue,
  onClickCapture,
  disabled,
  ...props
}: HalfStarRatingItemProps) {
  return (
    <RatingGroup.Item
      {...props}
      index={index}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        // Keyboard activation keeps the rating group's native half-step behavior.
        if (disabled || event.defaultPrevented || event.detail === 0) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width === 0) return;
        // Prevent the widget's integer click handler from overwriting this fractional value.
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        onPointerValue(
          index - (event.clientX < bounds.left + bounds.width / 2 ? 0.5 : 0),
        );
      }}
    />
  );
}
