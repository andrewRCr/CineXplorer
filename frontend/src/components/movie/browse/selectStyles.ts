export const BROWSE_SELECT_TRIGGER_BASE_PROPS = {
  minH: "32px",
  h: "32px",
  fontSize: "14px",
  lineHeight: "1.2",
  border: "1px solid",
  borderColor: "button-outline",
  backgroundColor: "transparent",
  _hover: {
    bg: "tertiary/8",
  },
  _focusVisible: {
    borderColor: "tertiary",
  },
};

export const BROWSE_SELECT_TRIGGER_CSS = {
  padding: "6px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  "& [data-part='indicator']": {
    width: "16px",
    height: "16px",
  },
};
