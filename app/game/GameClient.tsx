"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";
import * as engine from "../../src/game/engine";
import { clearSavedGame, loadGameState, saveGameState } from "../../src/game/persistence/storage/local";
import { loadSeed, saveSeed } from "../../src/game/persistence/storage/seed";
import { loadCamera, saveCamera } from "../../src/game/persistence/storage/camera";
import { BUILDING_COSTS, formatCost } from "../../src/game/domains/buildings/model/buildingCosts";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import { getBuildingSize } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, QuestId, Vec2 } from "../../src/game/types/GameState";
import WorldCanvas from "./WorldCanvas";
import { UI_THEME as THEME, BUILDING_COLORS } from "../../src/ui/theme";

type BuildItem = {
    id: string;
    title: string;
    size: string;
    effect: string;
    upgrade: string;
    status: "available" | "locked" | "planned";
    type?: BuildingTypeId;
    cost?: string;
};

type BuildSection = {
    id: string;
    title: string;
    focus: string;
    accent: string;
    items: BuildItem[];
};

const BUILD_SECTIONS: BuildSection[] = [
    {
        id: "stage1",
        title: "Stufe 1 – Start & Ueberleben",
        focus: "Nahrung, Moral, Basis-Kontrolle",
        accent: "#ff914d",
        items: [
            {
                id: "townhall",
                type: "townhall",
                title: "Rathaus",
                size: "3x3",
                effect: "Dorfzentrum, Job-Zuweisung, Quest-Trigger",
                upgrade: "Mehr Villager-Slots, neue Menues",
                status: "available",
                cost: "Start"
            },
            {
                id: "campfire",
                type: "campfire",
                title: "Lagerfeuer",
                size: "2x2",
                effect: "Moral-Stabilisator, Nacht-Sicherheit",
                upgrade: "Groessere Moral-Aura",
                status: "available",
                cost: "10 Holz"
            },
            {
                id: "road",
                type: "road",
                title: "Weg",
                size: "1x1",
                effect: "Verbinde Gebaeude",
                upgrade: "Schneller laufen",
                status: "available",
                cost: "1 Holz"
            },
            {
                id: "gather_hut",
                type: "gather_hut",
                title: "Sammlerhuette",
                size: "2x2",
                effect: "Beeren sammeln",
                upgrade: "+Slots, bessere Tools",
                status: "available",
                cost: "20 Holz"
            },
            {
                id: "storage_small",
                type: "storage",
                title: "Kleines Lager",
                size: "2x2",
                effect: "Erhoeht Lagerkapazitaet",
                upgrade: "Richtung Grosses Lager",
                status: "available",
                cost: "25 Holz, 10 Stein"
            },
            { id: "woodcutter", title: "Holzfaellerhuette", size: "2x2", effect: "Holzproduktion", upgrade: "Effizientere Arbeit", status: "planned" },
            { id: "sleep_hut", title: "Schlafhuette", size: "2x2", effect: "Regeneration, senkt Erschoepfung", upgrade: "Mehr Betten", status: "planned" },
            { id: "well", title: "Brunnen", size: "1x1", effect: "Krankheit runter, Moral leicht rauf", upgrade: "Staerkere Effekte", status: "planned" }
        ]
    },
    {
        id: "stage2",
        title: "Stufe 2 – Stabilisierung & Alltag",
        focus: "Sicherheit, Veredelung, Dorfleben",
        accent: "#fbbf24",
        items: [
            { id: "quarry", title: "Steinbruch", size: "3x3", effect: "Steinproduktion", upgrade: "Erz-Chance", status: "planned" },
            { id: "workbench", title: "Werkbank", size: "2x2", effect: "Werkzeuge Stufe I", upgrade: "Stufe II/III", status: "planned" },
            { id: "drying_rack", title: "Trockengestell", size: "2x1", effect: "Nahrung haltbarer", upgrade: "Geringerer Verderb", status: "planned" },
            {
                id: "watchpost",
                type: "watchpost",
                title: "Wachtposten",
                size: "2x2",
                effect: "Angriffsschaden runter",
                upgrade: "Sichtweite rauf",
                status: "available",
                cost: "18 Holz, 6 Stein"
            },
            { id: "fishing_hut", title: "Fischerhuette", size: "2x2 (am Wasser)", effect: "Fisch", upgrade: "Netze, Boote", status: "planned" },
            { id: "herb_garden", title: "Kraeutergarten", size: "2x2", effect: "Medizin-Basis", upgrade: "Bessere Heilung", status: "planned" },
            { id: "meeting_ground", title: "Versammlungsplatz", size: "3x3", effect: "Moral-Boost bei Events", upgrade: "Buff-Dauer rauf", status: "planned" }
        ]
    },
    {
        id: "stage3",
        title: "Stufe 3 – Veredelung & Tiefe",
        focus: "Planung, Produktion, Entscheidungen",
        accent: "#3b82f6",
        items: [
            {
                id: "sawmill",
                type: "sawmill",
                title: "Saegewerk",
                size: "3x2",
                effect: "Wandelt Holz in Bretter",
                upgrade: "Schnellerer Zuschnitt",
                status: "available"
            },
            { id: "weaving", title: "Weberei", size: "3x2", effect: "Fasern zu Stoffen", upgrade: "Moral-Items", status: "planned" },
            { id: "medical_hut", title: "Medizinische Huette", size: "2x2", effect: "Krankheiten heilbar", upgrade: "Seuchen abmildern", status: "planned" },
            { id: "warehouse_big", title: "Grosses Lager", size: "3x3", effect: "Massive Kapazitaet", upgrade: "Sortierung (Bonusse)", status: "planned" },
            { id: "tavern", title: "Taverne", size: "3x3", effect: "Moral hoch, Konflikte runter", upgrade: "Produktivitaetsbonus", status: "planned" },
            { id: "research_tent", title: "Forschungszelt", size: "2x2", effect: "Erste Techs", upgrade: "Richtung Forschungsgebaeude", status: "planned" }
        ]
    },
    {
        id: "stage4",
        title: "Stufe 4 – Midgame-Strategie",
        focus: "Spezialisierung und Risiken",
        accent: "#a855f7",
        items: [
            { id: "academy", title: "Akademie", size: "3x3", effect: "Forschung beschleunigen", upgrade: "Pfad-Spezialisierung", status: "planned" },
            { id: "mine", title: "Mine", size: "3x3", effect: "Kupfer/Eisen", upgrade: "Tiefer graben", status: "planned" },
            { id: "forge", title: "Schmiede", size: "3x3", effect: "Metallwerkzeuge, Waffen", upgrade: "Qualitaet rauf", status: "planned" },
            { id: "watchtower", title: "Wachturm", size: "2x3", effect: "Angriffe frueh erkennen", upgrade: "Fernschaden", status: "planned" },
            { id: "gate_wall", title: "Tor & Palisade", size: "Variabel", effect: "Dorf verteidigen", upgrade: "Stein zu Metall", status: "planned" },
            { id: "market", title: "Marktplatz", size: "4x4", effect: "Karawanen-Handel", upgrade: "Bessere Angebote", status: "planned" }
        ]
    },
    {
        id: "stage5",
        title: "Stufe 5 – Spaetes Spiel & Emotion",
        focus: "Story, Ruf, Konsequenzen",
        accent: "#ef4444",
        items: [
            { id: "temple", title: "Tempel", size: "4x4", effect: "Globale Moral, Ruf", upgrade: "Seltene Events", status: "planned" },
            { id: "memorial", title: "Gedenkstaette", size: "2x2", effect: "Trauer-Malus runter", upgrade: "Buffs aus Erinnerungen", status: "planned" },
            { id: "caravan_yard", title: "Karawanenhof", size: "4x3", effect: "Haefigere Haendler", upgrade: "Exklusive Waren", status: "planned" },
            { id: "archive", title: "Archiv", size: "3x2", effect: "Wissen speichern", upgrade: "Tech-Kosten runter", status: "planned" },
            { id: "training_ground", title: "Ausbildungsplatz", size: "3x3", effect: "Villager trainieren", upgrade: "Spezialisierungen", status: "planned" },
            { id: "ritual_ground", title: "Ritualplatz", size: "3x3", effect: "Risiko-Events mit Chance", upgrade: "Kontrolle rauf", status: "planned" }
        ]
    },
    {
        id: "optional",
        title: "Optional / Late-Late Game",
        focus: "Prestige und Welt",
        accent: "#111827",
        items: [
            { id: "observatory", title: "Observatorium", size: "3x3", effect: "Events vorhersagen", upgrade: "Praezision", status: "planned" },
            { id: "harbor", title: "Hafen", size: "4x3", effect: "Neue Karten / Welt", upgrade: "Schiffe", status: "planned" },
            { id: "outpost", title: "Aussenposten", size: "3x3", effect: "Ressourcen remote", upgrade: "Automatisierung", status: "planned" },
            { id: "hunting_cabin", title: "Jagdhuette", size: "3x2", effect: "Leder & Fleisch", upgrade: "Bessere Fallen", status: "planned" },
            { id: "bridge", title: "Bruecke", size: "Variabel", effect: "Neue Biome", upgrade: "Stabilitaet", status: "planned" },
            { id: "lighthouse", title: "Leuchtturm", size: "2x2", effect: "Karawanen-Sicht", upgrade: "Signalweite", status: "planned" },
            { id: "guildhall", title: "Gildenhaus", size: "3x3", effect: "Quests & Ruf", upgrade: "Auftragswahl", status: "planned" },
            { id: "monument", title: "Monument", size: "4x4", effect: "Prestige-Bau", upgrade: "Stadtbonus", status: "planned" }
        ]
    }
];

const TUTORIAL_STEPS: Array<{ id: QuestId; description: string; target?: BuildingTypeId; hint?: string }> = [
    {
        id: "tutorial_home",
        description: "Richte ein Rathaus (3x3) ein. Es dient als Zentrum fuer Jobs und Auswahl.",
        target: "townhall",
        hint: "Waehle im Baumenue das Rathaus und platziere es auf freiem Boden."
    },
    {
        id: "tutorial_food",
        description: "Baue ein Lagerfeuer fuer Moral und erste Nachtruhe.",
        target: "campfire",
        hint: "Kosten im Blick behalten und nahe beim Rathaus platzieren."
    },
    {
        id: "tutorial_research",
        description: "Errichte eine Sammlerhuette, damit du regelmaessig Beeren bekommst.",
        target: "gather_hut",
        hint: "Nach dem Bau mindestens einen Bewohner zuweisen."
    }
];

function isTutorialBuildLocked(type: BuildingTypeId | null, quests?: GameState["quests"]): boolean {
    if (!type || !quests) return false;
    const step = TUTORIAL_STEPS.find(s => s.target === type);
    if (!step) return false;
    return quests[step.id]?.locked ?? false;
}

function getActiveTutorialId(quests?: GameState["quests"]): QuestId | null {
    if (!quests) return null;
    const next = TUTORIAL_STEPS.find(step => {
        const q = quests[step.id];
        return q && !q.done;
    });
    return next ? next.id : null;
}

const BUILDABLE_ITEMS = BUILD_SECTIONS.flatMap(section => section.items).filter((item): item is BuildItem & { type: BuildingTypeId } => item.status === "available" && Boolean(item.type));
const BUILDABLE_TYPE_SET = new Set<BuildingTypeId>(BUILDABLE_ITEMS.map(item => item.type));
const BUILD_META: Record<BuildingTypeId, { title: string; cost: string; size: string; effect: string }> = BUILDABLE_ITEMS.reduce(
    (acc, item) => {
        acc[item.type] = {
            title: item.title,
            cost: formatCost(BUILDING_COSTS[item.type]),
            size: item.size,
            effect: item.effect
        };
        return acc;
    },
    {} as Record<BuildingTypeId, { title: string; cost: string; size: string; effect: string }>
);


const RES_ORDER: Array<{ id: keyof GameState["inventory"]; label: string; Icon: FC; color: string }> = [
    { id: "wood", label: "Holz", Icon: WoodIcon, color: "#d4a373" },
    { id: "planks", label: "Bretter", Icon: WoodIcon, color: "#c8a46b" },
    { id: "berries", label: "Beeren", Icon: BerriesIcon, color: "#b85acb" },
    { id: "fish", label: "Fisch", Icon: FishIcon, color: "#4cc3ff" },
    { id: "stone", label: "Stein", Icon: StoneIcon, color: "#9ca3af" },
    { id: "fibers", label: "Fasern", Icon: FibersIcon, color: "#6ee7b7" },
    { id: "medicine", label: "Medizin", Icon: MedicineIcon, color: "#f472b6" },
    { id: "knowledge", label: "Wissen", Icon: KnowledgeIcon, color: "#fbbf24" },
    { id: "gold", label: "Gold", Icon: GoldIcon, color: "#f59e0b" }
];

export default function GameClient() {
    const [seed, setSeed] = useState<number>(() => {
        if (typeof window === "undefined") return Date.now();
        return loadSeed() ?? Date.now();
    });
    const [st, setSt] = useState<GameState>(() => engine.create.createGame(seed));
    const [initialCamera] = useState(() => (typeof window === "undefined" ? null : loadCamera()));
    const cameraSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastSavedRef = useRef<number>(0);
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

    const [buildMode, setBuildMode] = useState<BuildingTypeId | null>(null);
    const [buildMenuOpen, setBuildMenuOpen] = useState(false);
    const [villagerMenuOpen, setVillagerMenuOpen] = useState(false);
    const [buildingModalOpen, setBuildingModalOpen] = useState(false);
    const [hoverTile, setHoverTile] = useState<Vec2 | null>(null);
    const [fps, setFps] = useState(0);

    useEffect(() => {
        const loaded = loadGameState();
        if (loaded) {
            setSt(loaded.state);
            if (loaded.state.seed) {
                setSeed(loaded.state.seed);
                saveSeed(loaded.state.seed);
            }
            const now = Date.now();
            setLastLoadedAt(now);
            if (loaded.savedAt) {
                lastSavedRef.current = loaded.savedAt;
                setLastSavedAt(loaded.savedAt);
            }
        }
        if (!loaded) {
            saveSeed(seed);
        }
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


    const aliveVillagers = useMemo(() => Object.values(st.villagers).filter(v => v.state === "alive"), [st.villagers]);
    const hoveredBuilding = useMemo(() => {
        if (!hoverTile) return null;
        return (
            Object.values(st.buildings).find(b => {
                const size = getBuildingSize(b.type);
                return hoverTile.x >= b.pos.x && hoverTile.x < b.pos.x + size.w && hoverTile.y >= b.pos.y && hoverTile.y < b.pos.y + size.h;
            }) || null
        );
    }, [hoverTile, st.buildings]);
    const hoveredTileId = useMemo(() => {
        if (!hoverTile) return "";
        const i = hoverTile.y * st.world.width + hoverTile.x;
        return st.world.tiles[i]?.id ?? "";
    }, [hoverTile, st.world]);
    const canPlaceHover = useMemo(() => (hoverTile && buildMode ? canPlaceAt(st, hoverTile, buildMode) : false), [hoverTile, st, buildMode]);

    const unlocks = useMemo(() => {
        const knowledge = st.inventory.knowledge ?? 0;
        return {
            stage1: true,
            stage2: knowledge >= 5,
            stage3: knowledge >= 15,
            stage4: knowledge >= 30,
            stage5: knowledge >= 45,
            optional: knowledge >= 60
        } as Record<string, boolean>;
    }, [st.inventory.knowledge]);

    const tutorialLocks = useMemo(() => {
        const result: Partial<Record<BuildingTypeId, boolean>> = {};
        TUTORIAL_STEPS.forEach(step => {
            if (step.target) {
                result[step.target] = st.quests?.[step.id]?.locked ?? false;
            }
        });
        return result;
    }, [st.quests]);

    const handleSelectBuild = (type: BuildingTypeId) => {
        if (!BUILDABLE_TYPE_SET.has(type)) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(prev => (prev === type ? null : type));
        setBuildMenuOpen(false);
        setVillagerMenuOpen(false);
    };

    const handleAssignHome = (villagerId: string, buildingId: string | null) => {
        setSt(prev => {
            const next = engine.commands.assignVillagerHome(prev, villagerId, buildingId);
            queueSave(next);
            return next;
        });
    };

    const handleAssignWork = (villagerId: string, buildingId: string | null) => {
        setSt(prev => {
            const next = engine.commands.assignVillagerToBuilding(prev, villagerId, buildingId);
            queueSave(next);
            return next;
        });
    };

    const handleTileClick = (pos: Vec2) => {
        setSt(prev => {
            const building = findBuildingAt(prev, pos);
            let next: GameState;

            if (building) {
                next = { ...prev, selection: { kind: "building", id: building.id } };
                setBuildingModalOpen(true);
            } else {
                next = { ...prev, selection: { kind: "tile", pos } };
                setBuildingModalOpen(false);
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

    const queueSave = (state: GameState) => {
        const now = Date.now();
        const MIN_SAVE_INTERVAL_MS = 5000;
        if (now - lastSavedRef.current < MIN_SAVE_INTERVAL_MS) return;
        const savedAt = saveGameState(state);
        if (savedAt) {
            lastSavedRef.current = savedAt;
            setLastSavedAt(savedAt);
        }
    };

    const handleManualSave = () => {
        queueSave(st);
    };

    const resetWithSeed = (nextSeed: number) => {
        saveSeed(nextSeed);
        const fresh = engine.create.createGame(nextSeed);
        clearSavedGame();
        lastSavedRef.current = 0;
        setLastSavedAt(null);
        setLastLoadedAt(null);
        lastRef.current = null;
        setBuildMode(null);
        setBuildMenuOpen(false);
        setVillagerMenuOpen(false);
        setBuildingModalOpen(false);
        setHoverTile(null);
        setSeed(nextSeed);
        setSt(fresh);
    };

    const handleResetGame = () => {
        resetWithSeed(seed);
    };

    const handleRerollSeed = () => {
        const nextSeed = Date.now();
        resetWithSeed(nextSeed);
    };

    const findBuildingAt = (state: GameState, pos: Vec2) => {
        return Object.values(state.buildings).find(b => {
            const size = getBuildingSize(b.type);
            return pos.x >= b.pos.x && pos.x < b.pos.x + size.w && pos.y >= b.pos.y && pos.y < b.pos.y + size.h;
        }) || null;
    };

    const handlePlanTutorialBuild = (type: BuildingTypeId) => {
        if (!BUILDABLE_TYPE_SET.has(type)) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(type);
        setBuildMenuOpen(false);
        setVillagerMenuOpen(false);
    };

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                overflow: "hidden",
                background: THEME.background,
                color: THEME.text,
                fontFamily: "Nunito, system-ui, sans-serif"
            }}
        >
            <div style={{ position: "absolute", inset: 0 }}>
                <WorldCanvas
                    st={st}
                    buildMode={buildMode}
                    onTileClick={handleTileClick}
                    onHover={setHoverTile}
                    onCancelBuild={() => setBuildMode(null)}
                    onCollectBuilding={handleCollect}
                    initialCamera={initialCamera ?? undefined}
                    onCameraChange={cam => {
                        if (cameraSaveTimeout.current) clearTimeout(cameraSaveTimeout.current);
                        cameraSaveTimeout.current = setTimeout(() => saveCamera(cam), 400);
                    }}
                    onFpsUpdate={setFps}
                />
            </div>

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <TopLeftHud st={st} fps={fps} />
                <TutorialPanel quests={st.quests} onSelectBuild={handlePlanTutorialBuild} />
                <TopRightResources st={st} />
                <HoverCard hoveredBuilding={hoveredBuilding} hoveredTileId={hoveredTileId} hoverTile={hoverTile} canPlace={canPlaceHover} buildMode={buildMode} />
                <BuildMenu
                    open={buildMenuOpen}
                    sections={BUILD_SECTIONS}
                    activeType={buildMode}
                    unlocks={unlocks}
                    quests={st.quests}
                    tutorialLocks={tutorialLocks}
                    onSelect={handleSelectBuild}
                    onClose={() => setBuildMenuOpen(false)}
                />
                <BuildingModal
                    open={buildingModalOpen && st.selection.kind === "building" && Boolean(st.buildings[st.selection.id])}
                    building={st.selection.kind === "building" ? st.buildings[st.selection.id] : null}
                    st={st}
                    onClose={() => setBuildingModalOpen(false)}
                    onCollect={handleCollect}
                    onAssignWork={handleAssignWork}
                />
                <VillagerMenu
                    open={villagerMenuOpen}
                    st={st}
                    onClose={() => setVillagerMenuOpen(false)}
                    onAssignHome={handleAssignHome}
                    onAssignWork={handleAssignWork}
                />
                <BottomHud
                    st={st}
                    setSt={setSt}
                    buildMode={buildMode}
                    buildMenuOpen={buildMenuOpen}
                    onToggleBuildMenu={() => setBuildMenuOpen(prev => !prev)}
                    villagerMenuOpen={villagerMenuOpen}
                    onToggleVillagerMenu={() => setVillagerMenuOpen(prev => !prev)}
                    onCancelBuild={() => setBuildMode(null)}
                    villagerCount={aliveVillagers.length}
                    onCloseBuildingModal={() => setBuildingModalOpen(false)}
                    fps={fps}
                />
            </div>
        </div>
    );
}

function TopLeftHud({ st, fps }: { st: GameState; fps: number }) {
    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                left: 18,
                padding: "10px 14px",
                width: "min(360px, 92vw)",
                background: THEME.panelBg,
                border: `1px solid ${THEME.panelBorder}`,
                borderRadius: 12,
                boxShadow: THEME.panelShadow,
                backdropFilter: "blur(6px)",
                pointerEvents: "auto"
            }}
        >
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.2 }}>Tribe Island</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <Tag label="Phase" value={st.time.phase} />
                <Tag label="FPS" value={Math.round(fps).toString()} />
                <Tag label="Tag" value={String(st.time.day)} />
            </div>
        </div>
    );
}

function SaveControls({ seed, lastSavedAt, lastLoadedAt, onSave, onReset, onRerollSeed }: { seed: number; lastSavedAt: number | null; lastLoadedAt: number | null; onSave: () => void; onReset: () => void; onRerollSeed: () => void }) {
    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                pointerEvents: "auto",
                zIndex: 30
            }}
        >
            <div
                style={{
                    display: "grid",
                    gap: 6,
                    padding: "10px 12px",
                    background: "rgba(255, 238, 210, 0.3)",
                    borderRadius: 12,
                    border: "1px solid rgba(255,206,140,0.6)",
                    boxShadow: "0 10px 24px rgba(40,20,8,0.18)",
                    backdropFilter: "blur(8px)"
                }}
            >
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={onSave}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,206,140,0.9)",
                            background: "linear-gradient(135deg, rgba(255,210,150,0.92), rgba(240,170,90,0.9))",
                            cursor: "pointer",
                            fontWeight: 800,
                            boxShadow: THEME.accentGlow
                        }}
                    >
                        Speichern
                    </button>
                    <button
                        onClick={onReset}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,206,140,0.6)",
                            background: "rgba(40,20,8,0.14)",
                            color: THEME.text,
                            cursor: "pointer",
                            fontWeight: 800,
                            boxShadow: THEME.panelShadow
                        }}
                    >
                        Neues Spiel
                    </button>
                    <button
                        onClick={onRerollSeed}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,206,140,0.9)",
                            background: "linear-gradient(135deg, rgba(200,230,255,0.9), rgba(120,170,240,0.85))",
                            cursor: "pointer",
                            fontWeight: 800,
                            boxShadow: THEME.panelShadow
                        }}
                    >
                        Neuer Seed
                    </button>
                </div>
                <div style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.85 }}>
                    <span>Seed: {seed}</span>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>Gespeichert: {formatClock(lastSavedAt)}</span>
                        <span>Geladen: {formatClock(lastLoadedAt)}</span>
                        <span style={{ opacity: 0.7 }}>Autospeicher: ~0.5s bei Aenderungen</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatClock(ts: number | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function TutorialPanel({ quests, onSelectBuild }: { quests: GameState["quests"]; onSelectBuild: (type: BuildingTypeId) => void }) {
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
                top: 14,
                left: 14,
                padding: "10px 12px",
                maxWidth: "320px",
                background: "rgba(255, 238, 210, 0.32)",
                border: "1px solid rgba(255, 206, 140, 0.6)",
                borderRadius: 12,
                boxShadow: "0 10px 28px rgba(40,20,8,0.18)",
                backdropFilter: "blur(10px)",
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
                        border: "1px solid rgba(255,206,140,0.8)",
                        background: "rgba(255, 255, 255, 0.78)",
                        padding: 10,
                        display: "grid",
                        gap: 6,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)"
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
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,206,140,0.9)",
                                background: "linear-gradient(135deg, rgba(255,210,150,0.9), rgba(240,170,90,0.85))",
                                cursor: "pointer",
                                fontWeight: 800,
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

function TopRightResources({ st }: { st: GameState }) {
    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                right: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                maxWidth: "min(70vw, 640px)",
                pointerEvents: "auto",
                padding: "6px 8px",
                background: "rgba(30, 15, 0, 0.15)",
                borderRadius: 14,
                border: "1px solid rgba(255,206,140,0.45)",
                boxShadow: "0 10px 24px rgba(40,20,8,0.18)",
                backdropFilter: "blur(10px)"
            }}
        >
            {RES_ORDER.map(res => (
                <div
                    key={res.id}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        minWidth: 110,
                        padding: "6px 10px",
                        background: "linear-gradient(135deg, rgba(255,233,200,0.55), rgba(240,196,120,0.5))",
                        borderRadius: 10,
                        border: "1px solid rgba(255,206,140,0.7)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 14px rgba(40,20,8,0.18)",
                        backdropFilter: "blur(6px)"
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
                            background: `radial-gradient(circle at 30% 30%, #fff7eb 0%, ${res.color}33 70%, transparent 100%)`,
                            border: `1px solid ${res.color}55`,
                            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.38)",
                            fontSize: 15
                        }}
                    >
                        <res.Icon />
                    </span>
                    <span style={{ flex: 1, opacity: 0.85 }}>{res.label}</span>
                    <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: THEME.text }}>{st.inventory[res.id] ?? 0}</span>
                </div>
            ))}
        </div>
    );
}

function HoverCard({ hoveredBuilding, hoveredTileId, hoverTile, canPlace, buildMode }: { hoveredBuilding: GameState["buildings"][string] | null; hoveredTileId: string; hoverTile: Vec2 | null; canPlace: boolean; buildMode: BuildingTypeId | null }) {
    if (!hoverTile) return null;
    return (
        <div
            style={{
                position: "absolute",
                top: 90,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "8px 12px",
                background: THEME.panelBg,
                border: `1px solid ${THEME.panelBorder}`,
                borderRadius: 10,
                boxShadow: THEME.panelShadow,
                display: "flex",
                gap: 10,
                pointerEvents: "none",
                fontSize: 13
            }}
        >
            <span>Tile {hoverTile.x},{hoverTile.y} ({hoveredTileId || "-"})</span>
            {buildMode && <span>| Modus: {BUILD_META[buildMode]?.title ?? buildMode}</span>}
            {buildMode && <span>| {canPlace ? "frei" : "blockiert"}</span>}
            {buildMode && (
                <span>
                    | Groesse: {getBuildingSize(buildMode).w}x{getBuildingSize(buildMode).h}
                </span>
            )}
            {hoveredBuilding && <span>| {BUILD_META[hoveredBuilding.type]?.title ?? hoveredBuilding.type}</span>}
        </div>
    );
}

function BuildingModal({
    open,
    building,
    st,
    onClose,
    onCollect,
    onAssignWork
}: {
    open: boolean;
    building: GameState["buildings"][string] | null;
    st: GameState;
    onClose: () => void;
    onCollect: (id: string) => void;
    onAssignWork: (villagerId: string, buildingId: string | null) => void;
}) {
    if (!open || !building) return null;

    const meta = BUILD_META[building.type];
    const collectable = building.task.collectable && building.output;
    const progressPct = Math.max(0, Math.min(100, Math.round((building.task.progress / Math.max(1, building.task.duration)) * 100)));
    const progressTone: "accent" | "ok" | "warn" = building.task.collectable ? "ok" : building.task.blocked ? "warn" : "accent";
    const statusLabel = building.task.collectable ? "Abholbereit" : building.task.blocked ? "Blockiert" : "Laeuft";

    const villagers = Object.values(st.villagers).filter(v => v.state === "alive");
    const assigned = building.assignedVillagerIds
        .map(id => st.villagers[id])
        .filter(Boolean)
        .filter(v => v.state === "alive");
    const available = villagers.filter(v => !building.assignedVillagerIds.includes(v.id));

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                background: "rgba(10,10,20,0.55)",
                padding: 24,
                zIndex: 20
            }}
        >
            <div
                style={{
                    width: "min(540px, 94vw)",
                    borderRadius: 14,
                    border: "2px solid #1f1b2d",
                    boxShadow: "0 0 0 2px #f5e2c5, 0 18px 36px rgba(0,0,0,0.45)",
                    background:
                        "linear-gradient(180deg, rgba(255,247,235,0.96) 0%, rgba(250,231,206,0.95) 50%, rgba(246,214,180,0.95) 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 2px, transparent 2px, transparent 4px)",
                    padding: 16,
                    display: "grid",
                    gap: 12,
                    imageRendering: "pixelated"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 3,
                                    background: BUILDING_COLORS[building.type] ?? THEME.accent,
                                    boxShadow: "0 0 0 1px rgba(0,0,0,0.18)"
                                }}
                            />
                            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 0.2 }}>{meta?.title ?? building.type}</div>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>ID: {building.id}</div>
                        {meta && <div style={{ fontSize: 12, opacity: 0.82 }}>Effekt: {meta.effect}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Badge label={`Lvl ${building.level}`} tone="muted" />
                        <button
                            onClick={onClose}
                            style={{
                                border: "2px solid #2b1a10",
                                background: "linear-gradient(135deg, #ffe1b8, #ffb88a)",
                                borderRadius: 10,
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontWeight: 800,
                                boxShadow: THEME.accentGlow
                            }}
                        >
                            Schliessen
                        </button>
                    </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ border: "2px solid #1f1b2d", borderRadius: 10, background: "rgba(255,255,255,0.92)", padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800 }}>Auftrag</div>
                            <Badge label={statusLabel} tone={collectable ? "ok" : building.task.blocked ? "warn" : "accent"} />
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8, display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
                            <span>{progressPct}%</span>
                            {building.output && <span>Ausgabe: {building.output.amount} {building.output.resource}</span>}
                        </div>
                        <ProgressBar value={progressPct} tone={progressTone} />
                        {collectable && (
                            <button
                                onClick={() => onCollect(building.id)}
                                style={{
                                    marginTop: 8,
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    border: "2px solid #1f1b2d",
                                    background: "linear-gradient(135deg, #c1ff72, #7edd52)",
                                    cursor: "pointer",
                                    fontWeight: 900,
                                    boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
                                    letterSpacing: 0.2
                                }}
                            >
                                Einsammeln
                            </button>
                        )}
                    </div>

                    <div
                        style={{
                            border: "2px solid #1f1b2d",
                            borderRadius: 10,
                            background: "rgba(250,245,235,0.92)",
                            padding: 12,
                            display: "grid",
                            gap: 10
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800 }}>Zugewiesene Bewohner ({assigned.length})</div>
                            <Badge label={`${available.length} frei`} tone="muted" />
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                            {assigned.length === 0 && <div style={{ fontSize: 12, opacity: 0.65 }}>Keine Bewohner zugewiesen.</div>}
                            {assigned.map(v => (
                                <VillagerRow
                                    key={v.id}
                                    v={v}
                                    actionLabel="Entfernen"
                                    onAction={() => onAssignWork(v.id, null)}
                                    tone="accent"
                                />
                            ))}
                        </div>

                        {available.length > 0 && (
                            <div style={{ borderTop: "1px dashed rgba(0,0,0,0.12)", paddingTop: 10, display: "grid", gap: 8 }}>
                                <div style={{ fontWeight: 800 }}>Verfuegbar</div>
                                {available.slice(0, 5).map(v => (
                                    <VillagerRow
                                        key={v.id}
                                        v={v}
                                        actionLabel="Zuweisen"
                                        onAction={() => onAssignWork(v.id, building.id)}
                                        tone="ok"
                                    />
                                ))}
                                {available.length > 5 && <div style={{ fontSize: 11, opacity: 0.6 }}>… {available.length - 5} weitere verfuegbar</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Badge({ label, tone = "muted" }: { label: string; tone?: "muted" | "ok" | "warn" | "accent" }) {
    const palette = {
        muted: { bg: "#f4eadc", border: "#2b1a10", color: "#2b1a10" },
        ok: { bg: "#caff99", border: "#2f4f1f", color: "#1f2f10" },
        warn: { bg: "#ffe0d0", border: "#7a1f0d", color: "#3c0f08" },
        accent: { bg: "#ffd9a3", border: "#2b1a10", color: "#2b1a10" }
    }[tone];

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

function VillagerRow({ v, actionLabel, onAction, tone }: { v: GameState["villagers"][string]; actionLabel: string; onAction: () => void; tone: "ok" | "accent" }) {
    const hunger = Math.round(v.needs.hunger * 100);
    const energy = Math.round(v.needs.energy * 100);
    const palette = tone === "ok" ? { border: "#2f4f1f", bg: "#f3ffe6" } : { border: "#2b1a10", bg: "#fff0de" };

    return (
        <div
            style={{
                border: `2px solid ${palette.border}`,
                borderRadius: 10,
                padding: 10,
                background: palette.bg,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
                fontSize: 12
            }}
        >
            <div style={{ display: "grid", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "linear-gradient(135deg, #ffe8c2, #ffcba2)",
                            border: "1px solid rgba(0,0,0,0.2)",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800
                        }}
                    >
                        {v.name.slice(0, 1)}
                    </span>
                    <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 800 }}>{v.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.8 }}>
                            <span>#{v.id}</span>
                            <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)", background: "rgba(0,0,0,0.04)" }}>
                                {v.job}
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", opacity: 0.85 }}>
                    <small>Hunger {hunger}%</small>
                    <small>Energie {energy}%</small>
                </div>
            </div>
            <button
                onClick={onAction}
                style={{
                    border: `2px solid ${palette.border}`,
                    background: tone === "ok" ? "linear-gradient(135deg, #d4ff9a, #9ddc5f)" : "linear-gradient(135deg, #ffd9a3, #ffb38a)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontWeight: 900,
                    minWidth: 96
                }}
            >
                {actionLabel}
            </button>
        </div>
    );
}

function BottomHud({
    st,
    setSt,
    buildMode,
    buildMenuOpen,
    onToggleBuildMenu,
    villagerMenuOpen,
    onToggleVillagerMenu,
    onCancelBuild,
    villagerCount,
    onCloseBuildingModal,
    fps
}: {
    st: GameState;
    setSt: React.Dispatch<React.SetStateAction<GameState>>;
    buildMode: BuildingTypeId | null;
    buildMenuOpen: boolean;
    onToggleBuildMenu: () => void;
    villagerMenuOpen: boolean;
    onToggleVillagerMenu: () => void;
    onCancelBuild: () => void;
    villagerCount: number;
    onCloseBuildingModal: () => void;
    fps: number;
}) {
    const hunger = st.alerts?.hunger?.severity ?? 0;
    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pointerEvents: "none",
                gap: 12,
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(30,15,0,0.28) 45%, rgba(30,15,0,0.42) 100%)",
                backdropFilter: "blur(10px)"
            }}
        >
            <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
                <SpeedButton label="||" active={st.speed === 0} onClick={() => setSt(s => ({ ...s, speed: 0 }))} />
                <SpeedButton label=">" active={st.speed === 1} onClick={() => setSt(s => ({ ...s, speed: 1 }))} />
                <SpeedButton label=">>" active={st.speed === 2} onClick={() => setSt(s => ({ ...s, speed: 2 }))} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, pointerEvents: "auto" }}>
                <HammerButton active={buildMenuOpen} onClick={() => { onCloseBuildingModal(); onToggleBuildMenu(); }} />
                <VillagerButton active={villagerMenuOpen} onClick={onToggleVillagerMenu} />
                <div
                    style={{
                        minWidth: 180,
                        textAlign: "center",
                        fontSize: 12,
                        opacity: 0.9,
                        padding: "8px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,206,140,0.5)",
                        background: "rgba(255, 233, 200, 0.18)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)"
                    }}
                >
                    {buildMode ? `Bauen: ${BUILD_META[buildMode]?.title ?? buildMode}` : "Kein Bau aktiv"}
                </div>
                {buildMode && (
                    <button
                        onClick={onCancelBuild}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,206,140,0.7)",
                            background: "linear-gradient(135deg, rgba(255,210,150,0.9), rgba(240,170,90,0.85))",
                            cursor: "pointer",
                            fontWeight: 700,
                            boxShadow: THEME.accentGlow
                        }}
                    >
                        Abbrechen
                    </button>
                )}
            </div>

            <div style={{ display: "grid", gap: 6, pointerEvents: "auto", justifyItems: "end" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag label="Bewohner" value={String(villagerCount)} />
                    <Tag label="Hunger" value={String(hunger)} tone={hunger > 0 ? "warn" : "muted"} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag label="FPS" value={Math.round(fps).toString()} />
                    <Tag label="Tag" value={String(st.time.day)} />
                </div>
            </div>
        </div>
    );
}

function SpeedButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: active ? "1px solid rgba(255,206,140,0.9)" : "1px solid rgba(255,206,140,0.35)",
                background: active ? "linear-gradient(135deg, rgba(255,210,150,0.95), rgba(240,170,90,0.85))" : "rgba(255, 233, 200, 0.18)",
                color: THEME.text,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: active ? THEME.accentGlow : "0 6px 12px rgba(40,20,8,0.2)",
                backdropFilter: "blur(6px)"
            }}
        >
            {label}
        </button>
    );
}

function Tag({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "warn" }) {
    const palette =
        tone === "warn"
            ? { bg: "rgba(255,149,128,0.22)", border: "rgba(255,149,128,0.6)" }
            : { bg: "rgba(255, 233, 200, 0.18)", border: "rgba(255,206,140,0.45)" };
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
                background: palette.bg,
                fontSize: 12,
                fontWeight: 700,
                color: THEME.text,
                boxShadow: "0 6px 12px rgba(40,20,8,0.18)",
                backdropFilter: "blur(6px)"
            }}
        >
            <span style={{ opacity: 0.75 }}>{label}</span>
            <span>{value}</span>
        </span>
    );
}

function HammerButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label="Build menu"
            style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.chipBorder}`,
                background: active ? "linear-gradient(135deg, #ffd9a3, #ffb38a)" : THEME.chipBg,
                cursor: "pointer",
                boxShadow: active ? THEME.accentGlow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20 14 10" />
                <path d="M13 6 17 2l3 3-4 4" />
                <path d="m3 21 3-1 1-3-3 1-1 3Z" />
            </svg>
        </button>
    );
}

function VillagerButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label="Bewohner menu"
            style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.chipBorder}`,
                background: active ? "linear-gradient(135deg, #ffd9a3, #ffb38a)" : THEME.chipBg,
                cursor: "pointer",
                boxShadow: active ? THEME.accentGlow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
            </svg>
        </button>
    );
}

function BuildMenu({
    open,
    sections,
    activeType,
    unlocks,
    quests,
    tutorialLocks,
    onSelect,
    onClose
}: {
    open: boolean;
    sections: BuildSection[];
    activeType: BuildingTypeId | null;
    unlocks: Record<string, boolean>;
    quests?: GameState["quests"];
    tutorialLocks: Partial<Record<BuildingTypeId, boolean>>;
    onSelect: (type: BuildingTypeId) => void;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                pointerEvents: "auto"
            }}
        >
            <div
                style={{
                    position: "relative",
                    maxHeight: "80vh",
                    width: "min(1100px, 92vw)",
                    overflow: "hidden",
                    background: THEME.panelBg,
                    borderRadius: 18,
                    border: `1px solid ${THEME.panelBorder}`,
                    boxShadow: "0 28px 60px rgba(0,0,0,0.25)",
                    backdropFilter: "blur(8px)",
                    pointerEvents: "auto",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${THEME.panelBorder}` }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Bauen</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Kategorisiert nach Stufen, freischaltbar ueber Forschung</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: `1px solid ${THEME.chipBorder}`,
                            background: THEME.chipBg,
                            borderRadius: 10,
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontWeight: 700
                        }}
                    >
                        Schliessen
                    </button>
                </div>

                <div style={{ padding: 16, overflowY: "auto", display: "grid", gap: 16 }}>
                    {sections.map(section => {
                        const unlocked = unlocks[section.id] ?? false;
                        return (
                            <div key={section.id} style={{ border: `1px solid ${section.accent}33`, borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.75)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 20,
                                            background: section.accent,
                                            boxShadow: `0 0 0 6px ${section.accent}18`
                                        }}
                                    />
                                    <div style={{ fontWeight: 800 }}>{section.title}</div>
                                    <div style={{ fontSize: 12, opacity: 0.7 }}>{section.focus}</div>
                                    {!unlocked && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: section.accent }}>Gesperrt (Forschung)</span>}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                    {section.items.map(item => {
                                        const tutorialStep = item.type ? TUTORIAL_STEPS.find(step => step.target === item.type) : undefined;
                                        const lockedByTutorial = item.type ? tutorialLocks[item.type] ?? false : false;
                                        const selectable = unlocked && item.status === "available" && item.type && BUILDABLE_TYPE_SET.has(item.type) && !lockedByTutorial;
                                        const locked =
                                            !unlocked || item.status !== "available" || !item.type || !BUILDABLE_TYPE_SET.has(item.type) || lockedByTutorial;
                                        const active = !!activeType && activeType === item.type;
                                        const meta = item.type ? BUILD_META[item.type] : undefined;
                                        const costText = meta?.cost ?? item.cost;
                                        const lockLabel = lockedByTutorial && tutorialStep ? quests?.[tutorialStep.id]?.title ?? "Tutorial-Schritt" : null;
                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    border: `1px solid ${locked ? THEME.chipBorder : section.accent}55`,
                                                    borderRadius: 12,
                                                    padding: 10,
                                                    background: locked ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.9)",
                                                    opacity: locked ? 0.6 : 1,
                                                    position: "relative",
                                                    boxShadow: active ? THEME.accentGlow : THEME.panelShadow
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                    <div style={{ fontWeight: 800 }}>{item.title}</div>
                                                    <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 8, border: `1px solid ${section.accent}55`, color: THEME.text }}>{item.size}</span>
                                                </div>
                                                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{item.effect}</div>
                                                <div style={{ fontSize: 11, opacity: 0.65 }}>Upgrade: {item.upgrade}</div>
                                                {costText && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Kosten: {costText}</div>}
                                                {lockedByTutorial && (
                                                    <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>
                                                        Gesperrt bis Schritt erledigt: {lockLabel ?? tutorialStep?.description ?? "Tutorial"}
                                                    </div>
                                                )}
                                                <button
                                                    disabled={!selectable}
                                                    onClick={() => item.type && onSelect(item.type)}
                                                    style={{
                                                        marginTop: 8,
                                                        width: "100%",
                                                        padding: "8px 10px",
                                                        borderRadius: 10,
                                                        border: selectable ? `1px solid ${section.accent}` : `1px solid ${THEME.chipBorder}`,
                                                        background: selectable ? "linear-gradient(135deg, #ffd9a3, #ffb38a)" : THEME.chipBg,
                                                        cursor: selectable ? "pointer" : "not-allowed",
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {lockedByTutorial ? "Tutorial gesperrt" : locked ? "Gesperrt" : active ? "Aktiv" : "Bauen"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function VillagerMenu({
    open,
    st,
    onAssignHome,
    onAssignWork,
    onClose
}: {
    open: boolean;
    st: GameState;
    onAssignHome: (villagerId: string, buildingId: string | null) => void;
    onAssignWork: (villagerId: string, buildingId: string | null) => void;
    onClose: () => void;
}) {
    const [filter, setFilter] = useState<"all" | "homeless" | "jobless" | "hungry">("all");
    const [sort, setSort] = useState<"hunger" | "name" | "job">("hunger");

    const villagers = useMemo(() => Object.values(st.villagers).filter(v => v.state === "alive"), [st.villagers]);
    const buildings = useMemo(() => Object.values(st.buildings), [st.buildings]);

    const homeCandidates = buildings.filter(b => b.type === "campfire" || b.type === "townhall" || b.type === "storage");
    const workCandidates = buildings.filter(b => b.type !== "road" && b.type !== "rock" && b.type !== "tree" && b.type !== "berry_bush" && b.type !== "mushroom");
    const labelFor = (b: typeof buildings[number]) => BUILD_META[b.type]?.title ?? b.type;

    const stats = useMemo(() => {
        const hungry = villagers.filter(v => v.needs.hunger >= 0.55).length;
        const homeless = villagers.filter(v => !v.homeBuildingId).length;
        const jobless = villagers.filter(v => v.job === "idle").length;
        return { total: villagers.length, hungry, homeless, jobless };
    }, [villagers]);

    const filteredVillagers = useMemo(() => {
        switch (filter) {
            case "hungry":
                return villagers.filter(v => v.needs.hunger >= 0.55);
            case "homeless":
                return villagers.filter(v => !v.homeBuildingId);
            case "jobless":
                return villagers.filter(v => v.job === "idle");
            default:
                return villagers;
        }
    }, [villagers, filter]);

    const sortedVillagers = useMemo(() => {
        const copy = [...filteredVillagers];
        const byHunger = (a: typeof copy[number], b: typeof copy[number]) => b.needs.hunger - a.needs.hunger;
        const byName = (a: typeof copy[number], b: typeof copy[number]) => a.name.localeCompare(b.name);
        const byJob = (a: typeof copy[number], b: typeof copy[number]) => a.job.localeCompare(b.job) || a.name.localeCompare(b.name);
        if (sort === "name") return copy.sort(byName);
        if (sort === "job") return copy.sort(byJob);
        return copy.sort(byHunger);
    }, [filteredVillagers, sort]);

    const JOB_LABEL: Record<string, string> = {
        idle: "Ohne Job",
        gatherer: "Sammler",
        woodcutter: "Holzfaeller",
        builder: "Bauer",
        researcher: "Forscher",
        fisher: "Fischer",
        guard: "Wache"
    };

    const JOB_COLOR: Record<string, string> = {
        idle: "#9ca3af",
        gatherer: "#22c55e",
        woodcutter: "#c26d34",
        builder: "#f97316",
        researcher: "#6366f1",
        fisher: "#0ea5e9",
        guard: "#ef4444"
    };

    if (!open) return null;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                pointerEvents: "auto"
            }}
        >
            <div
                style={{
                    position: "relative",
                    maxHeight: "82vh",
                    width: "min(1080px, 94vw)",
                    overflow: "hidden",
                    background: THEME.panelBg,
                    borderRadius: 18,
                    border: `1px solid ${THEME.panelBorder}`,
                    boxShadow: "0 28px 60px rgba(0,0,0,0.25)",
                    backdropFilter: "blur(8px)",
                    pointerEvents: "auto",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${THEME.panelBorder}` }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Bewohner</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Uebersicht, Zuhause und Jobs</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                            aria-label="Sortierung"
                            value={sort}
                            onChange={e => setSort(e.target.value as typeof sort)}
                            style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${THEME.panelBorder}`, background: "#fff", fontWeight: 700, fontSize: 12 }}
                        >
                            <option value="hunger">Sortiere nach Hunger</option>
                            <option value="name">Sortiere nach Name</option>
                            <option value="job">Sortiere nach Job</option>
                        </select>
                        <button
                            onClick={onClose}
                            style={{
                                border: `1px solid ${THEME.chipBorder}`,
                                background: THEME.chipBg,
                                borderRadius: 10,
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontWeight: 700
                            }}
                        >
                            Schliessen
                        </button>
                    </div>
                </div>

                <div style={{ padding: 16, display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, minHeight: 0, flex: 1 }}>
                    <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                        <div
                            style={{
                                padding: 16,
                                borderRadius: 16,
                                border: `1px solid ${THEME.panelBorder}`,
                                background: "linear-gradient(150deg, #ffe5cf, #ffd3b7)",
                                boxShadow: THEME.panelShadow,
                                display: "grid",
                                gap: 10,
                                position: "relative"
                            }}
                        >
                            <div style={{ position: "absolute", left: 10, top: 10, bottom: 10, width: 4, borderRadius: 8, background: THEME.accent, opacity: 0.25 }} />
                            <div style={{ fontWeight: 800, fontSize: 14, paddingLeft: 12 }}>Dorfstatus</div>
                            <div style={{ display: "grid", gap: 8, paddingLeft: 12 }}>
                                <StatusChip label="Bewohner" value={String(stats.total)} />
                                <StatusChip label="Obdachlos" value={String(stats.homeless)} tone={stats.homeless ? "warn" : "muted"} />
                                <StatusChip label="Ohne Job" value={String(stats.jobless)} tone={stats.jobless ? "warn" : "muted"} />
                                <StatusChip label="Hungrig" value={String(stats.hungry)} tone={stats.hungry ? "warn" : "muted"} />
                            </div>
                        </div>

                        <div
                            style={{
                                padding: 14,
                                borderRadius: 14,
                                border: `1px solid ${THEME.panelBorder}`,
                                background: "rgba(255,255,255,0.94)",
                                display: "grid",
                                gap: 10,
                                boxShadow: THEME.panelShadow
                            }}
                        >
                            <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 20, background: THEME.accent }} />
                                Filter & Fokus
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <PillButton label="Alle" active={filter === "all"} onClick={() => setFilter("all")} />
                                <PillButton label="Hungrig" active={filter === "hungry"} onClick={() => setFilter("hungry")} />
                                <PillButton label="Obdachlos" active={filter === "homeless"} onClick={() => setFilter("homeless")} />
                                <PillButton label="Ohne Job" active={filter === "jobless"} onClick={() => setFilter("jobless")} />
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Wähle einen Fokus, um nur relevante Bewohner zu sehen.</div>
                        </div>

                        <div
                            style={{
                                padding: 12,
                                borderRadius: 12,
                                border: `1px solid ${THEME.panelBorder}`,
                                background: "rgba(0,0,0,0.03)",
                                display: "grid",
                                gap: 6,
                                boxShadow: THEME.panelShadow
                            }}
                        >
                            <div style={{ fontWeight: 800, fontSize: 12 }}>Legende</div>
                            <div style={{ fontSize: 11, display: "grid", gap: 4 }}>
                                <span>Hunger Warnung ab 55%</span>
                                <span>Krank Warnung ab 30%</span>
                                <span>Energie zeigt verbleibende Kraft (grün ist besser)</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, overflowY: "auto", paddingRight: 4 }}>
                        {sortedVillagers.map(v => {
                            const home = v.homeBuildingId ? st.buildings[v.homeBuildingId] : null;
                            const work = v.assignedBuildingId ? st.buildings[v.assignedBuildingId] : null;
                            const hungerPct = Math.round(v.needs.hunger * 100);
                            const energyPct = Math.round(v.needs.energy * 100);
                            const illnessPct = Math.round(v.needs.illness * 100);
                            return (
                                <div
                                    key={v.id}
                                    style={{
                                        border: `1px solid ${THEME.panelBorder}`,
                                        borderRadius: 12,
                                        padding: 12,
                                        background: "rgba(255,255,255,0.92)",
                                        boxShadow: THEME.panelShadow,
                                        display: "grid",
                                        gap: 10
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 12,
                                                    background: "linear-gradient(145deg, #ffe3c5, #ffd1b3)",
                                                    border: `1px solid ${THEME.chipBorder}`,
                                                    display: "grid",
                                                    placeItems: "center",
                                                    fontWeight: 800,
                                                    color: THEME.text
                                                }}
                                            >
                                                {v.name.slice(0, 1)}
                                            </div>
                                            <div style={{ display: "grid", gap: 2 }}>
                                                <div style={{ fontWeight: 800 }}>{v.name}</div>
                                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span style={{ fontSize: 12, opacity: 0.7 }}>#{v.id}</span>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "2px 6px",
                                                            borderRadius: 8,
                                                            border: `1px solid ${JOB_COLOR[v.job] ?? THEME.chipBorder}`,
                                                            background: `${JOB_COLOR[v.job] ?? THEME.chipBorder}15`,
                                                            color: THEME.text,
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {JOB_LABEL[v.job] ?? v.job}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <NeedMeter label="Hunger" value={hungerPct} tone={hungerPct >= 55 ? "warn" : "ok"} />
                                            <NeedMeter label="Energie" value={energyPct} tone="ok" inverted />
                                            <NeedMeter label="Krank" value={illnessPct} tone={illnessPct >= 30 ? "warn" : "ok"} />
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                                        <label style={{ display: "grid", gap: 6, fontSize: 12, background: "rgba(0,0,0,0.02)", borderRadius: 10, padding: 10, border: `1px solid ${THEME.panelBorder}` }}>
                                            <span style={{ opacity: 0.7 }}>Zuhause</span>
                                            <StyledSelect value={v.homeBuildingId ?? ""} onChange={value => onAssignHome(v.id, value || null)}>
                                                <option value="">Keins</option>
                                                {homeCandidates.map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {labelFor(b)} (#{b.id}) {b.residentIds?.length ? `- ${b.residentIds.length} drin` : ""}
                                                    </option>
                                                ))}
                                            </StyledSelect>
                                            <span style={{ fontSize: 11, opacity: 0.65 }}>Aktuell: {home ? labelFor(home) : "-"}</span>
                                        </label>

                                        <label style={{ display: "grid", gap: 6, fontSize: 12, background: "rgba(0,0,0,0.02)", borderRadius: 10, padding: 10, border: `1px solid ${THEME.panelBorder}` }}>
                                            <span style={{ opacity: 0.7 }}>Arbeitsstaette</span>
                                            <div style={{
                                                borderRadius: 10,
                                                border: `1px dashed ${THEME.panelBorder}`,
                                                padding: "10px 12px",
                                                background: "rgba(0,0,0,0.03)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 8
                                            }}>
                                                <span style={{ fontWeight: 700 }}>{work ? labelFor(work) : "Keine"}</span>
                                                <span style={{ fontSize: 11, opacity: 0.65 }}>Zuordnung am Gebaeude</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PillButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: active ? `1px solid ${THEME.accent}` : `1px solid ${THEME.chipBorder}`,
                background: active ? "linear-gradient(135deg, #ffd9a3, #ffb38a)" : THEME.chipBg,
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: active ? THEME.accentGlow : THEME.panelShadow,
                fontSize: 12
            }}
        >
            {label}
        </button>
    );
}

function StatusChip({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "warn" }) {
    const palette = tone === "warn" ? { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)" } : { bg: THEME.chipBg, border: THEME.chipBorder };
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${palette.border}`,
                background: palette.bg,
                fontWeight: 700,
                fontSize: 12
            }}
        >
            <span style={{ opacity: 0.7 }}>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function NeedMeter({ label, value, tone = "ok", inverted = false }: { label: string; value: number; tone?: "ok" | "warn"; inverted?: boolean }) {
    const clamped = Math.max(0, Math.min(100, value));
    const warn = tone === "warn";
    const goodColor = inverted ? "#22c55e" : "#f97316";
    const barColor = warn ? "#ef4444" : goodColor;
    return (
        <div style={{ display: "grid", gap: 4, minWidth: 70 }}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
            <div style={{ width: "100%", height: 8, borderRadius: 6, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${clamped}%`, height: "100%", background: barColor, transition: "width 0.2s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>{clamped}%</span>
        </div>
    );
}

function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "ok" | "warn" }) {
    const clamped = Math.max(0, Math.min(100, value));
    const color = tone === "ok" ? "#22c55e" : tone === "warn" ? "#ef4444" : THEME.accent;
    return (
        <div style={{ width: "100%", height: 10, borderRadius: 8, background: "rgba(0,0,0,0.08)", overflow: "hidden", boxShadow: THEME.panelShadow, margin: "6px 0" }}>
            <div style={{ width: `${clamped}%`, height: "100%", background: color, transition: "width 0.2s ease" }} />
        </div>
    );
}

function StyledSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
    return (
        <div style={{ position: "relative" }}>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "10px 38px 10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${THEME.panelBorder}`,
                    background: "linear-gradient(145deg, #ffffff, #fff7ef)",
                    fontWeight: 700,
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    boxShadow: THEME.panelShadow,
                    color: THEME.text
                }}
            >
                {children}
            </select>
            <div
                aria-hidden
                style={{
                    pointerEvents: "none",
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 12,
                    height: 12,
                    display: "grid",
                    placeItems: "center"
                }}
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={THEME.text} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5l3 3 3-3" />
                </svg>
            </div>
        </div>
    );
}

function WoodIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="6" width="14" height="8" rx="2" fill="#b0753b" stroke="#8c5a2e" strokeWidth="1.2" />
            <path d="M6 8.5h5" stroke="#d9b28c" strokeWidth="1" strokeLinecap="round" />
            <path d="M7 11h3.5" stroke="#d9b28c" strokeWidth="1" strokeLinecap="round" />
            <circle cx="13.5" cy="10" r="0.9" fill="#d9b28c" />
        </svg>
    );
}

function BerriesIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="8" r="3" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
            <circle cx="12" cy="11" r="3" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
            <circle cx="7" cy="12" r="2.4" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
            <path d="M10 7l3-3" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}

function FishIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M5 10c2.2-3 5.8-3.8 9-2.2l2-1.3v7L14 12.2C10.8 13.8 7.2 13 5 10Z"
                fill="#67e8f9"
                stroke="#0ea5e9"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
            <circle cx="12.5" cy="9.5" r="0.7" fill="#0f172a" />
        </svg>
    );
}

function StoneIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M5.5 6.5 11 4.5l3.8 2.5.7 5.2-2.7 2.5H7.2L4.5 12l1-4.6Z"
                fill="#d1d5db"
                stroke="#6b7280"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FibersIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7 15c0-5 1.5-7 3-10" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M10 15c0-5 1.2-7.5 2.8-10.5" stroke="#34d399" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M12.5 15c0-4.5-.5-7 1-10" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function MedicineIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="4.5" y="4.5" width="11" height="11" rx="2.5" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.1" />
            <path d="M10 7v6M7 10h6" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    );
}

function KnowledgeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M6 6h7c1.1 0 2 .9 2 2v7l-2-.8-2 .8-2-.8-2 .8V8c0-1.1.9-2 2-2Z"
                fill="#fcd34d"
                stroke="#b45309"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
            <path d="M8 8h5" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
            <path d="M8 10h3" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
}

function GoldIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="6" fill="#fbbf24" stroke="#c27803" strokeWidth="1.2" />
            <path d="M8 10.5c1.5.8 2.8.8 4 0M8 8.5c1.5-.8 2.8-.8 4 0" stroke="#92400e" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
    );
}

// FPS formatting now handled inline where displayed.
