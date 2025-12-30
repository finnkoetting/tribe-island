"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";
import * as engine from "../../src/game/engine";
import { clearSavedGame, loadGameState, saveGameState } from "../../src/game/persistence/storage/local";
import { loadSeed, saveSeed } from "../../src/game/persistence/storage/seed";
import { loadCamera, saveCamera } from "../../src/game/persistence/storage/camera";
import { BUILDING_COSTS, formatCost, canAffordCost } from "../../src/game/domains/buildings/model/buildingCosts";
import { getLevelSpec } from "../../src/game/domains/buildings/model/buildingLevels";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import { getBuildingSize } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, QuestId, Vec2, ResourceId } from "../../src/game/types/GameState";
import WorldCanvas from "./WorldCanvas";
import { UI_THEME as THEME, BUILDING_COLORS } from "../../src/ui/theme";
import { ModalContainer } from "../../src/ui/components/ModalContainer";
import { AssignVillagerModal } from "../../src/ui/components/AssignVillagerModal";
import { MODAL_STYLE } from "../../src/ui/theme/modalStyleGuide";

const GLASS_BG = THEME.glassBg;
const GLASS_STRONG = THEME.glassStrong;
const CARD_BG = THEME.cardBg;
const MUTED_BG = THEME.mutedBg;
const GRADIENT_EDGE = THEME.gradientEdge;
const ACCENT_BUTTON = THEME.accentButton;
const SECONDARY_BUTTON = THEME.secondaryButton;
const PANEL_BORDER = `1px solid ${THEME.panelBorder}`;
const CHIP_BORDER = `1px solid ${THEME.chipBorder}`;
const CARD_MIN_HEIGHT = 210;

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
                effect: "Nahrung herstellen",
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
    { id: "gold", label: "Gold", Icon: GoldIcon, color: "#f59e0b" },
    { id: "emerald", label: "Smaragde", Icon: EmeraldIcon, color: "#10b981" }
];

// Helper: prettify resource id fallback
function prettifyResource(id: string) {
    if (id === "mushrooms") return "Pilze";
    if (id === "wheat") return "Weizen";
    if (id === "rope") return "Seile";
    return id.replace(/_/g, " ");
}

// Map resource -> producers (building types or world nodes)
const resourceProducers: Partial<Record<string, string[]>> = {
    wood: ["tree", "sawmill"],
    berries: ["berry_bush", "gather_hut"],
    mushrooms: ["mushroom", "gather_hut"],
    planks: ["sawmill"]
};

function producerTitle(type: string) {
    // Use BUILD_META if available
    if ((BUILD_META as any)[type]) return (BUILD_META as any)[type].title;
    if (type === "tree") return "Baum (kann gefällt werden)";
    if (type === "berry_bush") return "Beerenbusch (wild)";
    if (type === "mushroom") return "Pilzstelle (wild)";
    return type;
}

export default function GameClient() {
    const [seed, setSeed] = useState<number>(() => {
        if (typeof window === "undefined") return Date.now();
        return loadSeed() ?? Date.now();
    });
    const [st, setSt] = useState<GameState>(() => engine.create.createGame(seed));
    const [initialCamera, setInitialCamera] = useState(() => (typeof window === "undefined" ? null : loadCamera()));
    const cameraSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastSavedRef = useRef<number>(0);
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

    const [buildMode, setBuildMode] = useState<BuildingTypeId | null>(null);
    const [assignVillagerOpen, setAssignVillagerOpen] = useState(false);
    const [buildingModalOpen, setBuildingModalOpen] = useState(false);
    const [missingModalOpen, setMissingModalOpen] = useState(false);
    const [missingResources, setMissingResources] = useState<Record<string, { need: number; have: number }>>({});
    const [showProducers, setShowProducers] = useState<Record<string, boolean>>({});
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
            const cam = loadCamera();
            if (cam) setInitialCamera(cam);
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
            let next: GameState = { ...prev, selection: { kind: "tile", pos } };
            setBuildingModalOpen(false);

            if (building) {
                next = { ...next, selection: { kind: "building", id: building.id } };

                // Only open modal for real buildings, not resources.
                const nonModalTypes: BuildingTypeId[] = ["rock", "tree", "berry_bush", "mushroom", "road"];
                if (!nonModalTypes.includes(building.type)) {
                    setBuildingModalOpen(true);
                }
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

    // Keyboard: R to reset current seed.
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

    const handlePlanTutorialBuild = (type: BuildingTypeId) => {
        if (!BUILDABLE_TYPE_SET.has(type)) return;
        if (isTutorialBuildLocked(type, st.quests)) return;
        setBuildMode(type);
        // Build modal removed — keep buildMode set
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
                <TutorialPanel quests={st.quests} onSelectBuild={handlePlanTutorialBuild} />
                <TopRightResources st={st} />
                {/* Build menu removed */}
                <BuildingModal
                    open={buildingModalOpen && st.selection.kind === "building" && Boolean(st.buildings[st.selection.id])}
                    building={st.selection.kind === "building" ? st.buildings[st.selection.id] : null}
                    st={st}
                    onClose={() => setBuildingModalOpen(false)}
                    onCollect={handleCollect}
                    onAssignWork={handleAssignWork}
                    onOpenAssignVillager={() => setAssignVillagerOpen(true)}
                    onUpgrade={handleUpgrade}
                    onStartTask={(buildingId, taskId) => {
                        setSt(prev => {
                            const next = engine.commands.startBuildingTask(prev, buildingId, taskId);
                            queueSave(next);
                            return next;
                        });
                    }}
                    onShowMissing={(missing) => {
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
                                    const label = (RES_ORDER.find(r => r.id === res as any)?.label) ?? prettifyResource(res);
                                    const producers = resourceProducers[res as ResourceId] ?? [];
                                    const visible = !!showProducers[res];
                                    return (
                                        <div key={res} style={{ padding: 8, background: MODAL_STYLE.card.background, borderRadius: 8, border: MODAL_STYLE.card.border }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div style={{ fontWeight: 800 }}>{label}</div>
                                                <div style={{ opacity: 0.9 }}>{v.need} benötigt · vorhanden {v.have}</div>
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

                {/* AssignVillagerModal: separate modal for assigning/removing villagers */}
                <AssignVillagerModal
                    open={assignVillagerOpen}
                    onClose={() => setAssignVillagerOpen(false)}
                    villagers={Object.values(st.villagers).filter(v => v.state === "alive" && !(st.selection.kind === "building" && st.buildings[st.selection.id].assignedVillagerIds.includes(v.id)))}
                    assigned={(st.selection.kind === "building" && st.buildings[st.selection.id]) ? st.buildings[st.selection.id].assignedVillagerIds.map(id => st.villagers[id]).filter(Boolean).filter(v => v.state === "alive") : []}
                    onAssign={vid => handleAssignWork(vid, st.selection.kind === "building" ? st.selection.id : null)}
                    onRemove={vid => handleAssignWork(vid, null)}
                />
                {/* Villager menu removed */}
                <BottomHud
                    st={st}
                    setSt={setSt}
                    buildMode={buildMode}
                    onToggleBuildMenu={() => setBuildMode(null)}
                    /* villager menu removed */
                    onCancelBuild={() => setBuildMode(null)}
                    villagerCount={aliveVillagers.length}
                    onCloseBuildingModal={() => setBuildingModalOpen(false)}
                    fps={fps}
                />
            </div>
        </div>
    );
}

function TopLeftHud({ st }: { st: GameState }) {
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
                <Tag label="Phase" value={String(st.time.phase)} />
                <Tag
                    label="Uhrzeit"
                    value={formatGameClock(st.time)}
                />
                <Tag label="Tag" value={String(st.time.day)} />
            </div>
        </div>
    );
}

function formatGameClock(time: GameState["time"]) {
    const t = time as unknown as Record<string, unknown>;
    const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");

    const toClock = (minuteOfDay: number) => {
        // Normalize to [0, 1440)
        const clamped = ((Math.floor(minuteOfDay) % (24 * 60)) + 24 * 60) % (24 * 60);
        const hh = Math.floor(clamped / 60);
        const mm = clamped % 60;
        return `${pad2(hh)}:${pad2(mm)}`;
    };

    const asNumber = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

    const parseTimeOfDay = (v: number): string | null => {
        // Heuristics:
        // - 0..1 => fraction of day
        // - 0..24 => hours (fractional)
        // - 0..1440 => minutes since day start
        // - 0..86400 => seconds since day start
        // - 0..86400000 => milliseconds since day start
        // Otherwise: unknown

        const abs = Math.abs(v);

        // Fraction of day.
        if (abs <= 1) {
            const f = ((v % 1) + 1) % 1;
            return toClock(f * 24 * 60);
        }

        // Hours (commonly 0..24, sometimes fractional).
        if (abs <= 24) {
            const hours = ((v % 24) + 24) % 24;
            const minutes = Math.floor(hours * 60);
            return toClock(minutes);
        }

        // Minutes.
        if (abs <= 24 * 60) {
            return toClock(v);
        }

        // Seconds.
        if (abs <= 24 * 60 * 60) {
            return toClock(v / 60);
        }

        // Milliseconds.
        if (abs <= 24 * 60 * 60 * 1000) {
            return toClock(v / 1000 / 60);
        }

        return null;
    };

    // Common explicit fields.
    if (typeof t.hour === "number" && typeof t.minute === "number") {
        return `${pad2(t.hour)}:${pad2(t.minute)}`;
    }
    if (typeof t.hours === "number" && typeof t.minutes === "number") {
        return `${pad2(t.hours)}:${pad2(t.minutes)}`;
    }

    // Try common "minutes since start of day" variants.
    const minuteOfDayCandidates = [
        t.minuteOfDay,
        t.minutesOfDay,
        t.timeOfDayMinutes,
        t.dayMinutes,
        t.dayMinute
    ].filter(v => typeof v === "number") as number[];

    if (minuteOfDayCandidates.length > 0) {
        const m0 = minuteOfDayCandidates[0];
        return toClock(m0);
    }

    // Try common time-of-day fields with flexible units.
    const timeOfDayCandidates: Array<number> = [
        asNumber(t.timeOfDay),
        asNumber(t.dayProgress),
        asNumber(t.progress),
        asNumber(t.t),
        asNumber(t.elapsed),
        asNumber(t.elapsedMs),
        asNumber(t.timeMs),
        asNumber(t.clock),
        asNumber(t.clockMs)
    ].filter((v): v is number => typeof v === "number");

    for (const v of timeOfDayCandidates) {
        const parsed = parseTimeOfDay(v);
        if (parsed) return parsed;
    }

    // No known mapping found.
    return "—";
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
                    padding: "12px 14px",
                    background: `${CARD_BG}, ${GRADIENT_EDGE}`,
                    borderRadius: 14,
                    border: PANEL_BORDER,
                    boxShadow: THEME.panelShadow,
                    backdropFilter: "blur(14px)"
                }}
            >
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={onSave}
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
                        Speichern
                    </button>
                    <button
                        onClick={onReset}
                        style={{
                            padding: "9px 14px",
                            borderRadius: 12,
                            border: PANEL_BORDER,
                            background: SECONDARY_BUTTON,
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
                            padding: "9px 14px",
                            borderRadius: 12,
                            border: PANEL_BORDER,
                            background: "linear-gradient(135deg, #5ee7ff, #7cf3ff)",
                            cursor: "pointer",
                            fontWeight: 800,
                            color: THEME.text,
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

function TopRightResources({ st }: { st: GameState }) {
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
    onAssignWork,
    onOpenAssignVillager,
    onUpgrade,
    onStartTask,
    onShowMissing
}: {
    open: boolean;
    building: GameState["buildings"][string] | null;
    st: GameState;
    onClose: () => void;
    onCollect: (id: string) => void;
    onAssignWork: (villagerId: string, buildingId: string | null) => void;
    onOpenAssignVillager: () => void;
    onUpgrade: (id: string) => void;
    onStartTask: (buildingId: string, taskId: string) => void;
    onShowMissing: (missing: Record<ResourceId, { need: number; have: number }>) => void;
}) {
    if (!open || !building) return null;

    const meta = BUILD_META[building.type];
    // Tasks depend on building type
    const level = building.level || 1;
    let tasks: Array<{ id: string; label: string; desc: string; duration: number }> = [];

    if (building.type === "gather_hut") {
        // Show tasks reflecting the design you provided
        const baseTasks = [
            { id: "pick_mushrooms", label: "Pilze pflücken", desc: "+1 Pilz", duration: 60 * 5 },
            { id: "pick_berries", label: "Beeren sammeln", desc: "+2 Beeren", duration: 60 * 10 },
            { id: "fruit_salad", label: "Fruchtsalat zubereiten", desc: "+4 Nahrung; -2 Beeren; -1 Pilz", duration: 60 * 30 },
            { id: "vorratskorb", label: "Vorratskorb packen", desc: "+6 Nahrung; -3 Beeren; -2 Pilz", duration: 120 * 60 }
        ];
        const maxTasks = Math.min(baseTasks.length, level + 1); // unlock more tasks with level
        tasks = baseTasks.slice(0, maxTasks);
    } else if (building.type === "townhall") {
        tasks = [{ id: "research", label: "Dorfauftrag: Grund-Jobzuweisung", desc: "Jobs & Aufträge freischalten", duration: 120 }];
    } else if (building.type === "sawmill") {
        tasks = [{ id: "produce", label: "Holz verarbeiten", desc: "+Bretter", duration: 90 }];
    } else if (building.type === "campfire") {
        tasks = [{ id: "day_watch", label: "Tageswache", desc: "-2 Nahrung; +1 Moral (alle)", duration: 60 }];
    } else {
        tasks = [];
    }

    // Task-State: null = kein Auftrag aktiv
    const [activeTask, setActiveTask] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);

    // Nach Einsammeln: Auftrag muss neu gewählt werden
    const handleCollect = (id: string) => {
        onCollect(id);
        setActiveTask(null);
        setSelectedTask(null);
    };

    // Auftrag starten
    const handleStartTask = () => {
        if (!selectedTask || !building) return;
        const taskId = selectedTask;
        onStartTask(building.id, taskId);
        setActiveTask(selectedTask);
        setSelectedTask(null);
    };

    const villagers = Object.values(st.villagers).filter(v => v.state === "alive");
    const assigned = building.assignedVillagerIds
        .map(id => st.villagers[id])
        .filter(Boolean)
        .filter(v => v.state === "alive");
    const available = villagers.filter(v => !building.assignedVillagerIds.includes(v.id));

    // Upgrade-Logik: compute next level spec and cost
    const nextSpec = getLevelSpec(building.type, (building.level || 1) + 1);
    const canUpgrade = Boolean(nextSpec);
    const upgradeCost = nextSpec ? formatCost(nextSpec.cost ?? {}) : "Keine weiteren Upgrades";
    const canPay = Boolean(nextSpec) ? canAffordCost(st.inventory, nextSpec!.cost ?? {}) : false;

    return (
        <ModalContainer
            onClose={onClose}
            title={
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {meta?.title ?? building.type}
                    <Badge label={`Lvl ${building.level}`} tone="muted" />
                </span>
            }
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

            {/* Auftragsauswahl */}
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

            {/* Start-Button für Auftrag */}
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

            {/* Bewohner-Zuweisung: jetzt im separaten Modal (öffnet per Button) */}

            {/* Upgrade-Bereich */}
            {canUpgrade && (
                <div style={{ marginTop: 18, textAlign: "center" }}>
                    <button
                        style={{ ...MODAL_STYLE.button, fontSize: 16, minWidth: 180, opacity: canPay ? 1 : 0.9, cursor: "pointer" }}
                        onClick={() => {
                            if (!building) return;
                            if (canPay) return onUpgrade(building.id);
                            // compute missing
                            const cost = nextSpec?.cost ?? {};
                            const missing: Record<string, { need: number; have: number }> = {};
                            for (const [r, amt] of Object.entries(cost)) {
                                const have = (st.inventory as any)[r] ?? 0;
                                if ((amt ?? 0) > have) missing[r] = { need: (amt ?? 0) - have, have };
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

function Badge({ label, tone = "muted" }: { label: string; tone?: "muted" | "ok" | "warn" | "accent" }) {
    const palette = {
        muted: { bg: GLASS_BG, border: THEME.panelBorder, color: THEME.text },
        ok: { bg: "rgba(110,231,183,0.18)", border: "rgba(110,231,183,0.6)", color: THEME.text },
        warn: { bg: "rgba(255,99,132,0.2)", border: "rgba(255,99,132,0.6)", color: THEME.text },
        accent: { bg: "rgba(124,243,255,0.2)", border: THEME.panelBorder, color: THEME.text }
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
    // Neues, kontrastreicheres Design für bessere Lesbarkeit im Modal
    const palette = tone === "ok"
        ? { border: "#3e5c2c", bg: "linear-gradient(90deg, #232a1c 60%, #2e3c24 100%)", color: "#eaffd0" }
        : { border: "#7c5c2c", bg: "linear-gradient(90deg, #2e241c 60%, #3c2e24 100%)", color: "#ffe7b0" };

    return (
        <div
            style={{
                border: `2px solid ${palette.border}`,
                borderRadius: 12,
                padding: 14,
                background: palette.bg,
                color: palette.color,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                fontSize: 15,
                boxShadow: "0 2px 12px #0003"
            }}
        >
            <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 12,
                                background: palette.bg,
                                border: `2px solid ${palette.border}`,
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 900,
                                color: palette.color,
                                fontSize: 18
                            }}
                        >
                            {v.name.slice(0, 1)}
                        </span>
                    <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 900, fontSize: 17 }}>{v.name}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9, fontSize: 13 }}>
                            <span>#{v.id}</span>
                            <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 7, border: `1.5px solid ${palette.border}` }}>{v.job}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: 0.95, fontSize: 13, marginTop: 2 }}>
                    <span>🍗 Hunger {hunger}%</span>
                    <span>💤 Energie {energy}%</span>
                </div>
            </div>
            <button
                onClick={onAction}
                style={{
                    border: `2px solid ${palette.border}`,
                    background: tone === "ok" ? "linear-gradient(135deg, #b6ffb6, #7ed957)" : "linear-gradient(135deg, #ffe7b0, #e2c17c)",
                    borderRadius: 10,
                    padding: "12px 18px",
                    cursor: "pointer",
                    fontWeight: 900,
                    minWidth: 120,
                    height: 48,
                    color: "#232a1c",
                    fontSize: 15,
                    boxShadow: "0 2px 8px #0002"
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
    onToggleBuildMenu: () => void;
    villagerMenuOpen?: boolean;
    onToggleVillagerMenu?: () => void;
    onCancelBuild: () => void;
    villagerCount: number;
    onCloseBuildingModal: () => void;
    fps: number;
}) {
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
                justifyContent: "center",
                pointerEvents: "none",
                gap: 12,
                background: THEME.overlayGradient
            }}
        >
                <div style={{ display: "flex", gap: 20, pointerEvents: "auto", alignItems: "center", justifyContent: "center", marginBottom: "15px" }}>
                <VillagerButton active={!!villagerMenuOpen} onClick={() => onToggleVillagerMenu?.()} />
                <LargeBuildButton active={!!buildMode} onClick={() => { onCloseBuildingModal(); onToggleBuildMenu(); }} />
                <InventoryButton active={false} onClick={() => { /* inventory toggle not implemented */ }} />
            </div>
        </div>
    );
}

function VillagerButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `1px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(135deg, rgba(245,165,36,0.12), rgba(245,165,36,0.06))";
    const activeShadow = "0 6px 18px rgba(245,165,36,0.12)";
    return (
        <button
            onClick={() => onClick?.()}
            aria-label="Bewohner"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                border: active ? activeBorder : `1px solid ${THEME.chipBorder}`,
                background: active ? activeBg : GLASS_STRONG,
                cursor: "pointer",
                boxShadow: active ? activeShadow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hover ? "translateY(-4px) scale(1.03)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
            </svg>
        </button>
    );
}

// Speed control UI removed; time/speed is controlled by game systems only

function Tag({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "warn" }) {
    const palette =
        tone === "warn"
            ? { bg: "rgba(255,99,132,0.16)", border: "rgba(255,99,132,0.55)" }
            : { bg: "rgba(255, 255, 255, 0.04)", border: THEME.panelBorder };
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
                boxShadow: THEME.panelShadow,
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
                width: 68,
                height: 68,
                borderRadius: 16,
                border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.chipBorder}`,
                background: active ? ACCENT_BUTTON : GLASS_STRONG,
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


function InventoryButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `1px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(135deg, rgba(245,165,36,0.12), rgba(245,165,36,0.06))";
    const activeShadow = "0 6px 18px rgba(245,165,36,0.18)";
    return (
        <button
            onClick={onClick}
            aria-label="Inventar"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                border: active ? activeBorder : `1px solid ${THEME.chipBorder}`,
                background: active ? activeBg : GLASS_STRONG,
                cursor: "pointer",
                boxShadow: active ? activeShadow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hover ? "translateY(-4px) scale(1.03)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                <path d="M16 3v4" />
            </svg>
        </button>
    );
}

function LargeBuildButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    const [hover, setHover] = useState(false);
    const activeBorder = `1px solid ${THEME.accent}`;
    const activeBg = "linear-gradient(135deg, rgba(245,165,36,0.12), rgba(245,165,36,0.06))";
    const activeShadow = "0 10px 30px rgba(245,165,36,0.18)";
    return (
        <button
            onClick={onClick}
            aria-label="Build menu"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 104,
                height: 104,
                borderRadius: 20,
                border: active ? activeBorder : `1px solid ${THEME.chipBorder}`,
                background: active ? activeBg : GLASS_STRONG,
                cursor: "pointer",
                boxShadow: active ? activeShadow : THEME.panelShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hover ? "translateY(-6px) scale(1.04)" : "none",
                transition: "transform .12s ease, box-shadow .12s ease, background .12s ease"
            }}
        >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={THEME.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20 14 10" />
                <path d="M13 6 17 2l3 3-4 4" />
                <path d="m3 21 3-1 1-3-3 1-1 3Z" />
            </svg>
        </button>
    );
}

// Build menu removed

// VillagerMenu removed

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

function EmeraldIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <polygon points="10,4 15,8 12.5,15 7.5,15 5,8" fill="#10b981" stroke="#065f46" strokeWidth="0.9" />
            <path d="M10 6.5 L13 8.5" stroke="#064e3b" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
    );
}

// FPS formatting now handled inline where displayed.
