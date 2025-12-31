"use client";

import type { BuildingTypeId } from "../../../src/game/types/GameState";
import { GLASS_STRONG, THEME } from "./themeTokens";
import { useState } from "react";

export function BottomHud({
    buildMode,
    onToggleBuildMenu,
    onToggleVillagerMenu,
    villagerMenuOpen,
    onCloseBuildingModal
}: {
    buildMode: BuildingTypeId | null;
    onToggleBuildMenu: () => void;
    onToggleVillagerMenu?: () => void;
    villagerMenuOpen?: boolean;
    onCloseBuildingModal: () => void;
}) {
    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                gap: 12,
                background: "transparent",
                zIndex: 80
            }}
        >
            <div style={{ width: "17.5%", height: "160px", display: "flex", justifyContent: "center", pointerEvents: "auto", marginBottom: 8 }}>
                <div style={{ width: "min(920px,92%)", display: "flex", justifyContent: "center", pointerEvents: "auto", marginBottom: 8, background: GLASS_STRONG, border: `1px solid ${THEME.panelBorder}`, borderRadius: 18, padding: "10px 14px", boxShadow: "0 -10px 30px rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                    <div style={{ display: "flex", gap: 20, pointerEvents: "auto", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
                        <VillagerButton active={!!villagerMenuOpen} onClick={() => onToggleVillagerMenu?.()} />
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <LargeBuildButton active={!!buildMode} onClick={() => { onCloseBuildingModal(); onToggleBuildMenu(); }} />
                        </div>
                        <InventoryButton active={false} onClick={() => { /* inventory toggle not implemented */ }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function VillagerButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `1px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(135deg, rgba(245,165,36,0.12), rgba(245,165,36,0.06))";
    const activeShadow = "0 6px 18px rgba(245,165,36,0.12)";
    return (
        <button
            onClick={() => onClick?.()}
            aria-label="Bewohner"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                border: active ? activeBorder : `1px solid ${THEME.chipBorder}`,
                background: active ? activeBg : GLASS_STRONG,
                cursor: "pointer",
                boxShadow: active ? activeShadow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hover ? "translateY(-4px) scale(1.03)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
            </svg>
        </button>
    );
}

function InventoryButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `1px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(135deg, rgba(245,165,36,0.12), rgba(245,165,36,0.06))";
    const activeShadow = "0 6px 18px rgba(245,165,36,0.18)";
    return (
        <button
            onClick={onClick}
            aria-label="Inventar"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                border: active ? activeBorder : `1px solid ${THEME.chipBorder}`,
                background: active ? activeBg : GLASS_STRONG,
                cursor: "pointer",
                boxShadow: active ? activeShadow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hover ? "translateY(-4px) scale(1.03)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                <path d="M16 3v4" />
            </svg>
        </button>
    );
}

function LargeBuildButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `1px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(135deg, rgba(245,165,36,0.12), rgba(245,165,36,0.06))";
    const activeShadow = "0 10px 30px rgba(245,165,36,0.18)";
    return (
        <button
            onClick={onClick}
            aria-label="Build menu"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 104,
                height: 104,
                borderRadius: 20,
                border: active ? activeBorder : `1px solid ${THEME.chipBorder}`,
                background: active ? activeBg : GLASS_STRONG,
                cursor: "pointer",
                boxShadow: active ? activeShadow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hover ? "translateY(-6px) scale(1.04)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20 14 10" />
                <path d="M13 6 17 2l3 3-4 4" />
                <path d="m3 21 3-1 1-3-3 1-1 3Z" />
            </svg>
        </button>
    );
}
