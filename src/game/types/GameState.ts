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
    | "mountain"
    | "dirt"
    | "grass"
    | "forest"
    | "meadow"
    | "desert";

export type WorldTile = {
    id: WorldTileId;
};

export type World = {
    width: number;
    height: number;
    tiles: WorldTile[];
    waterLevel: number;
};

export type SpawnerState = {
    rocksNextDay: number;
    treesNextDay: number;
    berriesNextDay: number;
    mushroomsNextDay: number;
    dogsNextDay?: number;
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
    | "wheat"
    | "rope"
    | "mushrooms"
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
    | "woodcutter"
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
export type VillagerFacing = "left" | "right";

export type Villager = {
    id: Id;
    name: string;
    pos: Vec2;
    facing: VillagerFacing;
    lastFacingMs: number;
    gender: "male" | "female";
    job: VillagerJobId;
    assignedBuildingId: Id | null;
    homeBuildingId: Id | null;
    stats: VillagerStats;
    needs: VillagerNeeds;
    state: VillagerState;
};

/* =======================
   ANIMALS
======================= */

export type AnimalTypeId =
    | "dog";

export type AnimalState = "idle" | "wandering" | "following" | "dead";

export type Animal = {
    id: Id;
    type: AnimalTypeId;
    pos: Vec2;
    state: AnimalState;
};

/* =======================
   BUILDINGS
======================= */

export type BuildingTypeId =
    | "townhall"
    | "gather_hut"
    | "campfire"
    | "sleep_hut"
    | "storage"
    | "watchpost"
    | "sawmill"
    | "road"
    | "rock"
    | "tree"
    | "berry_bush"
    | "mushroom";

export type TaskKind = "build" | "produce" | "research" | "none";

export type TaskState = {
    kind: TaskKind;
    progress: number;
    duration: number;
    blocked: boolean;
    collectable: boolean;
    started: boolean;
    taskId?: string;
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
    /** Optional longer description shown in UI */
    description?: string;
    /** Short hint or tip to help the player */
    hint?: string;
    done: boolean;
    progress: number;
    goal: number;
    locked: boolean;
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
    animals: Record<Id, Animal>;

    quests: Record<QuestId, QuestState>;
    alerts: Record<AlertId, Alert>;
    events: GameEvent[];

    selection: Selection;
    placement: Placement;

    spawners: SpawnerState;

    flags: {
        paused: boolean;
        working: boolean;
        sleeping: boolean;
    };
};
