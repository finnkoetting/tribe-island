"use client";

import type { GameState } from "../../../src/game/types/GameState";
import { GLASS_BG, PANEL_BORDER, THEME } from "./themeTokens";
import { RES_ORDER } from "./icons";

export function TopRightResources({ st }: { st: GameState }) {
    const ids = ["gold", "emerald"];
    const items = ids.map(id => RES_ORDER.find(r => r.id === id)).filter(Boolean) as typeof RES_ORDER;
    if (!items.length) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                right: 16,
                pointerEvents: "auto",
                padding: "6px 8px",
                background: GLASS_BG,
                borderRadius: 14,
                border: PANEL_BORDER,
                boxShadow: THEME.panelShadow,
                backdropFilter: "blur(12px)"
            }}
        >
            <div style={{ display: "flex", gap: 8 }}>
                {items.map(item => (
                    <div
                        key={item.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 110,
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: PANEL_BORDER,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px rgba(0,0,0,0.28)",
                            backdropFilter: "blur(6px)",
                            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.04) 0%, ${item.color}22 70%, transparent 100%)`
                        }}
                    >
                        <span
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06) 0%, ${item.color}33 70%, transparent 100%)`,
                                border: PANEL_BORDER,
                                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.16)",
                                fontSize: 15
                            }}
                        >
                            <item.Icon />
                        </span>
                        <span style={{ flex: 1, opacity: 0.85 }}>{item.label}</span>
                        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: THEME.text }}>{st.inventory[item.id as keyof GameState["inventory"]] ?? 0}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
