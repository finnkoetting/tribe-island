"use client";

import { useEffect, useRef, useState } from "react";
import * as engine from "../../src/game/engine";
import { clearSavedGame, loadGameState, saveGameState } from "../../src/game/persistence/storage/local";
import { loadSeed, saveSeed } from "../../src/game/persistence/storage/seed";
import { loadCamera, saveCamera } from "../../src/game/persistence/storage/camera";
import { getBuildingSize } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, ResourceId, Vec2 } from "../../src/game/types/GameState";
import WorldCanvas from "./WorldCanvas";
import { AssignVillagerModal } from "../../src/ui/components/AssignVillagerModal";
import BuildBar from "../../src/ui/game/hud/BuildBar";
import { UI_THEME as THEME } from "../../src/ui/theme";
import { ModalContainer } from "../../src/ui/components/ModalContainer";
import { BottomHud, BuildingModal, TopRightResources, TutorialPanel, RES_ORDER } from "./ui/Overlays";
import { MODAL_STYLE } from "../../src/ui/theme/modalStyleGuide";
import {
    BUILDABLE_TYPE_SET,
    BUILD_SECTIONS,
    isTutorialBuildLocked,
    prettifyResource,
    producerTitle,
    resourceProducers
} from "./buildConfig";

const MIN_SAVE_INTERVAL_MS = 5000;

export default function GameClient() {
    const [initialLoad] = useState(() => (typeof window === "undefined" ? null : loadGameState()));

    const [seed, setSeed] = useState<number>(() => {
        if (initialLoad?.state.seed) return initialLoad.state.seed;
        if (typeof window === "undefined") return Date.now();
        const storedSeed = loadSeed();
        return storedSeed ?? Date.now();
    });
    const [st, setSt] = useState<GameState>(() => {
        if (initialLoad?.state) return initialLoad.state;
        if (typeof window === "undefined") return engine.create.createGame(Date.now());
        const seedFromStorage = loadSeed() ?? Date.now();
        return engine.create.createGame(seedFromStorage);
    });
    const [initialCamera] = useState(() => (typeof window === "undefined" ? null : loadCamera()));

    const cameraSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastSavedRef = useRef<number>(initialLoad?.savedAt ?? 0);

    const [buildMode, setBuildMode] = useState<BuildingTypeId | null>(null);
    const [buildMenuOpen, setBuildMenuOpen] = useState(false);
    const [assignVillagerOpen, setAssignVillagerOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [buildingModalOpen, setBuildingModalOpen] = useState(false);
    const [missingModalOpen, setMissingModalOpen] = useState(false);
    const [missingResources, setMissingResources] = useState<Record<string, { need: number; have: number }>>({});
    const [showProducers, setShowProducers] = useState<Record<string, boolean>>({});

    function resetWithSeed(nextSeed: number) {
        saveSeed(nextSeed);
        const fresh = engine.create.createGame(nextSeed);
        clearSavedGame();
        lastSavedRef.current = 0;
        lastRef.current = null;
        setBuildMode(null);
        setBuildingModalOpen(false);
        setSeed(nextSeed);
        setSt(fresh);
    }

    useEffect(() => {
        if (typeof window === "undefined") return;
        saveSeed(seed);
    }, [seed]);

    useEffect(() => {
        const loop = (t: number) => {
            if (lastRef.current === null) lastRef.current = t;
            const dt = Math.min(250, Math.max(0, t - lastRef.current));
            lastRef.current = t;
            setSt(prev => engine.tick.tick(prev, dt));
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    useEffect(() => () => {
        if (cameraSaveTimeout.current) clearTimeout(cameraSaveTimeout.current);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "Escape") {
                setBuildMenuOpen(false);
                setBuildMode(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "KeyR") {
                e.preventDefault();
                resetWithSeed(seed);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [seed]);

    const findBuildingAt = (state: GameState, pos: Vec2) => {
        return Object.values(state.buildings).find(b => {
            const size = getBuildingSize(b.type);
            return pos.x >= b.pos.x && pos.x < b.pos.x + size.w && pos.y >= b.pos.y && pos.y < b.pos.y + size.h;
        }) || null;
    };

    const handleSelectBuild = (type: BuildingTypeId) => {
        if (!BUILDABLE_TYPE_SET.has(type)) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(type);
        setBuildMenuOpen(false);
    };

    const handleTileClick = (pos: Vec2) => {
        setSt(prev => {
            const building = findBuildingAt(prev, pos);
            let next: GameState = { ...prev, selection: { kind: "tile", pos } };
            setBuildingModalOpen(false);

            if (building) {
                next = { ...next, selection: { kind: "building", id: building.id } };
                const nonModalTypes: BuildingTypeId[] = ["rock", "tree", "berry_bush", "mushroom", "road"];
                if (!nonModalTypes.includes(building.type)) setBuildingModalOpen(true);
            }

            if (buildMode && BUILDABLE_TYPE_SET.has(buildMode)) {
                if (!isTutorialBuildLocked(buildMode, next.quests)) {
                    next = engine.commands.placeBuilding(next, buildMode, pos);
                }
            }

            queueSave(next);
            return next;
        });
    };

    const handleCollect = (buildingId: string) => {
        setSt(prev => {
            const next = engine.commands.collectFromBuilding(prev, buildingId);
            queueSave(next);
            return next;
        });
    };

    const handleUpgrade = (buildingId: string) => {
        setSt(prev => {
            const next = engine.commands.upgradeBuilding(prev, buildingId);
            queueSave(next);
            return next;
        });
    };

    const queueSave = (state: GameState) => {
        const now = Date.now();
        if (now - lastSavedRef.current < MIN_SAVE_INTERVAL_MS) return;
        const savedAt = saveGameState(state);
        if (savedAt) lastSavedRef.current = savedAt;
    };

    const handlePlanTutorialBuild = (type: BuildingTypeId) => {
        if (!BUILDABLE_TYPE_SET.has(type)) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(type);
    };

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                overflow: "hidden",
                background: THEME.background,
                color: THEME.text,
                fontFamily: "Space Grotesk, 'Segoe UI', sans-serif"
            }}
        >
            <div style={{ position: "absolute", inset: 0 }}>
                <WorldCanvas
                    st={st}
                    buildMode={buildMode}
                    onTileClick={handleTileClick}
                    onCancelBuild={() => setBuildMode(null)}
                    onCollectBuilding={handleCollect}
                    initialCamera={initialCamera ?? undefined}
                    onCameraChange={cam => {
                        if (cameraSaveTimeout.current) clearTimeout(cameraSaveTimeout.current);
                        cameraSaveTimeout.current = setTimeout(() => saveCamera(cam), 400);
                    }}
                    onDragActive={setIsDragging}
                />
            </div>

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <TutorialPanel quests={st.quests} onSelectBuild={handlePlanTutorialBuild} />
                <TopRightResources st={st} />

                <BuildingModal
                    open={buildingModalOpen && st.selection.kind === "building" && Boolean(st.buildings[st.selection.id])}
                    building={st.selection.kind === "building" ? st.buildings[st.selection.id] : null}
                    st={st}
                    onClose={() => setBuildingModalOpen(false)}
                    onOpenAssignVillager={() => setAssignVillagerOpen(true)}
                    onUpgrade={handleUpgrade}
                    onStartTask={(buildingId, taskId) => {
                        setSt(prev => {
                            const next = engine.commands.startBuildingTask(prev, buildingId, taskId);
                            queueSave(next);
                            return next;
                        });
                    }}
                    onShowMissing={missing => {
                        setMissingResources(missing);
                        setMissingModalOpen(true);
                    }}
                />

                {missingModalOpen && (
                    <ModalContainer onClose={() => setMissingModalOpen(false)} title={<span>Fehlende Ressourcen</span>}>
                        <div style={{ display: "grid", gap: 10 }}>
                            <div>Dir fehlen die folgenden Ressourcen für dieses Upgrade/Auftrag:</div>
                            <div style={{ display: "grid", gap: 6 }}>
                                {Object.entries(missingResources).map(([res, v]) => {
                                    const label = RES_ORDER.find(r => r.id === res)?.label ?? prettifyResource(res);
                                    const producers = resourceProducers[res as ResourceId] ?? [];
                                    const visible = !!showProducers[res];
                                    return (
                                        <div key={res} style={{ padding: 8, background: MODAL_STYLE.card.background, borderRadius: 8, border: MODAL_STYLE.card.border }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div style={{ fontWeight: 800 }}>{label}</div>
                                                <div style={{ opacity: 0.9 }}>{v.need} benötigt  vorhanden {v.have}</div>
                                            </div>
                                            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                                                <button
                                                    onClick={() => setShowProducers(s => ({ ...s, [res]: !s[res] }))}
                                                    style={{ ...MODAL_STYLE.button, fontSize: 13, padding: "8px 12px" }}
                                                >
                                                    Ressourcen beschaffen
                                                </button>
                                            </div>
                                            {visible && (
                                                <div style={{ marginTop: 8, padding: 8, background: "rgba(0,0,0,0.12)", borderRadius: 8 }}>
                                                    <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 700 }}>Geeignete Orte / Gebäude:</div>
                                                    {producers.length ? (
                                                        <div style={{ display: "grid", gap: 6 }}>
                                                            {producers.map(p => (
                                                                <div key={p} style={{ fontSize: 13 }}>
                                                                    {producerTitle(p)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: 13, opacity: 0.85 }}>Keine bekannten Gebäude; suche in der Welt nach Rohvorkommen.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                                <button style={{ ...MODAL_STYLE.button }} onClick={() => setMissingModalOpen(false)}>Schließen</button>
                            </div>
                        </div>
                    </ModalContainer>
                )}

                <AssignVillagerModal
                    open={assignVillagerOpen}
                    onClose={() => setAssignVillagerOpen(false)}
                    villagers={Object.values(st.villagers).filter(v => v.state === "alive" && !(st.selection.kind === "building" && st.buildings[st.selection.id].assignedVillagerIds.includes(v.id)))}
                    assigned={(st.selection.kind === "building" && st.buildings[st.selection.id]) ? st.buildings[st.selection.id].assignedVillagerIds.map(id => st.villagers[id]).filter(Boolean).filter(v => v.state === "alive") : []}
                    onAssign={(vid: string) => setSt(prev => {
                        const next = engine.commands.assignVillagerToBuilding(prev, vid, st.selection.kind === "building" ? st.selection.id : null);
                        queueSave(next);
                        return next;
                    })}
                    onRemove={(vid: string) => setSt(prev => {
                        const next = engine.commands.assignVillagerToBuilding(prev, vid, null);
                        queueSave(next);
                        return next;
                    })}
                />

                <div style={{ position: "fixed", left: "50%", bottom: "8%", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 40, width: "80vw" }}>
                    <div
                        aria-hidden={!buildMenuOpen || !!buildMode || isDragging}
                        style={{
                            pointerEvents: buildMenuOpen && !isDragging && !buildMode ? "auto" : "none",
                            display: "flex",
                            justifyContent: "center",
                            transition: "opacity .18s ease",
                            opacity: buildMenuOpen ? 1 : 0
                        }}
                    >
                        <BuildBar
                            sections={BUILD_SECTIONS}
                            onSelect={(t?: string) => t && handleSelectBuild(t as BuildingTypeId)}
                            isSelectable={(t) => Boolean(t) && BUILDABLE_TYPE_SET.has(t as BuildingTypeId) && !isTutorialBuildLocked(t as BuildingTypeId, st.quests)}
                            open={buildMenuOpen}
                        />
                    </div>
                </div>

                <BottomHud
                    buildMode={buildMode}
                    onToggleBuildMenu={() => setBuildMenuOpen(prev => {
                        const next = !prev;
                        if (!next) setBuildMode(null);
                        return next;
                    })}
                    villagerMenuOpen={false}
                    onToggleVillagerMenu={() => { /* not implemented */ }}
                    onCloseBuildingModal={() => setBuildingModalOpen(false)}
                />
            </div>
        </div>
    );
}
