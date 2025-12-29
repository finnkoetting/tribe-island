/* =======================
   BASIS
======================= */

export type Id = string;

export type Vec2 = {
    x: number;
    y: number;
};

export type GamePhase = "morning" | "day" | "evening" | "night";

export type GameSpeed = 0 | 1 | 2;

/* =======================
   ZEIT
======================= */

export type GameTime = {
    day: number;
    phase: GamePhase;
    phaseIndex: 0 | 1 | 2 | 3;
    phaseElapsedMs: number;
    msPerDay: number;
};

/* =======================
   WELT
======================= */

export type WorldTileId =
    | "water"
    | "sand"
    | "rock"
    | "dirt"
    | "grass"
    | "forest"
    | "meadow"
    | "desert"
    | "swamp";

export type WorldTile = {
    id: WorldTileId;
};

export type World = {
    width: number;
    height: number;
    tiles: WorldTile[];
    waterLevel: number;
};

/* =======================
   RESSOURCEN / ECONOMY
======================= */

export type ResourceId =
    | "wood"
    | "berries"
    | "stone"
    | "fish"
    | "fibers"
    | "planks"
    | "medicine"
    | "knowledge"
    | "gold";

export type Inventory = Record<ResourceId, number>;

/* =======================
   VILLAGER
======================= */

export type VillagerJobId =
    | "idle"
    | "gatherer"
    | "builder"
    | "researcher"
    | "fisher"
    | "guard";

export type VillagerStats = {
    work: number;
    int: number;
    str: number;
    morale: number;
};

export type VillagerNeeds = {
    hunger: number;
    energy: number;
    illness: number;
};

export type VillagerState = "alive" | "dead";

export type Villager = {
    id: Id;
    name: string;
    pos: Vec2;
    job: VillagerJobId;
    assignedBuildingId: Id | null;
    homeBuildingId: Id | null;
    stats: VillagerStats;
    needs: VillagerNeeds;
    state: VillagerState;
};

/* =======================
   BUILDINGS
======================= */

export type BuildingTypeId =
    | "townhall"
    | "gather_hut"
    | "campfire"
    | "storage"
    | "watchpost"
    | "road";

export type TaskKind = "build" | "produce" | "research" | "none";

export type TaskState = {
    kind: TaskKind;
    progress: number;
    duration: number;
    blocked: boolean;
    collectable: boolean;
};

export type Building = {
    id: Id;
    type: BuildingTypeId;
    pos: Vec2;
    level: number;
    assignedVillagerIds: Id[];
    residentIds?: Id[];
    task: TaskState;
    output?: {
        resource: ResourceId;
        amount: number;
    } | null;
};

/* =======================
   EVENTS & ALERTS
======================= */

export type AlertId = "hunger" | "illness" | "attack";

export type Alert = {
    id: AlertId;
    severity: 0 | 1 | 2;
};

export type EventId =
    | "day_started"
    | "phase_changed"
    | "resource_added"
    | "resource_spent"
    | "building_placed"
    | "task_finished"
    | "villager_died"
    | "trade_caravan"
    | "attack_wave"
    | "illness_outbreak"
    | "job_assigned"
    | "home_assigned";

export type GameEvent<T = Record<string, unknown>> = {
    id: EventId;
    atMs: number;
    payload: T;
};

/* =======================
   QUESTS
======================= */

export type QuestId =
    | "tutorial_home"
    | "tutorial_food"
    | "tutorial_research"
    | "survive_first_crisis";

export type QuestState = {
    id: QuestId;
    title: string;
    done: boolean;
    progress: number;
    goal: number;
};

/* =======================
   UI / INPUT
======================= */

export type Selection =
    | { kind: "none" }
    | { kind: "tile"; pos: Vec2 }
    | { kind: "building"; id: Id }
    | { kind: "villager"; id: Id };

export type Placement = {
    active: boolean;
    buildingType: BuildingTypeId | null;
    ghostPos: Vec2 | null;
};

/* =======================
   GAME STATE (HERZ)
======================= */

export type GameState = {
    version: number;
    seed: number;
    nowMs: number;
    speed: GameSpeed;

    time: GameTime;
    world: World;

    inventory: Inventory;
    buildings: Record<Id, Building>;
    villagers: Record<Id, Villager>;

    quests: Record<QuestId, QuestState>;
    alerts: Record<AlertId, Alert>;
    events: GameEvent[];

    selection: Selection;
    placement: Placement;

    flags: {
        paused: boolean;
        working: boolean;
        sleeping: boolean;
    };
};
