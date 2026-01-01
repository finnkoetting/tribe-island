"use client";

import { useState, type ReactNode } from "react";
import type { BuildingTypeId } from "../../../../src/game/types/GameState";
import { THEME } from "../theme/themeTokens";

type HudButtonProps = {
    label: string;
    icon: ReactNode;
    active?: boolean;
    large?: boolean;
    shortcut?: string;
    onClick?: () => void;
};

export function BottomHud({
    buildMode,
    onToggleBuildMenu,
    onToggleVillagerMenu,
    onToggleInventory,
    villagerMenuOpen,
    inventoryOpen,
}: {
    buildMode: BuildingTypeId | null;
    onToggleBuildMenu: () => void;
    onToggleVillagerMenu?: () => void;
    onToggleInventory?: () => void;
    villagerMenuOpen?: boolean;
    inventoryOpen?: boolean;
}) {
    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "0 18px 20px",
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
                    padding: "10px 12px",
                    borderRadius: 18
                }}
            >
                <VillagerButton active={!!villagerMenuOpen} onClick={() => onToggleVillagerMenu?.()} />
                <LargeBuildButton active={!!buildMode} onClick={() => onToggleBuildMenu()} />
                <InventoryButton active={!!inventoryOpen} onClick={() => onToggleInventory?.()} />
            </div>
        </div>
    );
}

function HudButton({ label, icon, shortcut, active = false, large = false, onClick }: HudButtonProps) {
    const [hover, setHover] = useState(false);
    const height = large ? 144 : 132;
    const width = height;
    const radius = large ? 20 : 18;
    const border = active ? `2px solid ${THEME.accent}` : "1px solid rgba(255,255,255,0.26)";
    const shadowBase = "0 10px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)";
    const shadow = active ? `${THEME.accentGlow}, ${shadowBase}` : shadowBase;
    const background = hover
        ? "linear-gradient(180deg, #ffe2aa 0%, #efc174 55%, #c98544 100%)"
        : "linear-gradient(180deg, #f7d7a0 0%, #e7b46e 58%, #c98544 100%)";

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
                background,
                backdropFilter: "blur(6px)",
                cursor: "pointer",
                boxShadow: shadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontSize: 32,
                gap: 4,
                transform: hover ? "translateY(-3px)" : "translateY(0)",
                transition: "transform .16s ease, box-shadow .16s ease, border .16s ease, background .16s ease",
                color: "#2f1b0c",
                fontWeight: 900,
                pointerEvents: "auto",
                outline: "none",
                textShadow: "0 1px 0 rgba(255,255,255,0.48)"
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: large ? 76 : 68,
                    height: large ? 76 : 68,
                    borderRadius: 15,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    boxShadow: "none",
                    color: "#2f1b0c"
                }}
            >
                {icon}
            </span>
            <span
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0,
                    padding: "3px 6px 2px",
                    borderRadius: 12,
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                    color: "#2f1b0c",
                    textShadow: "0 1px 0 rgba(255,255,255,0.48)"
                }}
            >
                <span style={{ fontSize: 13, letterSpacing: 0.2, lineHeight: 1.1 }}>{label}</span>
                {shortcut && <span style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.78, color: "#4c4138" }}>{shortcut}</span>}
            </span>
        </button>
    );
}

function VillagerButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
    return (
        <HudButton
            label="Bewohner"
            shortcut="V"
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

function InventoryButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
    return (
        <HudButton
            label="Inventar"
            shortcut="Tab"
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
            shortcut="B"
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
