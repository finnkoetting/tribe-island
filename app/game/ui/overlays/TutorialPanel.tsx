"use client";

import type { BuildingTypeId, GameState } from "../../../../src/game/types/GameState";
import { BUILD_META, getActiveTutorialId, TUTORIAL_STEPS } from "../../../../src/game/content/buildConfig";
import { PANEL_BORDER, ACCENT_BUTTON, THEME, EDGE_SHADOW } from "../theme/themeTokens";

export function TutorialPanel({ quests, onSelectBuild }: { quests: GameState["quests"]; onSelectBuild: (type: BuildingTypeId) => void }) {
    if (!quests) return null;

    const activeId = getActiveTutorialId(quests);
    const activeTitle = activeId ? quests[activeId]?.title ?? "Aktueller Schritt" : "Alle Schritte geschafft";
    const activeStep = activeId ? TUTORIAL_STEPS.find(s => s.id === activeId) : null;
    const quest = activeId ? quests[activeId] : null;
    const meta = activeStep?.target ? BUILD_META[activeStep.target] : undefined;

    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                left: 18,
                padding: "12px 14px",
                width: "min(380px, 92vw)",
                background: "linear-gradient(150deg, #e7be82 0%, #d89a58 52%, #ce8e59ff 100%)",
                border: "2px solid rgba(255, 230, 190, 0.15)",
                borderRadius: 18,
                boxShadow: `${THEME.panelShadow}, inset 0 2px 0 rgba(255,255,255,0.16)`,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                display: "grid",
                gap: 10
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 12, background: "rgba(239, 211, 149, 0.82)", border: "1px solid rgba(239, 211, 149, 0.9)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 6, background: THEME.accent, boxShadow: THEME.accentGlow }} />
                    <span style={{ fontWeight: 900, color: "#3d2410" }}>Tutorial</span>
                </div>
                <div style={{ display: "grid", gap: 2, flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.1, color: "#3d2410", textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>{activeId ? activeTitle : "Fertig: Baue frei weiter"}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, color: "#3d2410" }}>{activeId ? "Aktiver Schritt" : "Alle Schritte geschafft"}</div>
                </div>
                <div style={{ padding: "7px 11px", borderRadius: 11, background: "rgba(239, 211, 149, 0.82)", border: "1px solid rgba(239, 211, 149, 0.9)", fontWeight: 900, fontSize: 11, color: "#3d2410", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
                    {activeId ? "Aktiv" : "Frei"}
                </div>
            </div>

            {activeStep && quest && (
                <div
                    style={{
                        borderRadius: 13,
                        border: "1px solid rgba(239, 211, 149, 0.9)",
                        background: "linear-gradient(180deg, #f7d7a0 0%, #e7b46e 58%, #c98544 100%)",
                        padding: 14,
                        display: "grid",
                        gap: 8,
                        boxShadow: `${EDGE_SHADOW}, inset 0 1px 0 rgba(255,255,255,0.25)`
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 900, color: "#3d2410", textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>{quest.title}</span>
                        <span style={{ fontSize: 11, opacity: 0.92, background: "rgba(239, 211, 149, 0.82)", padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(239, 211, 149, 0.9)", color: "#3d2410", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
                            {quest.progress}/{quest.goal}
                        </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.95, color: "#3d2410" }}>{activeStep.description}</div>
                    {activeStep.hint && <div style={{ fontSize: 11, opacity: 0.85, color: "#3d2410" }}>Hinweis: {activeStep.hint}</div>}
                    {meta && <div style={{ fontSize: 11, opacity: 0.9, color: "#3d2410" }}>Kosten: {meta.cost}</div>}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                            onClick={() => activeStep.target && onSelectBuild(activeStep.target)}
                            style={{
                                padding: "11px 15px",
                                borderRadius: 12,
                                border: `2px solid ${THEME.panelBorder}`,
                                background: ACCENT_BUTTON,
                                cursor: "pointer",
                                fontWeight: 900,
                                color: "#4a2c11",
                                boxShadow: `${THEME.accentGlow}, inset 0 2px 0 rgba(255,255,255,0.35)`
                            }}
                        >
                            Bauen
                        </button>
                        <span style={{ fontSize: 11, opacity: 0.85, color: "#3d2410" }}>Naechster Schritt wird automatisch frei.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
