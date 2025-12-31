import { UI_THEME as THEME } from "../../../../src/ui/theme";

export const GLASS_BG = THEME.glassBg;
export const GLASS_STRONG = THEME.glassStrong;
export const CARD_BG = THEME.cardBg;
export const GRADIENT_EDGE = THEME.gradientEdge;
export const ACCENT_BUTTON = THEME.accentButton ?? "linear-gradient(180deg, #ffeaa7 0%, #ffc857 45%, #f4a63a 100%)";
export const SECONDARY_BUTTON = THEME.cardBg;
export const PANEL_BORDER = `1px solid ${THEME.panelBorder}`;
export const CHIP_BORDER = `1px solid ${THEME.chipBorder}`;

// Warm wood-leaning textures to mirror the cozy reference UI.
export const WOOD_TEXTURE =
	"linear-gradient(155deg, rgba(255, 224, 176, 0.28), rgba(210, 145, 86, 0.25))," +
	"repeating-linear-gradient(90deg, rgba(255, 240, 208, 0.08) 0px, rgba(255, 240, 208, 0.08) 12px, rgba(130, 80, 40, 0.10) 12px, rgba(130, 80, 40, 0.10) 22px)";
export const HUD_BAR_BG =
	"linear-gradient(180deg, #9b7045 0%, #724b2c 46%, #593620 100%)," +
	"repeating-linear-gradient(90deg, rgba(255, 235, 200, 0.10) 0px, rgba(255, 235, 200, 0.10) 10px, rgba(90, 54, 24, 0.14) 10px, rgba(90, 54, 24, 0.14) 18px)";
export const EDGE_SHADOW = "0 12px 40px rgba(0,0,0,0.45)";

export { THEME };
