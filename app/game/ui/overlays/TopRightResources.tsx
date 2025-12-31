"use client";

import type { GameState } from "../../../../src/game/types/GameState";
import { GLASS_BG, PANEL_BORDER, THEME, WOOD_TEXTURE, EDGE_SHADOW } from "../theme/themeTokens";
import { RES_ORDER } from "../icons";

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
                minWidth: 260,
                background: "transparent",
                display: "grid",
                gap: 10
            }}
        >
            <div style={{ display: "flex", gap: 10 }}>
                {items.map(item => (
                    <div
                        key={item.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            minWidth: 120,
                            padding: "9px 12px",
                            borderRadius: 13,
                            boxShadow: `${EDGE_SHADOW}, inset 0 1px 0 rgba(255,255,255,0.22)`,
                            backdropFilter: "blur(8px)",
                            background: "linear-gradient(180deg, #f7d7a0 0%, #e7b46e 58%, #c98544 100%)"
                        }}
                    >
                        <span
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.32)",
                                fontSize: 15
                            }}
                        >
                            <item.Icon />
                        </span>
                        <span style={{ flex: 1, opacity: 0.96, fontWeight: 900, color: "#3d2410", textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}>{item.label}</span>
                        <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "#3d2410", background: "rgba(239, 211, 149, 0.82)", padding: "6px 14px", borderRadius: 11, border: "1px solid rgba(239, 211, 149, 0.9)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
                            {st.inventory[item.id as keyof GameState["inventory"]] ?? 0}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
