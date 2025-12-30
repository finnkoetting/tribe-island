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
import { ModalContainer } from "../../src/ui/components/ModalContainer";
import { AssignVillagerModal } from "../../src/ui/components/AssignVillagerModal";
import { MODAL_STYLE } from "../../src/ui/theme/modalStyleGuide";

const GLASS_BG = "rgba(12, 16, 26, 0.78)";
const GLASS_STRONG = "rgba(8, 12, 20, 0.9)";
const CARD_BG = "linear-gradient(145deg, rgba(22, 32, 52, 0.96), rgba(12, 18, 32, 0.94))";
const MUTED_BG = "rgba(255, 255, 255, 0.03)";
const GRADIENT_EDGE = "linear-gradient(135deg, rgba(124,243,255,0.12), rgba(86,122,255,0.18))";
const ACCENT_BUTTON = "linear-gradient(135deg, #7cf3ff, #4de0e6)";
const SECONDARY_BUTTON = "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))";
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
    const [initialCamera, setInitialCamera] = useState(() => (typeof window === "undefined" ? null : loadCamera()));
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
                <TopLeftHud st={st} />
                <TutorialPanel quests={st.quests} onSelectBuild={handlePlanTutorialBuild} />
                <TopRightResources st={st} />
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
                    onOpenAssignVillager={() => setVillagerMenuOpen(true)}
                />

                {/* AssignVillagerModal: separate modal for assigning/removing villagers */}
                <AssignVillagerModal
                    open={villagerMenuOpen}
                    onClose={() => setVillagerMenuOpen(false)}
                    villagers={Object.values(st.villagers).filter(v => v.state === "alive" && !(st.selection.kind === "building" && st.buildings[st.selection.id].assignedVillagerIds.includes(v.id)))}
                    assigned={(st.selection.kind === "building" && st.buildings[st.selection.id]) ? st.buildings[st.selection.id].assignedVillagerIds.map(id => st.villagers[id]).filter(Boolean).filter(v => v.state === "alive") : []}
                    onAssign={vid => handleAssignWork(vid, st.selection.kind === "building" ? st.selection.id : null)}
                    onRemove={vid => handleAssignWork(vid, null)}
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
                top: 110,
                left: 18,
                padding: "12px 14px",
                maxWidth: "320px",
                background: `${GLASS_BG}, ${GRADIENT_EDGE}`,
                border: PANEL_BORDER,
                borderRadius: 14,
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
                background: GLASS_BG,
                borderRadius: 14,
                border: PANEL_BORDER,
                boxShadow: THEME.panelShadow,
                backdropFilter: "blur(12px)"
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
                        background: "linear-gradient(135deg, rgba(124,243,255,0.08), rgba(86,122,255,0.08))",
                        borderRadius: 10,
                        border: PANEL_BORDER,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px rgba(0,0,0,0.28)",
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
                            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06) 0%, ${res.color}33 70%, transparent 100%)`,
                            border: PANEL_BORDER,
                            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.16)",
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
    onAssignWork,
    onOpenAssignVillager
}: {
    open: boolean;
    building: GameState["buildings"][string] | null;
    st: GameState;
    onClose: () => void;
    onCollect: (id: string) => void;
    onAssignWork: (villagerId: string, buildingId: string | null) => void;
    onOpenAssignVillager: () => void;
}) {
    if (!open || !building) return null;

    const meta = BUILD_META[building.type];
    // Levelbasierte Aufgaben, immer gerade Anzahl
    const level = building.level || 1;
    const baseTasks = [
        { id: "short", label: "Schnelle Runde", desc: "Kleine Sammelrunde", duration: 30, required: 1 },
        { id: "medium", label: "Gruppenrunde", desc: "Koordinierte Sammlertour", duration: 60, required: 2 },
        { id: "long", label: "Ausdauernde Runde", desc: "Lange Sammelrunde mit besserer Ausbeute", duration: 120, required: 2 },
        { id: "epic", label: "Expedition", desc: "Große Expedition für viele Ressourcen", duration: 240, required: 4 }
    ];
    const numTasks = Math.max(2, Math.min(baseTasks.length, level * 2));
    const tasks = baseTasks.slice(0, numTasks);

    // Task-State: null = kein Auftrag aktiv
    const [activeTask, setActiveTask] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);

    // Nach Einsammeln: Auftrag muss neu gewählt werden
    const handleCollect = (id: string) => {
        onCollect(id);
        setActiveTask(null);
        setSelectedTask(null);
    };

    // Auftrag starten (prüft benötigte Bewohner)
    const handleStartTask = () => {
        if (!selectedTask) return;
        const t = tasks.find(x => x.id === selectedTask);
        const need = t?.required ?? 0;
        if (assigned.length < need) {
            alert(`Benötigt ${need} zugewiesene Bewohner. (${assigned.length} zugewiesen)`);
            return;
        }
        setActiveTask(selectedTask);
    };

    const villagers = Object.values(st.villagers).filter(v => v.state === "alive");
    const assigned = building.assignedVillagerIds
        .map(id => st.villagers[id])
        .filter(Boolean)
        .filter(v => v.state === "alive");
    const available = villagers.filter(v => !building.assignedVillagerIds.includes(v.id));

    // Upgrade-Logik (Platzhalter)
    const canUpgrade = true;
    const upgradeCost = "10 Holz, 5 Stein";

    const requiredForSelected = selectedTask ? (tasks.find(t => t.id === selectedTask)?.required ?? 0) : 0;

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
                    title="Bewohner zuweisen"
                    style={{
                        fontSize: 20,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "6px 8px"
                    }}
                    onClick={onOpenAssignVillager}
                >
                    <span role="img" aria-label="Villager">🧑‍🌾</span>
                </button>
            }
        >

            {/* Auftragsauswahl */}
            <div style={{ display: "flex", gap: 12, margin: "0 0 10px 0" }}>
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
                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>Benötigt: {task.required ?? 0} Bewohner</div>
                    </button>
                ))}
            </div>

            {/* Start-Button für Auftrag */}
            {!activeTask && selectedTask && (
                <div style={{ margin: "0 0 18px 0", textAlign: "center" }}>
                    <button
                        disabled={assigned.length < requiredForSelected}
                        style={{
                            ...MODAL_STYLE.button,
                            fontSize: 15,
                            minWidth: 160,
                            opacity: assigned.length < requiredForSelected ? 0.5 : 1,
                            cursor: assigned.length < requiredForSelected ? "not-allowed" : "pointer"
                        }}
                        onClick={handleStartTask}
                    >
                        Auftrag starten
                    </button>
                    {assigned.length < requiredForSelected && (
                        <div style={{ fontSize: 12, color: "#ffb4a2", marginTop: 8 }}>Benötigt {requiredForSelected} zugewiesene Bewohner, aktuell {assigned.length}.</div>
                    )}
                </div>
            )}

            {/* Bewohner-Zuweisung: jetzt im separaten Modal (öffnet per Button) */}

            {/* Upgrade-Bereich */}
            {canUpgrade && (
                <div style={{ marginTop: 18, textAlign: "center" }}>
                    <button
                        style={{ ...MODAL_STYLE.button, fontSize: 16, minWidth: 180 }}
                        onClick={() => alert("Upgrade kommt bald!")}
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
                        padding: "10px 14px",
                        borderRadius: 14,
                        border: PANEL_BORDER,
                        background: GLASS_BG,
                        boxShadow: THEME.panelShadow
                    }}
                >
                    {buildMode ? `Bauen: ${BUILD_META[buildMode]?.title ?? buildMode}` : "Kein Bau aktiv"}
                </div>
                {buildMode && (
                    <button
                        onClick={onCancelBuild}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: PANEL_BORDER,
                            background: ACCENT_BUTTON,
                            cursor: "pointer",
                            fontWeight: 700,
                            color: THEME.text,
                            boxShadow: THEME.accentGlow,
                            height: 44,
                            minWidth: 120
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
                width: 48,
                height: 48,
                borderRadius: 14,
                border: active ? PANEL_BORDER : CHIP_BORDER,
                background: active ? ACCENT_BUTTON : GLASS_BG,
                color: THEME.text,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: active ? THEME.accentGlow : THEME.panelShadow,
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
                width: 56,
                height: 56,
                borderRadius: 14,
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

function VillagerButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label="Bewohner menu"
            style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.chipBorder}`,
                background: active ? ACCENT_BUTTON : GLASS_STRONG,
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
                            <div key={section.id} style={{ border: `1px solid ${section.accent}33`, borderRadius: 14, padding: 12, background: GLASS_BG, boxShadow: THEME.panelShadow }}>
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
                                                    padding: 12,
                                                    background: locked ? MUTED_BG : GLASS_STRONG,
                                                    opacity: locked ? 0.65 : 1,
                                                    position: "relative",
                                                    boxShadow: active ? THEME.accentGlow : THEME.panelShadow,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 6,
                                                    minHeight: CARD_MIN_HEIGHT
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                    <div style={{ fontWeight: 800 }}>{item.title}</div>
                                                    <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 8, border: `1px solid ${section.accent}55`, color: THEME.text }}>{item.size}</span>
                                                </div>
                                                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{item.effect}</div>
                                                <div style={{ fontSize: 11, opacity: 0.65 }}>Upgrade: {item.upgrade}</div>
                                                {costText && <div style={{ fontSize: 11, opacity: 0.8 }}>Kosten: {costText}</div>}
                                                {lockedByTutorial && (
                                                    <div style={{ fontSize: 11, color: "#b91c1c" }}>
                                                        Gesperrt bis Schritt erledigt: {lockLabel ?? tutorialStep?.description ?? "Tutorial"}
                                                    </div>
                                                )}
                                                <button
                                                    disabled={!selectable}
                                                    onClick={() => item.type && onSelect(item.type)}
                                                    style={{
                                                        marginTop: "auto",
                                                        width: "100%",
                                                        height: 44,
                                                        padding: "10px 12px",
                                                        borderRadius: 10,
                                                        border: selectable ? `1px solid ${section.accent}` : CHIP_BORDER,
                                                        background: selectable ? ACCENT_BUTTON : SECONDARY_BUTTON,
                                                        cursor: selectable ? "pointer" : "not-allowed",
                                                        fontWeight: 700,
                                                        color: THEME.text,
                                                        boxShadow: selectable ? THEME.accentGlow : THEME.panelShadow
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
                                border: PANEL_BORDER,
                                background: `${CARD_BG}, ${GRADIENT_EDGE}`,
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
                                border: PANEL_BORDER,
                                background: GLASS_BG,
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
                                border: PANEL_BORDER,
                                background: GLASS_STRONG,
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
                                        border: PANEL_BORDER,
                                        borderRadius: 12,
                                        padding: 12,
                                        background: GLASS_BG,
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
