"use client";

import { useState, type ReactNode } from "react";
import type { BuildingTypeId } from "../../../../src/game/types/GameState";
import { THEME, EDGE_SHADOW } from "../theme/themeTokens";

type HudButtonProps = {
    label: string;
    icon: ReactNode;
    active?: boolean;
    large?: boolean;
    onClick?: () => void;
};

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
                padding: "0 18px 18px",
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                background: "transparent",
                zIndex: 80
            }}
        >
            <div
                style={{
                    width: "min(1100px, 100%)",
                    pointerEvents: "auto",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 14,
                    padding: "6px 0"
                }}
            >
                <VillagerButton active={!!villagerMenuOpen} onClick={() => onToggleVillagerMenu?.()} />
                <LargeBuildButton
                    active={!!buildMode}
                    onClick={() => {
                        onCloseBuildingModal();
                        onToggleBuildMenu();
                    }}
                />
                <InventoryButton active={false} onClick={() => { /* inventory toggle not implemented */ }} />
            </div>
        </div>
    );
}

function HudButton({ label, icon, active = false, large = false, onClick }: HudButtonProps) {
    const [hover, setHover] = useState(false);
    const width = large ? 132 : 112;
    const height = large ? 108 : 94;
    const radius = large ? 20 : 16;
    const border = active ? `2px solid ${THEME.accent}` : "1px solid rgba(255,255,255,0.28)";
    const shadow = active ? `${THEME.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.25)` : "inset 0 1px 0 rgba(255,255,255,0.22)";

    return (
        <button
            type="button"
            onClick={() => onClick?.()}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-label={label}
            style={{
                width,
                height,
                borderRadius: radius,
                border,
                background: "linear-gradient(180deg, #f7d7a0 0%, #e7b46e 58%, #c98544 100%)",
                cursor: "pointer",
                boxShadow: shadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontSize: 28,
                gap: 8,
                transform: hover ? "translateY(-4px)" : "translateY(0)",
                transition: "transform .16s ease, box-shadow .16s ease, border .16s ease, background .16s ease",
                color: "#2f1b0c",
                fontWeight: 900,
                pointerEvents: "auto",
                outline: "none"
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: large ? 60 : 52,
                    height: large ? 60 : 52,
                    borderRadius: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                    color: "#2f1b0c"
                }}
            >
                {icon}
            </span>
            <span style={{ fontSize: 12, letterSpacing: 0.2, textShadow: "0 1px 0 rgba(255,255,255,0.55)" }}>{label}</span>
        </button>
    );
}

function VillagerButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
    return (
        <HudButton
            label="Bewohner"
            active={active}
            onClick={onClick}
            icon={
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2f1b0c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
                </svg>
            }
        />
    );
}

function InventoryButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <HudButton
            label="Inventar"
            active={active}
            onClick={onClick}
            icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2f1b0c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7H4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                    <path d="M16 3v4" />
                </svg>
            }
        />
    );
}

function LargeBuildButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <HudButton
            label="Bauen"
            large
            active={active}
            onClick={onClick}
            icon={
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#2f1b0c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20 14 10" />
                    <path d="M13 6 17 2l3 3-4 4" />
                    <path d="m3 21 3-1 1-3-3 1-1 3Z" />
                </svg>
            }
        />
    );
}
