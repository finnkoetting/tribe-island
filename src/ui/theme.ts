export type UiTheme = {
    background: string;
    text: string;
    panelBg: string;
    panelBorder: string;
    panelShadow: string;
    chipBg: string;
    chipBorder: string;
    accent: string;
    accentGlow: string;
    overlayGradient: string;
};

export const UI_THEME: UiTheme = {
    background:
        "radial-gradient(circle at 24% 18%, rgba(255,235,200,0.92) 0%, rgba(248,219,158,0.78) 40%, rgba(227,184,102,0.62) 68%, rgba(126,88,38,0.32) 100%)",
    text: "#2c1d0d",
    panelBg: "rgba(255, 241, 214, 0.82)",
    panelBorder: "rgba(255, 210, 140, 0.7)",
    panelShadow: "0 18px 36px rgba(80, 52, 20, 0.28)",
    chipBg: "rgba(255, 250, 236, 0.9)",
    chipBorder: "rgba(120, 82, 40, 0.25)",
    accent: "#f5b642",
    accentGlow: "0 14px 32px rgba(245, 182, 66, 0.35)",
    overlayGradient: "linear-gradient(180deg, rgba(255,228,190,0) 0%, rgba(255,210,140,0.38) 55%, rgba(132,90,40,0.22) 100%)"
};

export const BUILDING_COLORS: Partial<Record<string, string>> = {
    gather_hut: "#4a9a52",
    campfire: "#e0863f",
    storage: "#6a7bcf",
    watchpost: "#c45c7b",
    sawmill: "#c59a6c",
    townhall: "#3a5f8f",
    road: "#8d7355",
    rock: "#7b6858",
    tree: "#3a6f3d",
    berry_bush: "#2f7f3a",
    mushroom: "#b0514b"
};
