import { THEME } from "../theme";

// Modal style that uses centralized THEME tokens for consistency.
export const MODAL_STYLE = {
  background: THEME.modal.background,
  borderRadius: THEME.modal.borderRadius,
  border: THEME.modal.border,
  boxShadow: THEME.modal.boxShadow,
  padding: THEME.modal.padding,
  color: THEME.modal.color,
  fontFamily: THEME.fonts.base,
  headerFontWeight: THEME.modal.headerFontWeight,
  headerFontSize: THEME.modal.headerFontSize,
  subHeaderFontSize: THEME.modal.subHeaderFontSize,
  button: {
    background: THEME.button.background,
    color: THEME.button.color,
    border: THEME.button.border,
    borderRadius: THEME.button.borderRadius,
    fontWeight: THEME.button.fontWeight,
    fontSize: THEME.button.fontSize,
    boxShadow: THEME.button.boxShadow,
    padding: THEME.button.padding,
    hover: {
      background: THEME.button.hoverBackground,
      color: "#3e3520",
    }
  },
  card: {
    background: THEME.modal.cardBg,
    border: THEME.modal.cardBorder,
    borderRadius: THEME.modal.cardRadius,
    boxShadow: THEME.shadows.button,
    padding: 16,
  }
};
