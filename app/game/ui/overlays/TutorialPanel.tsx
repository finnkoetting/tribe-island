"use client";

import type { BuildingTypeId, GameState } from "../../../../src/game/types/GameState";
import { BUILD_META, getActiveTutorialId, TUTORIAL_STEPS } from "../../../../src/game/content/buildConfig";
import { GLASS_BG, GRADIENT_EDGE, PANEL_BORDER, CARD_BG, ACCENT_BUTTON, THEME } from "../theme/themeTokens";

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
                padding: "10px 14px",
                width: "min(360px, 92vw)",
                background: `${GLASS_BG}, ${GRADIENT_EDGE}`,
                border: PANEL_BORDER,
                borderRadius: 12,
                boxShadow: THEME.panelShadow,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                display: "grid",
                gap: 8
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        background: THEME.accent,
                        boxShadow: THEME.accentGlow
                    }}
                />
                <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Tutorial</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{activeId ? `Aktiv: ${activeTitle}` : "Fertig: Baue frei weiter"}</div>
                </div>
            </div>

            {activeStep && quest && (
                <div
                    style={{
                        borderRadius: 10,
                        border: PANEL_BORDER,
                        background: CARD_BG,
                        padding: 12,
                        display: "grid",
                        gap: 6,
                        boxShadow: THEME.panelShadow
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 800 }}>{quest.title}</span>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>
                            {quest.progress}/{quest.goal}
                        </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{activeStep.description}</div>
                    {activeStep.hint && <div style={{ fontSize: 11, opacity: 0.65 }}>Hinweis: {activeStep.hint}</div>}
                    {meta && <div style={{ fontSize: 11, opacity: 0.7 }}>Kosten: {meta.cost}</div>}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                            onClick={() => activeStep.target && onSelectBuild(activeStep.target)}
                            style={{
                                padding: "9px 14px",
                                borderRadius: 12,
                                border: PANEL_BORDER,
                                background: ACCENT_BUTTON,
                                cursor: "pointer",
                                fontWeight: 800,
                                color: THEME.text,
                                boxShadow: THEME.accentGlow
                            }}
                        >
                            Bauen
                        </button>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>Naechster Schritt wird automatisch frei.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
