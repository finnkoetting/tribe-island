"use client";

import { useEffect, useMemo, useState } from "react";
import type { BuildingTypeId, GameState, QuestId, Villager } from "../../../../src/game/types/GameState";
import { BUILD_META, TUTORIAL_STEPS } from "../../../../src/game/content/buildConfig";
import { ACCENT_BUTTON, EDGE_SHADOW, PANEL_BORDER, THEME } from "../theme/themeTokens";

const QUEST_ORDER: QuestId[] = ["tutorial_home", "tutorial_food", "tutorial_research", "survive_first_crisis"];

const JOB_LABELS: Record<string, string> = {
    idle: "Arbeitslos",
    gatherer: "Sammler",
    woodcutter: "Holzfaeller",
    builder: "Baumeister",
    researcher: "Forscher",
    fisher: "Fischer",
    guard: "Wache"
};

function questTarget(questId: QuestId): BuildingTypeId | undefined {
    return TUTORIAL_STEPS.find(step => step.id === questId)?.target;
}

function questDescription(questId: QuestId, quests: GameState["quests"]): string {
    const custom = quests?.[questId]?.description;
    if (custom) return custom;
    const fallback = TUTORIAL_STEPS.find(step => step.id === questId)?.description;
    return fallback ?? "";
}

function questHint(questId: QuestId, quests: GameState["quests"]): string | undefined {
    const custom = quests?.[questId]?.hint;
    if (custom) return custom;
    return TUTORIAL_STEPS.find(step => step.id === questId)?.hint;
}

function pickVillagers(villagers?: GameState["villagers"]): Villager[] {
    const all = Object.values(villagers ?? {}).filter(v => v.state === "alive");
    return all.sort((a, b) => b.stats.work + b.stats.int - (a.stats.work + a.stats.int)).slice(0, 6);
}

export function QuestPanel({ quests, villagers, onSelectBuild }: { quests: GameState["quests"]; villagers: GameState["villagers"]; onSelectBuild: (type: BuildingTypeId) => void }) {
    const questList = useMemo(() => {
        if (!quests) return [];
        const orderIndex = new Map<QuestId, number>(QUEST_ORDER.map((id, idx) => [id, idx]));
        return Object.values(quests).filter(q => !q.done && !q.locked).sort((a, b) => {
            const lockedDelta = Number(a.locked) - Number(b.locked);
            if (lockedDelta !== 0) return lockedDelta;
            const doneDelta = Number(a.done) - Number(b.done);
            if (doneDelta !== 0) return doneDelta;
            const idxA = orderIndex.get(a.id as QuestId) ?? 99;
            const idxB = orderIndex.get(b.id as QuestId) ?? 99;
            if (idxA !== idxB) return idxA - idxB;
            return a.title.localeCompare(b.title);
        });
    }, [quests]);

    const [selectedId, setSelectedId] = useState<QuestId | null>(null);
    const [showDetail, setShowDetail] = useState<boolean>(false);

    useEffect(() => {
        if (!questList.length) {
            setSelectedId(null);
            return;
        }
        if (!selectedId) return; // don't auto-select when none chosen
        const stillExists = questList.some(q => q.id === selectedId);
        if (!stillExists) setSelectedId(questList[0].id as QuestId);
    }, [questList, selectedId]);

    if (!quests || !questList.length) return null;

    const selectedQuest = selectedId ? (questList.find(q => q.id === selectedId) ?? null) : null;
    const target = selectedQuest ? questTarget(selectedQuest.id as QuestId) : undefined;
    const meta = target ? BUILD_META[target] : undefined;
    const progressPercent = selectedQuest ? Math.min(100, Math.round((selectedQuest.progress / Math.max(1, selectedQuest.goal)) * 100)) : 0;
    const villagerList = pickVillagers(villagers);
    const hint = selectedQuest ? questHint(selectedQuest.id as QuestId, quests) : undefined;

    return (
        <div
            style={{
                position: "absolute",
                top: "16px",
                left: 18,
                padding: "12px 14px",
                width: "min(360px, 80vw)",
                borderRadius: 13,
                boxShadow: `${EDGE_SHADOW}, inset 0 1px 0 rgba(255,255,255,0.22)`,
                backdropFilter: "blur(8px)",
                background: "linear-gradient(180deg, #f7d7a0 0%, #e7b46e 58%, #c98544 100%)",
                pointerEvents: "auto",
                color: "#3d2410",
                display: "grid",
                gap: 12
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 17, color: "#2a1608", textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}>Quest-Tafel</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "#3d2410", background: "rgba(239, 211, 149, 0.82)", padding: "6px 14px", borderRadius: 11, border: "1px solid rgba(239, 211, 149, 0.9)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
                        {questList.filter(q => !q.done && !q.locked).length}
                    </span>
                </div>
            </div>

            <div style={{ display: "grid", gap: 10, position: "relative" }}>
                <div
                    style={{
                        display: "grid",
                        gap: 10,
                    }}
                >
                    {questList.map(q => {
                        const isSelected = q.id === selectedId;
                        const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.goal)) * 100));
                        return (
                            <button
                                key={q.id}
                                onClick={() => {
                                    setSelectedId(q.id as QuestId);
                                    setShowDetail(true);
                                }}
                                style={{
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    borderRadius: 13,
                                    border: isSelected ? `2px solid ${THEME.accent}` : "1px solid rgba(255,255,255,0.28)",
                                    boxShadow: isSelected
                                        ? `${THEME.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`
                                        : "inset 0 1px 0 rgba(255,255,255,0.22)",
                                    transition: "box-shadow .18s ease, border .12s ease, transform .12s ease",
                                    transform: isSelected ? "translateY(-2px)" : "none",
                                    height: "fit-content",
                                    backdropFilter: "blur(8px)",
                                    background: "rgba(255,255,255,0.16)",
                                    cursor: "pointer",
                                    color: "#2f1b0c",
                                    display: "grid",
                                    gap: 6
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                    <div style={{ display: "grid", gap: 2 }}>
                                        <div style={{ fontWeight: 800, fontSize: 13 }}>{q.title}</div>
                                    </div>
                                </div>
                                <div style={{ height: 22, borderRadius: 6, background: "rgba(255,255,255,0.12)", overflow: "hidden", position: "relative", marginTop: 4 }}>
                                    <div style={{ width: `${pct}%`, height: "100%", background: THEME.accent, boxShadow: THEME.accentGlow, transition: "width .2s ease" }} />
                                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#2f1b0c", textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}>
                                        {q.progress}/{q.goal}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div
                    aria-hidden={!showDetail || !selectedQuest}
                    style={{
                        position: "absolute",
                        top: "calc(-62px)",
                        left: "calc(100% + (16px * 2))",
                        width: "min(360px, 88vw)",
                        background: "linear-gradient(180deg, #f7d7a0 0%, #e7b46e 58%, #c98544 100%)",
                        borderRadius: 18,
                        border: "2px solid rgba(255, 230, 190, 0.15)",
                        boxShadow: `${THEME.panelShadow}, inset 0 2px 0 rgba(255,255,255,0.16)`,
                        padding: 14,
                        display: "grid",
                        gap: 12,
                        alignContent: "start",
                        opacity: showDetail && selectedQuest ? 1 : 0,
                        transform: showDetail && selectedQuest ? "translateX(0) translateY(0)" : "translateX(8px) translateY(-6px)",
                        transition: "opacity .18s ease, transform .18s ease",
                        pointerEvents: showDetail && selectedQuest ? "auto" : "none"
                    }}
                >
                    {selectedQuest && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                                <div style={{ display: "grid", gap: 4 }}>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>Details</div>
                                    <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>{selectedQuest.title}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDetail(false);
                                        setSelectedId(null);
                                    }}
                                    aria-label="Quest-Details schließen"
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(255,255,255,0.35)",
                                        background: "rgba(255,255,255,0.28)",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        color: "#2f1b0c",
                                        cursor: "pointer",
                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)"
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}>
                                <div style={{ fontSize: 12, lineHeight: 1.4, color: "#2f1b0c" }}>{questDescription(selectedQuest.id as QuestId, quests)}</div>
                                {hint && <div style={{ fontSize: 11, opacity: 0.85, color: "#2f1b0c" }}>Hinweis: {hint}</div>}
                            </div>

                            <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}>
                                <div style={{ fontSize: 11, opacity: 0.8, color: "#3d2410" }}>Fortschritt</div>
                                <div style={{ height: 10, borderRadius: 10, background: "rgba(255,255,255,0.18)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.32)" }}>
                                    <div style={{ width: `${progressPercent}%`, height: "100%", background: THEME.accent, boxShadow: `${THEME.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.35)`, transition: "width .2s ease" }} />
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.9, color: "#3d2410" }}>{selectedQuest.progress}/{selectedQuest.goal} erledigt</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export { QuestPanel as TutorialPanel };
