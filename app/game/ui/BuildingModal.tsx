"use client";

import { useMemo, useState, type ReactNode } from "react";
import { getLevelSpec } from "../../../src/game/domains/buildings/model/buildingLevels";
import { canAffordCost, formatCost } from "../../../src/game/domains/buildings/model/buildingCosts";
import type { GameState, ResourceId, BuildingTypeId } from "../../../src/game/types/GameState";
import { MODAL_STYLE } from "../../../src/ui/theme/modalStyleGuide";
import { BUILD_META } from "../buildConfig";
import { GLASS_BG, GLASS_STRONG, CARD_BG, PANEL_BORDER, THEME } from "./themeTokens";

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
        if (safeBuilding.type === "townhall") return [{ id: "research", label: "Dorfauftrag: Grund-Jobzuweisung", desc: "Jobs & Aufträge freischalten", duration: 120 }];
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
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "6px 8px"
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
            <div style={{ display: "grid", gap: 12, margin: "0 0 15px 0", flexDirection: "row", justifyContent: "center", gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gridAutoRows: "min-content" }}>
                {tasks.map(task => (
                    <button
                        key={task.id}
                        onClick={() => setSelectedTask(task.id)}
                        disabled={!!activeTask}
                        style={{
                            ...MODAL_STYLE.button,
                            background: selectedTask === task.id ? MODAL_STYLE.button.background : "#fffbe6",
                            color: selectedTask === task.id ? MODAL_STYLE.button.color : "#7a6a3a",
                            border: selectedTask === task.id ? MODAL_STYLE.button.border : "2px solid #e2c17c55",
                            fontSize: 15,
                            minWidth: 120,
                            boxShadow: selectedTask === task.id ? MODAL_STYLE.button.boxShadow : "none",
                            opacity: activeTask ? 0.5 : 1,
                            cursor: activeTask ? "not-allowed" : "pointer"
                        }}
                    >
                        <div style={{ fontWeight: 900 }}>{task.label}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{task.desc}</div>
                    </button>
                ))}
            </div>

            {!activeTask && selectedTask && (
                <div style={{ margin: "0 0 18px 0", textAlign: "center" }}>
                    <button
                        style={{ ...MODAL_STYLE.button, fontSize: 15, minWidth: 160 }}
                        onClick={handleStartTask}
                    >
                        Auftrag starten
                    </button>
                </div>
            )}

            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Bewohner</div>
                <div style={{ display: "grid", gap: 6 }}>
                    {assigned.map(v => (
                        <VillagerBadge key={v.id} label={`${v.name} (${v.job})`} tone="ok" />
                    ))}
                    {available.length === 0 && assigned.length === 0 && (
                        <span style={{ fontSize: 13, opacity: 0.7 }}>Noch keine Bewohner zugewiesen.</span>
                    )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={onOpenAssignVillager}
                        style={{ ...MODAL_STYLE.button, padding: "10px 14px", fontWeight: 800 }}
                    >
                        Bewohner zuweisen
                    </button>
                </div>
            </div>

            {canUpgrade && (
                <div style={{ marginTop: 18, textAlign: "center" }}>
                    <button
                        style={{ ...MODAL_STYLE.button, fontSize: 16, minWidth: 180, opacity: canPay ? 1 : 0.9, cursor: "pointer" }}
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
                        Gebäude upgraden ({upgradeCost})
                    </button>
                </div>
            )}
        </ModalContainer>
    );
}

function VillagerBadge({ label, tone }: { label: string; tone: "ok" | "warn" }) {
    const palette = tone === "ok"
        ? { bg: GLASS_BG, border: THEME.panelBorder, color: THEME.text }
        : { bg: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.45)", color: THEME.text };

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 8,
                border: `2px solid ${palette.border}`,
                background: palette.bg,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 0.2,
                color: palette.color,
                boxShadow: "0 2px 0 rgba(0,0,0,0.1)"
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
                    minWidth: "min(540px, 92vw)",
                    background: CARD_BG,
                    borderRadius: 16,
                    padding: 18,
                    border: PANEL_BORDER,
                    boxShadow: THEME.panelShadow,
                    backdropFilter: "blur(10px)",
                    maxHeight: "92vh",
                    overflow: "auto"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 5, background: THEME.accent, boxShadow: THEME.accentGlow }} />
                        <div style={{ fontWeight: 800 }}>{title}</div>
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
                                boxShadow: THEME.panelShadow
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
