"use client";

import { useMemo, useState, type ReactNode } from "react";
import { getLevelSpec } from "../../../../src/game/domains/buildings/model/buildingLevels";
import { canAffordCost, formatCost } from "../../../../src/game/domains/buildings/model/buildingCosts";
import type { GameState, ResourceId, BuildingTypeId } from "../../../../src/game/types/GameState";
import { MODAL_STYLE } from "../../../../src/ui/theme/modalStyleGuide";
import { BUILD_META } from "../../../../src/game/content/buildConfig";
import { GLASS_STRONG, PANEL_BORDER, THEME, WOOD_TEXTURE, EDGE_SHADOW } from "../theme/themeTokens";

const TASK_BUTTON_BASE = {
    ...MODAL_STYLE.button,
    background: "linear-gradient(180deg, #ffe6b0 0%, #ffc45c 55%, #ef9a3d 100%)",
    color: "#4a2c11",
    border: "2px solid rgba(255, 207, 132, 0.9)",
    boxShadow: `${EDGE_SHADOW}, inset 0 2px 0 rgba(255,255,255,0.45)`,
    padding: "14px 16px",
    fontSize: 15,
    minWidth: 120,
    textAlign: "left" as const,
    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 160ms ease"
};

const TASK_BUTTON_SELECTED = {
    background: "linear-gradient(180deg, #fff2c7 0%, #ffd97a 50%, #f3ad4f 100%)",
    border: "2px solid rgba(255, 224, 160, 0.95)",
    boxShadow: `${EDGE_SHADOW}, 0 0 0 2px rgba(255, 207, 132, 0.65)`,
    color: "#3d2510"
};

const SECTION_PANEL = {
    background: `${THEME.panelBg}, ${WOOD_TEXTURE}`,
    border: "2px solid rgba(255, 207, 132, 0.78)",
    borderRadius: 16,
        boxShadow: `${THEME.panelShadow}, inset 0 2px 0 rgba(255,255,255,0.18)`,
    padding: 14
};

export function BuildingModal({
    open,
    building,
    st,
    onClose,
    onOpenAssignVillager,
    onUpgrade,
    onStartTask,
    onShowMissing
}: {
    open: boolean;
    building: GameState["buildings"][string] | null;
    st: GameState;
    onClose: () => void;
    onOpenAssignVillager: () => void;
    onUpgrade: (id: string) => void;
    onStartTask: (buildingId: string, taskId: string) => void;
    onShowMissing: (missing: Record<ResourceId, { need: number; have: number }>) => void;
}) {
    const safeBuilding = building ?? null;

    const tasks = useMemo(() => {
        if (!safeBuilding) return [] as Array<{ id: string; label: string; desc: string; duration: number }>;
        const level = safeBuilding.level || 1;
        if (safeBuilding.type === "gather_hut") {
            const baseTasks = [
                { id: "pick_mushrooms", label: "Pilze pflücken", desc: "+1 Pilz", duration: 60 * 5 },
                { id: "pick_berries", label: "Beeren sammeln", desc: "+2 Beeren", duration: 60 * 10 },
                { id: "fruit_salad", label: "Fruchtsalat zubereiten", desc: "+4 Nahrung; -2 Beeren; -1 Pilz", duration: 60 * 30 },
                { id: "vorratskorb", label: "Vorratskorb packen", desc: "+6 Nahrung; -3 Beeren; -2 Pilz", duration: 120 * 60 }
            ];
            const maxTasks = Math.min(baseTasks.length, level + 1);
            return baseTasks.slice(0, maxTasks);
        }
        if (safeBuilding.type === "sawmill") return [{ id: "produce", label: "Holz verarbeiten", desc: "+Bretter", duration: 90 }];
        if (safeBuilding.type === "campfire") return [{ id: "day_watch", label: "Tageswache", desc: "-2 Nahrung; +1 Moral (alle)", duration: 60 }];
        return [];
    }, [safeBuilding]);

    const [activeTask, setActiveTask] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);

    if (!open || !safeBuilding) return null;

    const meta = BUILD_META[safeBuilding.type as BuildingTypeId];

    const handleStartTask = () => {
        if (!selectedTask || !safeBuilding) return;
        onStartTask(safeBuilding.id, selectedTask);
        setActiveTask(selectedTask);
        setSelectedTask(null);
    };

    const villagers = Object.values(st.villagers).filter((v): v is NonNullable<GameState["villagers"][string]> => Boolean(v) && v.state === "alive");
    const assigned = safeBuilding.assignedVillagerIds
        .map((id: string) => st.villagers[id])
        .filter((v): v is NonNullable<GameState["villagers"][string]> => Boolean(v) && v.state === "alive");
    const available = villagers.filter(v => !safeBuilding.assignedVillagerIds.includes(v.id));

    const nextSpec = getLevelSpec(safeBuilding.type, (safeBuilding.level || 1) + 1);
    const canUpgrade = Boolean(nextSpec);
    const upgradeCost = nextSpec ? formatCost(nextSpec.cost ?? {}) : "Keine weiteren Upgrades";
    const canPay = Boolean(nextSpec) ? canAffordCost(st.inventory, nextSpec!.cost ?? {}) : false;
    const activeTaskLabel = tasks.find(t => t.id === activeTask)?.label;

    return (
        <ModalContainer
            onClose={onClose}
            title={<span>{meta?.title ?? "Gebäude"}</span>}
            headerAction={
                <button
                    type="button"
                    aria-label="Bewohner zuweisen"
                    title="Bewohner zuweisen"
                    style={{
                        fontSize: 20,
                        background: "linear-gradient(180deg, #ffeaa7 0%, #ffc857 45%, #f4a63a 100%)",
                        border: "2px solid rgba(255, 207, 132, 0.88)",
                        borderRadius: 12,
                        cursor: "pointer",
                        padding: "8px 10px",
                        boxShadow: `${EDGE_SHADOW}, inset 0 2px 0 rgba(255,255,255,0.35)`,
                        color: "#4a2c11"
                    }}
                    onClick={onOpenAssignVillager}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenAssignVillager();
                        }
                    }}
                >
                    <span role="img" aria-hidden={false} aria-label="Villager">🧑‍🌾</span>
                </button>
            }
        >
            <div style={{ ...SECTION_PANEL, margin: "0 0 12px 0", display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.2 }}>Aufträge</span>
                        {activeTask && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 10, background: GLASS_STRONG, border: PANEL_BORDER, fontWeight: 800, color: "#40240f", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)" }}>
                                ✨ Läuft: {activeTaskLabel ?? activeTask}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: 12, opacity: 0.78 }}>Glückliche Aufgaben bringen Boni</span>
                </div>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gridAutoRows: "min-content" }}>
                    {tasks.map(task => (
                        <button
                            key={task.id}
                            onClick={() => setSelectedTask(task.id)}
                            disabled={!!activeTask}
                            style={{
                                ...TASK_BUTTON_BASE,
                                ...(selectedTask === task.id ? TASK_BUTTON_SELECTED : {}),
                                opacity: activeTask ? 0.5 : 1,
                                cursor: activeTask ? "not-allowed" : "pointer",
                                transform: selectedTask === task.id ? "translateY(-3px)" : undefined
                            }}
                        >
                            <div style={{ fontWeight: 900 }}>{task.label}</div>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>{task.desc}</div>
                        </button>
                    ))}
                </div>

                {!activeTask && selectedTask && (
                    <div style={{ textAlign: "center" }}>
                        <button
                            style={{ ...MODAL_STYLE.button, fontSize: 15, minWidth: 190, boxShadow: `${THEME.shadows.button}, inset 0 2px 0 rgba(255,255,255,0.35)` }}
                            onClick={handleStartTask}
                        >
                            Auftrag starten
                        </button>
                    </div>
                )}
            </div>

            <div style={{ ...SECTION_PANEL, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 6, background: THEME.accent, boxShadow: THEME.accentGlow }} />
                        <span style={{ fontWeight: 900, fontSize: 15 }}>Bewohner</span>
                    </div>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>{assigned.length}/{villagers.length} aktiv</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                    {assigned.map(v => (
                        <VillagerBadge key={v.id} label={`${v.name} (${v.job})`} tone="ok" />
                    ))}
                    {available.length === 0 && assigned.length === 0 && (
                        <span style={{ fontSize: 13, opacity: 0.75, color: "#4a2c11" }}>Noch keine Bewohner zugewiesen.</span>
                    )}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={onOpenAssignVillager}
                        style={{ ...MODAL_STYLE.button, padding: "11px 16px", fontWeight: 900, minWidth: 170, boxShadow: `${THEME.shadows.button}, inset 0 2px 0 rgba(255,255,255,0.35)` }}
                    >
                        Bewohner zuweisen
                    </button>
                </div>
            </div>

            {canUpgrade && (
                <div style={{ ...SECTION_PANEL, marginTop: 10, display: "grid", gap: 10, textAlign: "center" }}>
                    <div style={{ fontWeight: 900 }}>Upgrade auf Level {(safeBuilding.level || 1) + 1}</div>
                    <div style={{ fontSize: 12, opacity: 0.82 }}>Kosten: {upgradeCost}</div>
                    <button
                        style={{ ...MODAL_STYLE.button, fontSize: 16, minWidth: 200, opacity: canPay ? 1 : 0.85, cursor: "pointer", boxShadow: `${THEME.shadows.button}, inset 0 2px 0 rgba(255,255,255,0.35)` }}
                        onClick={() => {
                            if (!safeBuilding) return;
                            if (canPay) return onUpgrade(safeBuilding.id);
                            const cost = nextSpec?.cost ?? {};
                            const missing: Record<string, { need: number; have: number }> = {};
                            for (const [r, amt] of Object.entries(cost)) {
                                const have = Number((st.inventory as Record<string, number>)[r] ?? 0);
                                const need = Number(amt ?? 0);
                                if (need > have) missing[r] = { need: need - have, have };
                            }
                            onShowMissing(missing as Record<ResourceId, { need: number; have: number }>);
                        }}
                    >
                        Gebäude upgraden
                    </button>
                </div>
            )}
        </ModalContainer>
    );
}

function VillagerBadge({ label, tone }: { label: string; tone: "ok" | "warn" }) {
    const palette = tone === "ok"
        ? { bg: "linear-gradient(180deg, rgba(255,223,170,0.32), rgba(255,204,138,0.24))", border: "rgba(255,207,132,0.95)", color: "#3d2410" }
        : { bg: "linear-gradient(180deg, rgba(255,188,188,0.28), rgba(230,120,90,0.26))", border: "rgba(230,120,90,0.8)", color: "#3d2410" };

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 12,
                border: `2px solid ${palette.border}`,
                background: palette.bg,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.2,
                color: palette.color,
                boxShadow: `${EDGE_SHADOW}, inset 0 1px 0 rgba(255,255,255,0.25)` ,
            }}
        >
            {label}
        </span>
    );
}

function ModalContainer({ children, onClose, title, headerAction }: { children: ReactNode; onClose: () => void; title: ReactNode; headerAction?: ReactNode }) {
    return (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "auto" }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(circle at 26% 18%, rgba(255,210,140,0.22), rgba(22,12,6,0.82))",
                    pointerEvents: "none",
                    backdropFilter: "blur(5px)"
                }}
            />
            <div
                style={{
                    position: "relative",
                    minWidth: "min(540px, 92vw)",
                    background: `${THEME.panelBg}, ${WOOD_TEXTURE}`,
                    color: THEME.text,
                    borderRadius: 20,
                    padding: 22,
                    border: "3px solid rgba(255, 207, 132, 0.88)",
                    boxShadow: `${THEME.panelShadow}, inset 0 2px 0 rgba(255,255,255,0.18)` ,
                    maxHeight: "92vh",
                    overflow: "auto"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 8, background: THEME.accent, boxShadow: THEME.accentGlow, border: "2px solid rgba(255,255,255,0.4)" }} />
                        <div style={{ fontWeight: 900, letterSpacing: 0.2, textShadow: "0 2px 0 rgba(0,0,0,0.28)" }}>{title}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {headerAction}
                        <button
                            onClick={onClose}
                            aria-label="Modal schließen"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                border: PANEL_BORDER,
                                background: GLASS_STRONG,
                                cursor: "pointer",
                                boxShadow: THEME.panelShadow,
                                color: THEME.text
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
