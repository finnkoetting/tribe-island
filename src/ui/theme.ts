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
        background: "radial-gradient(circle at 18% 20%, #1d2f4b 0%, #0f192d 36%, #0b1224 62%, #070d18 100%)",
        text: "#e9edf5",
        panelBg: "rgba(14, 18, 32, 0.82)",
        panelBorder: "rgba(245, 165, 36, 0.20)",
        chipBg: "rgba(255, 255, 255, 0.04)",
        chipBorder: "rgba(255, 255, 255, 0.1)",
        // HUD / glass tokens (lighter, warm-tinted glass for overlays)
        glassBg: "rgba(255, 245, 230, 0.06)",
        glassStrong: "rgba(255, 245, 230, 0.10)",
        cardBg: "linear-gradient(145deg, rgba(255,250,240,0.02), rgba(255,245,230,0.01))",
        mutedBg: "rgba(255,255,255,0.03)",
        gradientEdge: "linear-gradient(135deg, rgba(245,165,36,0.08), rgba(226,193,124,0.06))",
        accent: "#f5a524",
        gold: "#e2c17c",
        accentGlowColor: "rgba(245,165,36,0.35)",
        overlayGradient: "linear-gradient(180deg, rgba(245,165,36,0) 0%, rgba(245,165,36,0.14) 50%, rgba(200,120,20,0.22) 100%)",
        // Buttons
        accentButton: "linear-gradient(135deg, #ffd86b, #f5a524)",
        secondaryButton: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
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
        base: "Quicksand, Nunito, Arial, sans-serif",
    },

    shadows: {
        panel: "0 22px 60px rgba(0, 0, 0, 0.55)",
        modal: "0 8px 32px rgba(60,40,10,0.25)",
        button: "0 2px 8px rgba(60,40,10,0.10)",
    },

    button: {
        background: "linear-gradient(90deg, #ffe082 0%, #ffd54f 100%)",
        hoverBackground: "linear-gradient(90deg, #fffde7 0%, #ffe082 100%)",
        color: "#4b4327",
        border: `2px solid ${"#e2c17c"}`,
        borderRadius: 14,
        fontWeight: 900,
        fontSize: 16,
        boxShadow: "0 2px 8px rgba(60,40,10,0.10)",
        padding: "12px 28px",
    },

    modal: {
        background: "linear-gradient(135deg, #2e2a1c 0%, #4b4327 100%)",
        borderRadius: 22,
        border: `3px solid ${"#e2c17c"}`,
        boxShadow: "0 8px 32px rgba(60,40,10,0.25)",
        padding: 24,
        color: "#fffbe6",
        headerFontWeight: 900,
        headerFontSize: 22,
        subHeaderFontSize: 15,
        cardBg: "rgba(255, 245, 200, 0.08)",
        cardBorder: `2px solid ${"#e2c17c"}`,
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