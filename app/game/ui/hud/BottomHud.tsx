"use client";

import { useState } from "react";
import type { BuildingTypeId } from "../../../../src/game/types/GameState";
import { GLASS_STRONG, THEME, HUD_BAR_BG, EDGE_SHADOW } from "../theme/themeTokens";

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
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                gap: 12,
                background: "transparent",
                zIndex: 80
            }}
        >
            <div style={{ width: "100%", maxWidth: 1040, height: 150, display: "flex", justifyContent: "center", pointerEvents: "auto", marginBottom: 4 }}>
                <div style={{ width: "min(1040px, 96%)", display: "flex", justifyContent: "center", alignItems: "center", pointerEvents: "auto", marginBottom: 8, padding: "14px 22px" }}>
                    <div style={{ display: "flex", gap: 22, pointerEvents: "auto", alignItems: "flex-end", justifyContent: "center" }}>
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
    const activeBorder = `2px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(180deg, #fff0c8 0%, #ffd37f 55%, #eea55b 100%)";
    const baseBg = "linear-gradient(180deg, #ffe2b0 0%, #f3c27d 60%, #db8f42 100%)";
    const activeShadow = `${EDGE_SHADOW}, 0 0 0 2px rgba(255,207,132,0.55)`;
    return (
        <button
            onClick={() => onClick?.()}
            aria-label="Bewohner"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 92,
                height: 88,
                borderRadius: 18,
                border: active ? activeBorder : `2px solid ${THEME.chipBorder}`,
                background: active ? activeBg : baseBg,
                cursor: "pointer",
                boxShadow: active ? activeShadow : EDGE_SHADOW,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 6,
                transform: hover ? "translateY(-4px) scale(1.02)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <span style={{ width: 44, height: 44, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3d2410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
                </svg>
            </span>
            <span style={{ fontWeight: 900, fontSize: 12, color: "#3d2410", textShadow: "0 1px 0 rgba(255,255,255,0.65)" }}>Villager</span>
        </button>
    );
}

function InventoryButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `2px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(180deg, #fff0c8 0%, #ffd37f 55%, #eea55b 100%)";
    const baseBg = "linear-gradient(150deg, #e7be82 0%, #d89a58 52%, #ce8e59ff 100%)";
    const activeShadow = `${EDGE_SHADOW}, 0 0 0 2px rgba(255,207,132,0.55)`;
    return (
        <button
            onClick={onClick}
            aria-label="Inventar"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 92,
                height: 88,
                borderRadius: 18,
                border: active ? activeBorder : `2px solid ${THEME.chipBorder}`,
                background: active ? activeBg : baseBg,
                cursor: "pointer",
                boxShadow: active ? activeShadow : EDGE_SHADOW,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 6,
                transform: hover ? "translateY(-4px) scale(1.02)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <span style={{ width: 44, height: 44, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3d2410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7H4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                    <path d="M16 3v4" />
                </svg>
            </span>
            <span style={{ fontWeight: 900, fontSize: 12, color: "#3d2410", textShadow: "0 1px 0 rgba(255,255,255,0.65)" }}>Inventar</span>
        </button>
    );
}

function LargeBuildButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `3px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(180deg, #fff4d1 0%, #ffd678 55%, #f2ab5d 100%)";
    const baseBg = "linear-gradient(180deg, #ffe3b4 0%, #f1be7c 55%, #e1964c 100%)";
    const activeShadow = `${EDGE_SHADOW}, 0 0 0 2px rgba(255,207,132,0.7)`;
    return (
        <button
            onClick={onClick}
            aria-label="Build menu"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 120,
                height: 110,
                borderRadius: 22,
                border: active ? activeBorder : `2px solid ${THEME.chipBorder}`,
                background: active ? activeBg : baseBg,
                cursor: "pointer",
                boxShadow: active ? activeShadow : EDGE_SHADOW,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                transform: hover ? "translateY(-6px) scale(1.04)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <span style={{ width: 54, height: 54, borderRadius: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3d2410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20 14 10" />
                    <path d="M13 6 17 2l3 3-4 4" />
                    <path d="m3 21 3-1 1-3-3 1-1 3Z" />
                </svg>
            </span>
            <span style={{ fontWeight: 900, fontSize: 13, color: "#3d2410", textShadow: "0 1px 0 rgba(255,255,255,0.65)" }}>Bauen</span>
        </button>
    );
}
