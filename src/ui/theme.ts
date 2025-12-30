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
        "radial-gradient(circle at 18% 20%, #1d2f4b 0%, #0f192d 36%, #0b1224 62%, #070d18 100%)",
    text: "#e9edf5",
    panelBg: "rgba(14, 18, 32, 0.82)",
    panelBorder: "rgba(124, 243, 255, 0.25)",
    panelShadow: "0 22px 60px rgba(0, 0, 0, 0.55)",
    chipBg: "rgba(255, 255, 255, 0.04)",
    chipBorder: "rgba(255, 255, 255, 0.1)",
    accent: "#7cf3ff",
    accentGlow: "0 16px 40px rgba(124, 243, 255, 0.45)",
    overlayGradient: "linear-gradient(180deg, rgba(64,180,255,0) 0%, rgba(64,180,255,0.18) 50%, rgba(32,130,200,0.26) 100%)"
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
