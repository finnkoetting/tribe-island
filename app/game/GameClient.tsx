"use client";

import { useEffect, useRef, useState } from "react";
import * as engine from "../../src/game/engine";
import { clearSavedGame, loadGameState, saveGameState } from "../../src/game/persistence/storage/local";
import { loadSeed, saveSeed } from "../../src/game/persistence/storage/seed";
import { loadCamera, saveCamera } from "../../src/game/persistence/storage/camera";
import { getBuildingSize } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, ResourceId, Vec2 } from "../../src/game/types/GameState";
import WorldCanvas from "./WorldCanvas";
import LoadingOverlay from "./LoadingOverlay";
import { AssignVillagerModal } from "../../src/ui/components/AssignVillagerModal";
import BuildBar from "../../src/ui/game/hud/BuildBar";
import { UI_THEME as THEME } from "../../src/ui/theme";
import { BottomHud, TopRightResources, TutorialPanel } from "./ui";
import {
    BUILDABLE_TYPE_SET,
    BUILD_SECTIONS,
    isTutorialBuildLocked,
    prettifyResource,
    producerTitle,
    resourceProducers
} from "../../src/game/content/buildConfig";

const MIN_SAVE_INTERVAL_MS = 5000;
const MIN_LOADING_MS = 3500; // ensure loading overlay visible at least this long (ms)

export default function GameClient() {
    const [hydrated, setHydrated] = useState(false);
    const [initialLoad] = useState(() => (typeof window === "undefined" ? null : loadGameState()));

    const [seed, setSeed] = useState<number>(() => {
        if (initialLoad?.state?.seed) return initialLoad.state.seed;
        return 0; // will be set after hydration
    });

    const [st, setSt] = useState<GameState | null>(() => {
        if (initialLoad?.state) return initialLoad.state;
        return null; // create on client after hydration
    });
    const stRef = useRef<GameState | null>(st);
    const [initialCamera] = useState(() => (typeof window === "undefined" ? null : loadCamera()));

    // Loading / initialization state
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const initStartRef = useRef<number | null>(null);
    const initInFlightRef = useRef<boolean>(false);
    const [steps, setSteps] = useState<Array<{ id: string; label: string; status: "todo" | "wip" | "done" }>>([
        { id: "restore", label: "Dorfbewohner wecken...", status: "done" },
        { id: "map", label: "Häuser reparieren...", status: "todo" },
        { id: "textures", label: "Bäume schütteln...", status: "todo" },
        { id: "finish", label: "Lagerfeuer anzüngen...", status: "todo" }
    ]);

    const cameraSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastSavedRef = useRef<number>(initialLoad?.savedAt ?? 0);

    const [buildMode, setBuildMode] = useState<BuildingTypeId | null>(null);
    const [buildMenuOpen, setBuildMenuOpen] = useState(false);
    const [assignVillagerOpen, setAssignVillagerOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [villagerMenuOpen, setVillagerMenuOpen] = useState(false);

    function resetWithSeed(nextSeed: number) {
        saveSeed(nextSeed);
        const fresh = engine.create.createGame(nextSeed);
        clearSavedGame();
        lastSavedRef.current = 0;
        lastRef.current = null;
        setBuildMode(null);
        setSeed(nextSeed);
        setSt(fresh);
    }

    useEffect(() => {
        if (!hydrated) setHydrated(true);
    }, [hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        setSeed(prev => {
            if (prev) return prev;
            const storedSeed = loadSeed();
            return storedSeed ?? Date.now();
        });
    }, [hydrated]);

    useEffect(() => {
        stRef.current = st;
    }, [st]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        saveSeed(seed);
    }, [seed]);

    useEffect(() => {
        if (!hydrated) return;
        const loop = (t: number) => {
            if (lastRef.current === null) lastRef.current = t;
            const dt = Math.min(250, Math.max(0, t - lastRef.current));
            lastRef.current = t;
            setSt(prev => prev ? engine.tick.tick(prev, dt) : prev);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [hydrated]);

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

    // Async initialization: generate map and preload textures while showing overlay
    useEffect(() => {
        if (!isInitializing || !hydrated) return;
        if (initInFlightRef.current) return;
        initInFlightRef.current = true;
        let cancelled = false;
        if (!initStartRef.current) initStartRef.current = Date.now();
        let watchdog: ReturnType<typeof setTimeout> | null = null;

        async function init() {
            try {
                watchdog = setTimeout(() => {
                    if (cancelled) return;
                    setSteps(s => s.map(step => ({ ...step, status: "done" })));
                    setIsInitializing(false);
                }, MIN_LOADING_MS + 1500);

                // mark map generation
                setSteps(s => s.map(step => (step.id === "map" ? { ...step, status: "wip" } : step)));
                await new Promise((r) => setTimeout(r, 0)); // yield so overlay can render
                if (cancelled) return;

                // create game state if we don't already have one (e.g. restored save)
                let game = stRef.current;
                if (!game) {
                    const seedFromStorage = loadSeed() ?? Date.now();
                    game = engine.create.createGame(seedFromStorage);
                    if (cancelled) return;
                    setSt(game);
                }
                setSteps(s => s.map(step => (step.id === "map" ? { ...step, status: "done" } : step)));

                // preload textures (also on reload so the overlay stays visible consistently)
                setSteps(s => s.map(step => (step.id === "textures" ? { ...step, status: "wip" } : step)));
                const needed = [
                    "objects/tree/1",
                    "objects/tree/2",
                    "objects/stone/1",
                    "objects/stone/2",
                    "objects/stone/3",
                    "objects/villager/female/1",
                    "objects/villager/male/1",
                    "objects/cow",
                    "objects/dog",
                    "objects/sheep",
                    "buildings/campfire/lvl1",
                    "buildings/campfire/lvl2",
                    "buildings/campfire/lvl3",
                    "buildings/sleep_hut/lvl1",
                    "buildings/townhall/lvl1",
                    "buildings/watchtower/lvl1",
                    "objects/berrybush",
                    "objects/mushroom/1",
                    "objects/mushroom/2",
                    "objects/mushroom/3"
                ];
                try {
                    const preload = import("../../src/ui/game/textures/loader").then(m => m.preloadTextures(needed));
                    const guard = new Promise(resolve => setTimeout(resolve, 2200)); // prevent stuck progress
                    await Promise.race([
                        Promise.all([
                            preload,
                            // give WorldCanvas a tick to start loading its tile bitmaps
                            new Promise(r => setTimeout(r, 120))
                        ]),
                        guard
                    ]);
                } catch (err) {
                    console.warn("Texture preload failed", err);
                }
                if (cancelled) return;
                setSteps(s => s.map(step => (step.id === "textures" ? { ...step, status: "done" } : step)));

                // finalize
                setSteps(s => s.map(step => (step.id === "finish" ? { ...step, status: "wip" } : step)));
                await new Promise(r => setTimeout(r, 80));
                if (cancelled) return;
                setSteps(s => s.map(step => (step.id === "finish" ? { ...step, status: "done" } : step)));

                // ensure minimum visible loading time from the start of init
                const start = initStartRef.current ?? Date.now();
                const elapsed = Date.now() - start;
                const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
                if (remaining > 0) {
                    await new Promise(r => setTimeout(r, remaining));
                    if (cancelled) return;
                }

                setIsInitializing(false);
            } finally {
                initInFlightRef.current = false;
                if (watchdog) clearTimeout(watchdog);
            }
        }

        init();
        return () => {
            cancelled = true;
            if (watchdog) clearTimeout(watchdog);
        };
    }, [isInitializing, hydrated]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === "b") {
                e.preventDefault();
                setBuildMenuOpen(prev => {
                    const next = !prev;
                    if (!next) setBuildMode(null);
                    return next;
                });
                return;
            }
            if (key === "v") {
                e.preventDefault();
                setVillagerMenuOpen(prev => !prev);
                return;
            }
            if (e.key === "Tab") {
                e.preventDefault();
                setInventoryOpen(prev => !prev);
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
        if (!st) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(type);
        setBuildMenuOpen(false);
    };

    const handleTileClick = (pos: Vec2) => {
        setSt(prev => {
            if (!prev) return prev;
            const building = findBuildingAt(prev, pos);
            let next: GameState = { ...(prev as GameState), selection: { kind: "tile", pos } } as GameState;

            if (building) {
                next = { ...next, selection: { kind: "building", id: building.id } };
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
            if (!prev) return prev;
            const next = engine.commands.collectFromBuilding(prev, buildingId);
            queueSave(next);
            return next;
        });
    };

    const handleUpgrade = (buildingId: string) => {
        setSt(prev => {
            if (!prev) return prev;
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
        if (!st) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(type);
    };

    if (!hydrated) return null;

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
            {st ? (
                <WorldCanvas
                    st={st}
                    buildMode={buildMode}
                    onTileClick={handleTileClick}
                        onOpenAssignVillager={() => setAssignVillagerOpen(true)}
                        onStartTask={(buildingId, taskId) => {
                            setSt(prev => {
                                if (!prev) return prev;
                                const next = engine.commands.startBuildingTask(prev, buildingId, taskId);
                                queueSave(next);
                                return next;
                            });
                        }}
                        onAssignVillager={(vid, buildingId) => {
                            setSt(prev => {
                                if (!prev) return prev;
                                const next = engine.commands.assignVillagerToBuilding(prev, vid, buildingId);
                                queueSave(next);
                                return next;
                            });
                        }}
                        onRemoveAssignedVillager={(vid, buildingId) => {
                            setSt(prev => {
                                if (!prev) return prev;
                                const next = engine.commands.assignVillagerToBuilding(prev, vid, null);
                                queueSave(next);
                                return next;
                            });
                        }}
                        onUpgrade={(buildingId) => handleUpgrade(buildingId)}
                    onCancelBuild={() => setBuildMode(null)}
                    onCollectBuilding={handleCollect}
                    initialCamera={initialCamera ?? undefined}
                    onCameraChange={cam => {
                        if (cameraSaveTimeout.current) clearTimeout(cameraSaveTimeout.current);
                        cameraSaveTimeout.current = setTimeout(() => saveCamera(cam), 400);
                    }}
                    onDragActive={setIsDragging}
                />
            ) : null}
        </div>

        {st && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <TutorialPanel quests={st.quests} onSelectBuild={handlePlanTutorialBuild} villagers={st.villagers} />
                <TopRightResources st={st} />

                {/* Building modal removed */}

                <AssignVillagerModal
                    open={assignVillagerOpen}
                    onClose={() => setAssignVillagerOpen(false)}
                    villagers={Object.values(st.villagers).filter(v => v.state === "alive" && !(st.selection.kind === "building" && st.buildings[st.selection.id].assignedVillagerIds.includes(v.id)))}
                    assigned={(st.selection.kind === "building" && st.buildings[st.selection.id]) ? st.buildings[st.selection.id].assignedVillagerIds.map(id => st.villagers[id]).filter(Boolean).filter(v => v.state === "alive") : []}
                    onAssign={(vid: string) => setSt(prev => {
                        if (!prev) return prev;
                        const next = engine.commands.assignVillagerToBuilding(prev, vid, st.selection.kind === "building" ? st.selection.id : null);
                        queueSave(next);
                        return next;
                    })}
                    onRemove={(vid: string) => setSt(prev => {
                        if (!prev) return prev;
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
                    villagerMenuOpen={villagerMenuOpen}
                    onToggleVillagerMenu={() => setVillagerMenuOpen(prev => !prev)}
                    inventoryOpen={inventoryOpen}
                    onToggleInventory={() => setInventoryOpen(prev => !prev)}
                />
            </div>
        )}

        {isInitializing && <LoadingOverlay steps={steps} />}

    </div>
);
}
