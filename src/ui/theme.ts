export type UiTheme = {
    background: string;
    text: string;
    panelBg: string;
    panelBorder: string;
    panelShadow: string;
    chipBg: string;
    chipBorder: string;
    glassBg: string;
    glassStrong: string;
    cardBg: string;
    mutedBg: string;
    gradientEdge: string;
    accent: string;
    accentGlow: string;
    overlayGradient: string;
    accentButton?: string;
    secondaryButton?: string;
};

// Centralized THEME for the UI. Use these tokens across components.
export const THEME = {
    colors: {
        background: "radial-gradient(circle at 14% 12%, #3c5a8a 0%, #273b60 32%, #1a2541 60%, #0f1627 100%)",
        text: "#fff7e1",
        panelBg: "linear-gradient(145deg, rgba(96,66,38,0.96), rgba(63,43,27,0.96))",
        panelBorder: "rgba(155, 112, 69, 0.65)",
        chipBg: "rgba(255, 223, 170, 0.18)",
        chipBorder: "rgba(255, 207, 132, 0.55)",
        // HUD / glass tokens (warm, playful glass for overlays)
        glassBg: "rgba(255, 223, 170, 0.18)",
        glassStrong: "rgba(255, 223, 170, 0.26)",
        cardBg: "linear-gradient(155deg, rgba(255, 228, 182, 0.20), rgba(214, 158, 98, 0.18))",
        mutedBg: "rgba(255, 239, 214, 0.18)",
        gradientEdge: "linear-gradient(180deg, rgba(255, 221, 120, 0.22), rgba(201, 140, 70, 0.16))",
        accent: "#ffce5c",
        gold: "#f3b86b",
        accentGlowColor: "rgba(255, 204, 108, 0.45)",
        overlayGradient: "linear-gradient(180deg, rgba(255, 215, 150, 0) 0%, rgba(255, 199, 120, 0.22) 50%, rgba(191, 121, 60, 0.32) 100%)",
        // Buttons
        accentButton: "linear-gradient(180deg, #ffeaa7 0%, #ffc857 45%, #f4a63a 100%)",
        secondaryButton: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
    },

    radii: {
        sm: 8,
        md: 16,
        lg: 22,
    },

    spacing: {
        xs: 6,
        sm: 8,
        md: 16,
        lg: 24,
    },

    fonts: {
        base: "\"Baloo 2\", \"Fredoka\", Nunito, Quicksand, sans-serif",
    },

    shadows: {
        panel: "0 24px 60px rgba(0, 0, 0, 0.6)",
        modal: "0 16px 48px rgba(20, 10, 2, 0.55)",
        button: "0 12px 26px rgba(0, 0, 0, 0.28)",
    },

    button: {
        background: "linear-gradient(180deg, #ffeaa7 0%, #ffc857 45%, #f4a63a 100%)",
        hoverBackground: "linear-gradient(180deg, #fff3c7 0%, #ffdf8f 50%, #f6b34a 100%)",
        color: "#5a3b1a",
        border: `2px solid ${"#f0c46f"}`,
        borderRadius: 16,
        fontWeight: 900,
        fontSize: 16,
        boxShadow: "0 12px 26px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.45)",
        padding: "13px 30px",
    },

    modal: {
        background: "linear-gradient(165deg, #5b4124 0%, #3c2617 58%, #29170f 100%)",
        borderRadius: 22,
        border: `4px solid ${"#f0c46f"}`,
        boxShadow: "0 16px 48px rgba(20,10,2,0.55)",
        padding: 26,
        color: "#fff7e1",
        headerFontWeight: 900,
        headerFontSize: 22,
        subHeaderFontSize: 15,
        cardBg: "linear-gradient(150deg, rgba(255, 222, 179, 0.22), rgba(255, 197, 120, 0.16))",
        cardBorder: `2px solid ${"#f0c46f"}`,
        cardRadius: 16,
    },

    transitions: {
        fast: "180ms ease",
        normal: "220ms cubic-bezier(.2,.9,.2,1)",
    }
} as const;

// Backwards compatible UI_THEME (keeps previous shape)
export const UI_THEME: UiTheme = {
    background: THEME.colors.background,
    text: THEME.colors.text,
    panelBg: THEME.colors.panelBg,
    panelBorder: THEME.colors.panelBorder,
    panelShadow: THEME.shadows.panel,
    chipBg: THEME.colors.chipBg,
    chipBorder: THEME.colors.chipBorder,
    glassBg: THEME.colors.glassBg,
    glassStrong: THEME.colors.glassStrong,
    cardBg: THEME.colors.cardBg,
    mutedBg: THEME.colors.mutedBg,
    gradientEdge: THEME.colors.gradientEdge,
    accent: THEME.colors.accent,
    accentGlow: `0 16px 40px ${THEME.colors.accentGlowColor}`,
    overlayGradient: THEME.colors.overlayGradient,
    accentButton: THEME.colors.accentButton,
    secondaryButton: THEME.colors.secondaryButton,
};
export const BUILDING_COLORS: Partial<Record<string, string>> = {
    gather_hut: "transparent",
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